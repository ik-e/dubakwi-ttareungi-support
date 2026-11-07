\set ON_ERROR_STOP on

BEGIN;

DO $$
DECLARE
    result jsonb;
    state_ref jsonb;
    case_id_value text;
    dlq_id_value text;
    state_revision bigint;
    dlq_revision bigint;
    input_hash_value text := repeat('d', 64);
    claim_payload jsonb;
    resume_payload jsonb;
    release_payload jsonb;
    complete_payload jsonb;
    effects_value jsonb;
BEGIN
    result := dubakwi_service.state_apply(jsonb_build_object(
        'op', 'begin', 'scope', 'verify-recovery-unknown',
        'execution_id', 'exec-unknown-original', 'input_hash', input_hash_value,
        'actor', jsonb_build_object('id', 'owner-unknown'),
        'request', jsonb_build_object(
            'request_id', 'tc07-unknown-01', 'question', 'synthetic unknown effect', 'attempt', 1
        )
    ));
    IF result ->> 'mode' <> 'proceed' THEN RAISE EXCEPTION 'begin failed: %', result; END IF;
    case_id_value := result #>> '{support,case_id}';
    state_ref := result -> 'state_ref';
    result := dubakwi_service.state_apply(jsonb_build_object(
        'op', 'prepare', 'state_ref', state_ref,
        'args', jsonb_build_object('current_step', 'close')
    ));
    state_ref := result -> 'state_ref';
    result := dubakwi_service.state_apply(jsonb_build_object(
        'op', 'bind', 'state_ref', state_ref,
        'args', jsonb_build_object(
            'jira_issue_id', '10031', 'jira_issue_key', 'JBYS-31',
            'case_id', case_id_value, 'first_request_id', 'tc07-unknown-01',
            'next_step', 'H08'
        )
    ));
    state_ref := result -> 'state_ref';
    result := dubakwi_service.state_apply(jsonb_build_object(
        'op', 'fail', 'state_ref', state_ref,
        'args', jsonb_build_object('status','unknown','current_step','close','error_code','ticket_unknown')
    ));
    IF result ->> 'ok' <> 'true' THEN RAISE EXCEPTION 'unknown failure setup failed: %', result; END IF;

    effects_value := jsonb_build_object(
        'created_or_reused', jsonb_build_object('status','confirmed','id','JBYS-31'),
        'context_saved', jsonb_build_object('status','confirmed','id','JBYS-31'),
        'closed', jsonb_build_object('status','unknown','id','JBYS-31','error_code','timeout'),
        'assigned', jsonb_build_object('status','none'),
        'alert', jsonb_build_object('status','none')
    );
    result := dubakwi_service.dlq_apply(jsonb_build_object(
        'op','put','scope','verify-recovery-unknown','request_id','tc07-unknown-01',
        'case_id',case_id_value,'jira_issue_id','10031','jira_issue_key','JBYS-31',
        'failed_step','close','error_code','ticket_unknown','summary','synthetic close timeout',
        'attempts',0,'effects',effects_value,
        'recovery',jsonb_build_object(
            'version',1,'mode','payload','action','close',
            'args',jsonb_build_object('close_status','closed_guidance','answer','synthetic masked answer'),
            'reference',NULL,'reason','synthetic timeout'
        ),
        'last_execution_id','exec-unknown-original'
    ));
    dlq_id_value := result ->> 'dlq_id';
    SELECT revision INTO STRICT dlq_revision FROM dubakwi_service.dead_letters
    WHERE scope='verify-recovery-unknown' AND dlq_id=dlq_id_value;
    SELECT revision INTO STRICT state_revision FROM dubakwi_service.request_state
    WHERE scope='verify-recovery-unknown' AND request_id='tc07-unknown-01';

    claim_payload := jsonb_build_object(
        'op','claim','scope','verify-recovery-unknown','dlq_id',dlq_id_value,
        'operator_id','operator-contract-test','owner_id','owner-unknown',
        'input_hash',input_hash_value,'expected_dlq_revision',dlq_revision,
        'expected_state_revision',state_revision,
        'original_execution_id','exec-unknown-original',
        'recovery_execution_id','exec-unknown-recovery-01',
        'verification','recovery_conditions_confirmed'
    );
    result := dubakwi_service.recovery_claim(claim_payload);
    IF result ->> 'ok' <> 'false' OR result ->> 'error_code' <> 'recovery_effect_not_confirmed_failed'
       OR (SELECT replay_status FROM dubakwi_service.dead_letters
           WHERE scope='verify-recovery-unknown' AND dlq_id=dlq_id_value) <> 'pending'
       OR (SELECT effects #>> '{closed,status}' FROM dubakwi_service.dead_letters
           WHERE scope='verify-recovery-unknown' AND dlq_id=dlq_id_value) <> 'unknown' THEN
        RAISE EXCEPTION 'unknown target without effect check was not safely denied: %', result;
    END IF;

    claim_payload := jsonb_set(claim_payload, '{verification}', to_jsonb('recovery_unknown_effect_checked_absent'::text));
    result := dubakwi_service.recovery_claim(claim_payload);
    IF result ->> 'ok' <> 'true' OR result ->> 'action_required' <> 'true'
       OR result #>> '{effects,closed,status}' <> 'failed'
       OR result #>> '{operator_reconciliation,decision}' <> 'not_applied' THEN
        RAISE EXCEPTION 'verified absent effect was not claimed for retry: %', result;
    END IF;
    resume_payload := jsonb_build_object(
        'op','resume','scope','verify-recovery-unknown','dlq_id',dlq_id_value,
        'owner_id','owner-unknown','input_hash',input_hash_value,
        'expected_dlq_revision',dlq_revision+1,'expected_state_revision',state_revision,
        'original_execution_id','exec-unknown-original',
        'recovery_execution_id','exec-unknown-recovery-01',
        'verification','recovery_conditions_confirmed'
    );
    result := dubakwi_service.recovery_resume(resume_payload);
    IF result ->> 'ok' <> 'true' OR result ->> 'action_required' <> 'true'
       OR result #>> '{state_ref,execution_id}' <> 'exec-unknown-recovery-01' THEN
        RAISE EXCEPTION 'retry resume did not request the missing action: %', result;
    END IF;
    state_ref := result -> 'state_ref';
    result := dubakwi_service.state_apply(jsonb_build_object(
        'op','fail','state_ref',state_ref,
        'args',jsonb_build_object('status','failed','current_step','recovery.close','error_code','recovery_interrupted')
    ));
    IF result ->> 'ok' <> 'true' THEN RAISE EXCEPTION 'retry-failure fixture failed: %', result; END IF;
    release_payload := jsonb_build_object(
        'op','release','scope','verify-recovery-unknown','dlq_id',dlq_id_value,
        'operator_id','operator-contract-test','owner_id','owner-unknown',
        'input_hash',input_hash_value,'expected_dlq_revision',dlq_revision+1,
        'expected_state_revision',state_revision+2,
        'original_execution_id','exec-unknown-original',
        'recovery_execution_id','exec-unknown-recovery-01',
        'reason','synthetic recovery action failed before external effect',
        'verification','recovery_execution_ended_and_effects_rechecked',
        'target_effect_status','unknown'
    );
    result := dubakwi_service.recovery_release(release_payload);
    IF result ->> 'ok' <> 'true' OR result ->> 'replay_status' <> 'pending'
       OR result ->> 'processing_status' <> 'failed' THEN
        RAISE EXCEPTION 'failed recovery attempt did not return to pending: %', result;
    END IF;
    IF (SELECT effects #>> '{closed,status}' FROM dubakwi_service.dead_letters
        WHERE scope='verify-recovery-unknown' AND dlq_id=dlq_id_value) <> 'unknown'
       OR (SELECT recovery #>> '{last_effect_check,status}' FROM dubakwi_service.dead_letters
        WHERE scope='verify-recovery-unknown' AND dlq_id=dlq_id_value) <> 'unknown'
       OR (SELECT recovery #>> '{operator_reconciliation,decision}' FROM dubakwi_service.dead_letters
        WHERE scope='verify-recovery-unknown' AND dlq_id=dlq_id_value) IS NOT NULL THEN
        RAISE EXCEPTION 'release did not preserve unknown effect for mandatory reconciliation';
    END IF;

    -- The second execution also times out. Release must persist that uncertainty,
    -- so the next operator is forced to reconcile Jira before another claim.
    SELECT revision INTO STRICT dlq_revision FROM dubakwi_service.dead_letters
    WHERE scope='verify-recovery-unknown' AND dlq_id=dlq_id_value;
    SELECT revision INTO STRICT state_revision FROM dubakwi_service.request_state
    WHERE scope='verify-recovery-unknown' AND request_id='tc07-unknown-01';
    claim_payload := jsonb_build_object(
        'op','claim','scope','verify-recovery-unknown','dlq_id',dlq_id_value,
        'operator_id','operator-contract-test','owner_id','owner-unknown',
        'input_hash',input_hash_value,'expected_dlq_revision',dlq_revision,
        'expected_state_revision',state_revision,
        'original_execution_id','exec-unknown-recovery-01',
        'recovery_execution_id','exec-unknown-recovery-02',
        'verification','recovery_unknown_effect_checked_present'
    );
    result := dubakwi_service.recovery_claim(claim_payload);
    IF result ->> 'ok' <> 'true' OR result ->> 'action_required' <> 'false'
       OR result #>> '{effects,closed,status}' <> 'confirmed'
       OR result #>> '{operator_reconciliation,decision}' <> 'already_applied' THEN
        RAISE EXCEPTION 'verified present effect was not adopted without replay: %', result;
    END IF;
    resume_payload := jsonb_build_object(
        'op','resume','scope','verify-recovery-unknown','dlq_id',dlq_id_value,
        'owner_id','owner-unknown','input_hash',input_hash_value,
        'expected_dlq_revision',dlq_revision+1,'expected_state_revision',state_revision,
        'original_execution_id','exec-unknown-recovery-01',
        'recovery_execution_id','exec-unknown-recovery-02',
        'verification','recovery_conditions_confirmed'
    );
    result := dubakwi_service.recovery_resume(resume_payload);
    IF result ->> 'ok' <> 'true' OR result ->> 'action_required' <> 'false' THEN
        RAISE EXCEPTION 'already-applied action was incorrectly marked for replay: %', result;
    END IF;

    complete_payload := jsonb_build_object(
        'op','complete','scope','verify-recovery-unknown','dlq_id',dlq_id_value,
        'operator_id','operator-contract-test','owner_id','owner-unknown',
        'input_hash',input_hash_value,'expected_dlq_revision',dlq_revision+1,
        'expected_state_revision',state_revision+1,
        'original_execution_id','exec-unknown-recovery-01',
        'recovery_execution_id','exec-unknown-recovery-02',
        'jira_issue_id','10031','jira_issue_key','JBYS-31',
        'response',jsonb_build_object(
            'request_id','tc07-unknown-01','route','거절','answer','가상 문의 처리가 확인되었습니다.',
            'case_ref',case_id_value,'ticket',jsonb_build_object('ticket_id','JBYS-31')
        ),
        'effects',jsonb_set(effects_value,'{closed,status}',to_jsonb('confirmed'::text)),
        'verification','recovery_action_effects_confirmed'
    );
    result := dubakwi_service.recovery_complete(complete_payload);
    IF result ->> 'ok' <> 'true' OR result ->> 'replay_status' <> 'resolved'
       OR result ->> 'processing_status' <> 'completed' THEN
        RAISE EXCEPTION 'already-applied effect did not complete without duplicate write: %', result;
    END IF;
    result := dubakwi_service.recovery_complete(complete_payload);
    IF result ->> 'ok' <> 'false' OR result ->> 'error_code' <> 'recovery_conflict' THEN
        RAISE EXCEPTION 'duplicate reconciliation completion was not rejected: %', result;
    END IF;
END;
$$;

ROLLBACK;
