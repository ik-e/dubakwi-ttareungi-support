\set ON_ERROR_STOP on

BEGIN;

DO $$
DECLARE
    result jsonb;
    begin_result jsonb;
    state_ref jsonb;
    dlq_id_value text;
    jira_ref_dlq_id text;
    dlq_revision bigint;
    state_revision bigint;
    case_id_value text;
    claim_payload jsonb;
    resume_payload jsonb;
    release_payload jsonb;
    complete_payload jsonb;
    effects_success jsonb;
    input_hash_value text := repeat('c', 64);
BEGIN
    begin_result := dubakwi_service.state_apply(jsonb_build_object(
        'op', 'begin', 'scope', 'verify-recovery-claim',
        'execution_id', 'exec-original-claim-01', 'input_hash', input_hash_value,
        'actor', jsonb_build_object('id', 'operator-owner-01'),
        'request', jsonb_build_object(
            'request_id', 'tc07-claim-01', 'question', 'synthetic recovery claim', 'attempt', 1
        )
    ));
    IF begin_result ->> 'mode' <> 'proceed' THEN
        RAISE EXCEPTION 'claim fixture begin failed: %', begin_result;
    END IF;
    case_id_value := begin_result #>> '{support,case_id}';
    state_ref := begin_result -> 'state_ref';
    result := dubakwi_service.state_apply(jsonb_build_object(
        'op', 'prepare', 'state_ref', state_ref,
        'args', jsonb_build_object('current_step', 'context_update')
    ));
    state_ref := result -> 'state_ref';
    result := dubakwi_service.state_apply(jsonb_build_object(
        'op', 'bind', 'state_ref', state_ref,
        'args', jsonb_build_object(
            'jira_issue_id', '10021', 'jira_issue_key', 'JBYS-21',
            'case_id', case_id_value, 'first_request_id', 'tc07-claim-01',
            'next_step', 'context_update'
        )
    ));
    state_ref := result -> 'state_ref';
    result := dubakwi_service.state_apply(jsonb_build_object(
        'op', 'fail', 'state_ref', state_ref,
        'args', jsonb_build_object(
            'status', 'failed', 'current_step', 'context_update', 'error_code', 'context_write_failed'
        )
    ));
    IF result ->> 'ok' <> 'true' THEN
        RAISE EXCEPTION 'claim fixture fail failed: %', result;
    END IF;

    result := dubakwi_service.dlq_apply(jsonb_build_object(
        'op', 'put', 'scope', 'verify-recovery-claim',
        'request_id', 'tc07-claim-01', 'case_id', case_id_value,
        'jira_issue_id', '10021', 'jira_issue_key', 'JBYS-21',
        'failed_step', 'context_update', 'error_code', 'context_write_failed',
        'summary', 'synthetic context update failure', 'attempts', 0,
        'effects', jsonb_build_object(
            'created_or_reused', jsonb_build_object('status', 'confirmed', 'id', 'JBYS-21'),
            'context_saved', jsonb_build_object('status', 'failed', 'id', 'JBYS-21'),
            'closed', jsonb_build_object('status', 'none'),
            'assigned', jsonb_build_object('status', 'none'),
            'alert', jsonb_build_object('status', 'none')
        ),
        'recovery', jsonb_build_object(
            'version', 1, 'mode', 'payload', 'action', 'context_update',
            'args', jsonb_build_object('body', 'synthetic-safe-context'),
            'reference', NULL, 'reason', 'synthetic confirmed context failure'
        ),
        'last_execution_id', 'exec-original-claim-01'
    ));
    dlq_id_value := result ->> 'dlq_id';

    SELECT revision INTO STRICT dlq_revision FROM dubakwi_service.dead_letters
    WHERE scope = 'verify-recovery-claim' AND dlq_id = dlq_id_value;
    SELECT revision INTO STRICT state_revision FROM dubakwi_service.request_state
    WHERE scope = 'verify-recovery-claim' AND request_id = 'tc07-claim-01';

    claim_payload := jsonb_build_object(
        'op', 'claim', 'scope', 'verify-recovery-claim', 'dlq_id', dlq_id_value,
        'operator_id', 'operator-contract-test', 'owner_id', 'operator-owner-01',
        'input_hash', input_hash_value,
        'expected_dlq_revision', dlq_revision,
        'expected_state_revision', state_revision,
        'original_execution_id', 'exec-original-claim-01',
        'recovery_execution_id', 'exec-recovery-claim-01',
        'verification', 'recovery_conditions_confirmed'
    );
    result := dubakwi_service.recovery_claim(jsonb_set(
        claim_payload, '{input_hash}', to_jsonb(repeat('e', 64))
    ));
    IF result ->> 'ok' <> 'false' OR result ->> 'error_code' <> 'recovery_conflict' THEN
        RAISE EXCEPTION 'mismatched input hash was not rejected: %', result;
    END IF;

    -- A Jira reference without the failed write's payload cannot be replayed.
    result := dubakwi_service.dlq_apply(jsonb_build_object(
        'op', 'put', 'scope', 'verify-recovery-claim',
        'request_id', 'tc07-claim-01', 'case_id', case_id_value,
        'jira_issue_id', '10021', 'jira_issue_key', 'JBYS-21',
        'failed_step', 'context_update', 'error_code', 'context_ref_only',
        'summary', 'synthetic ref-only capsule', 'attempts', 0,
        'effects', jsonb_build_object(
            'created_or_reused', jsonb_build_object('status', 'confirmed', 'id', 'JBYS-21'),
            'context_saved', jsonb_build_object('status', 'failed', 'id', 'JBYS-21'),
            'closed', jsonb_build_object('status', 'none'),
            'assigned', jsonb_build_object('status', 'none'),
            'alert', jsonb_build_object('status', 'none')
        ),
        'recovery', jsonb_build_object(
            'version', 1, 'mode', 'jira_ref', 'action', 'context_update',
            'args', NULL, 'reference', jsonb_build_object(
                'jira_issue_id', '10021', 'case_id', case_id_value, 'owner_id', 'operator-owner-01'
            ), 'reason', 'no replayable context payload'
        ),
        'last_execution_id', 'exec-original-claim-01'
    ));
    jira_ref_dlq_id := result ->> 'dlq_id';
    result := dubakwi_service.recovery_claim(jsonb_build_object(
        'op', 'claim', 'scope', 'verify-recovery-claim', 'dlq_id', jira_ref_dlq_id,
        'operator_id', 'operator-contract-test', 'owner_id', 'operator-owner-01',
        'input_hash', input_hash_value, 'expected_dlq_revision', 0,
        'expected_state_revision', state_revision,
        'original_execution_id', 'exec-original-claim-01',
        'recovery_execution_id', 'exec-ref-only-claim',
        'verification', 'recovery_conditions_confirmed'
    ));
    IF result ->> 'ok' <> 'false' OR result ->> 'error_code' <> 'recovery_not_supported'
       OR (SELECT replay_status FROM dubakwi_service.dead_letters
           WHERE scope = 'verify-recovery-claim' AND dlq_id = jira_ref_dlq_id) <> 'pending' THEN
        RAISE EXCEPTION 'ref-only capsule should be rejected without claiming: %', result;
    END IF;

    result := dubakwi_service.recovery_claim(claim_payload);
    IF result ->> 'ok' <> 'true' OR result ->> 'replay_status' <> 'reprocessing'
       OR result ->> 'action' <> 'context_update'
       OR (result ->> 'attempts')::integer <> 1 THEN
        RAISE EXCEPTION 'valid recovery claim failed: %', result;
    END IF;
    IF (SELECT processing_status FROM dubakwi_service.request_state
        WHERE scope = 'verify-recovery-claim' AND request_id = 'tc07-claim-01') <> 'failed' THEN
        RAISE EXCEPTION 'claim must not restart the request before the recovery driver runs';
    END IF;

    result := dubakwi_service.recovery_claim(claim_payload);
    IF result ->> 'ok' <> 'false' OR result ->> 'error_code' <> 'recovery_conflict' THEN
        RAISE EXCEPTION 'duplicate/stale claim was not rejected: %', result;
    END IF;

    release_payload := jsonb_build_object(
        'op', 'release', 'scope', 'verify-recovery-claim', 'dlq_id', dlq_id_value,
        'operator_id', 'operator-contract-test', 'owner_id', 'operator-owner-01',
        'input_hash', input_hash_value,
        'expected_dlq_revision', dlq_revision + 1,
        'expected_state_revision', state_revision,
        'original_execution_id', 'exec-original-claim-01',
        'recovery_execution_id', 'exec-recovery-claim-01',
        'reason', 'synthetic driver failed before any external call',
        'verification', 'recovery_execution_ended_and_effects_rechecked',
        'target_effect_status','failed'
    );
    result := dubakwi_service.recovery_release(release_payload - 'verification');
    IF result ->> 'ok' <> 'false' OR result ->> 'error_code' <> 'recovery_confirmation_required'
       OR (SELECT replay_status FROM dubakwi_service.dead_letters
           WHERE scope = 'verify-recovery-claim' AND dlq_id = dlq_id_value) <> 'reprocessing' THEN
        RAISE EXCEPTION 'release without execution/effect recheck attestation was not denied: %', result;
    END IF;
    result := dubakwi_service.recovery_release(release_payload);
    IF result ->> 'ok' <> 'true' OR result ->> 'replay_status' <> 'pending'
       OR (result ->> 'dlq_revision')::bigint <> dlq_revision + 2 THEN
        RAISE EXCEPTION 'recovery release did not return item to pending: %', result;
    END IF;
    IF (SELECT processing_status FROM dubakwi_service.request_state
        WHERE scope = 'verify-recovery-claim' AND request_id = 'tc07-claim-01') <> 'failed' THEN
        RAISE EXCEPTION 'release changed request processing status';
    END IF;
    IF (SELECT last_execution_id FROM dubakwi_service.dead_letters
        WHERE scope = 'verify-recovery-claim' AND dlq_id = dlq_id_value) <> 'exec-original-claim-01' THEN
        RAISE EXCEPTION 'release before resume did not restore the original execution ID';
    END IF;

    result := dubakwi_service.recovery_release(release_payload);
    IF result ->> 'ok' <> 'false' OR result ->> 'error_code' <> 'recovery_conflict' THEN
        RAISE EXCEPTION 'duplicate/stale release was not rejected: %', result;
    END IF;

    -- A successful effect marked unknown must not be claimed for replay.
    -- Refresh through the public DLQ function with the same dedupe key and an
    -- unrelated unknown notification effect. No direct table write is used.
    result := dubakwi_service.dlq_apply(jsonb_build_object(
        'op', 'put', 'scope', 'verify-recovery-claim',
        'request_id', 'tc07-claim-01', 'case_id', case_id_value,
        'jira_issue_id', '10021', 'jira_issue_key', 'JBYS-21',
        'failed_step', 'context_update', 'error_code', 'context_write_failed',
        'summary', 'synthetic context update failure', 'attempts', 1,
        'effects', jsonb_build_object(
            'created_or_reused', jsonb_build_object('status', 'confirmed', 'id', 'JBYS-21'),
            'context_saved', jsonb_build_object('status', 'failed', 'id', 'JBYS-21'),
            'closed', jsonb_build_object('status', 'none'),
            'assigned', jsonb_build_object('status', 'none'),
            'alert', jsonb_build_object('status', 'unknown')
        ),
        'recovery', jsonb_build_object(
            'version', 1, 'mode', 'payload', 'action', 'context_update',
            'args', jsonb_build_object('body', 'synthetic-safe-context'),
            'reference', NULL, 'reason', 'synthetic confirmed context failure'
        ),
        'last_execution_id', 'exec-original-claim-01'
    ));
    claim_payload := jsonb_set(claim_payload, '{expected_dlq_revision}', to_jsonb(dlq_revision + 3));
    result := dubakwi_service.recovery_claim(claim_payload);
    IF result ->> 'ok' <> 'false' OR result ->> 'error_code' <> 'recovery_effect_unknown' THEN
        RAISE EXCEPTION 'unknown non-target effect was not rejected: %', result;
    END IF;
    IF (SELECT replay_status FROM dubakwi_service.dead_letters
        WHERE scope = 'verify-recovery-claim' AND dlq_id = dlq_id_value) <> 'pending' THEN
        RAISE EXCEPTION 'rejected unknown-effect claim mutated DLQ';
    END IF;

    -- Confirm a later safe claim can issue a fresh StateRef, and that an
    -- interrupted resumed attempt returns to failed/pending only with explicit
    -- end-of-execution and effect-recheck confirmation.
    result := dubakwi_service.dlq_apply(jsonb_build_object(
        'op', 'put', 'scope', 'verify-recovery-claim',
        'request_id', 'tc07-claim-01', 'case_id', case_id_value,
        'jira_issue_id', '10021', 'jira_issue_key', 'JBYS-21',
        'failed_step', 'context_update', 'error_code', 'context_write_failed',
        'summary', 'synthetic context update failure', 'attempts', 1,
        'effects', jsonb_build_object(
            'created_or_reused', jsonb_build_object('status', 'confirmed', 'id', 'JBYS-21'),
            'context_saved', jsonb_build_object('status', 'failed', 'id', 'JBYS-21'),
            'closed', jsonb_build_object('status', 'none'),
            'assigned', jsonb_build_object('status', 'none'),
            'alert', jsonb_build_object('status', 'none')
        ),
        'recovery', jsonb_build_object(
            'version', 1, 'mode', 'payload', 'action', 'context_update',
            'args', jsonb_build_object('body', 'synthetic-safe-context'),
            'reference', NULL, 'reason', 'synthetic confirmed context failure'
        ),
        'last_execution_id', 'exec-original-claim-01'
    ));
    IF result ->> 'ok' <> 'true' THEN
        RAISE EXCEPTION 'could not refresh failure fixture after resolving uncertainty: %', result;
    END IF;
    claim_payload := jsonb_set(claim_payload, '{expected_dlq_revision}', to_jsonb(dlq_revision + 4));
    result := dubakwi_service.recovery_claim(claim_payload);
    IF result ->> 'ok' <> 'true' THEN RAISE EXCEPTION 'second claim failed: %', result; END IF;

    resume_payload := jsonb_build_object(
        'op', 'resume', 'scope', 'verify-recovery-claim', 'dlq_id', dlq_id_value,
        'owner_id', 'operator-owner-01', 'input_hash', input_hash_value,
        'expected_dlq_revision', dlq_revision + 5,
        'expected_state_revision', state_revision,
        'original_execution_id', 'exec-original-claim-01',
        'recovery_execution_id', 'exec-recovery-claim-01',
        'verification', 'recovery_conditions_confirmed'
    );
    result := dubakwi_service.recovery_resume(resume_payload);
    IF result ->> 'ok' <> 'true' OR result ->> 'processing_status' <> 'processing'
       OR result #>> '{state_ref,execution_id}' <> 'exec-recovery-claim-01'
       OR (result #>> '{state_ref,state_revision}')::bigint <> state_revision + 1 THEN
        RAISE EXCEPTION 'fresh recovery StateRef was not issued: %', result;
    END IF;
    state_ref := result -> 'state_ref';
    result := dubakwi_service.state_apply(jsonb_build_object(
        'op', 'fail', 'state_ref', state_ref,
        'args', jsonb_build_object('status','failed','current_step','recovery.context_update','error_code','recovery_interrupted')
    ));
    IF result ->> 'ok' <> 'true' THEN RAISE EXCEPTION 'recovery failure fixture failed: %', result; END IF;
    release_payload := jsonb_build_object(
        'op', 'release', 'scope', 'verify-recovery-claim', 'dlq_id', dlq_id_value,
        'operator_id', 'operator-contract-test', 'owner_id', 'operator-owner-01',
        'input_hash', input_hash_value,
        'expected_dlq_revision', dlq_revision + 5,
        'expected_state_revision', state_revision + 2,
        'original_execution_id', 'exec-original-claim-01',
        'recovery_execution_id', 'exec-recovery-claim-01',
        'reason', 'synthetic recovery execution ended after failed driver',
        'verification', 'recovery_execution_ended_and_effects_rechecked',
        'target_effect_status','failed'
    );
    result := dubakwi_service.recovery_release(release_payload);
    IF result ->> 'ok' <> 'true' OR result ->> 'replay_status' <> 'pending'
       OR result ->> 'processing_status' <> 'failed'
       OR result ->> 'execution_id' <> 'exec-recovery-claim-01' THEN
        RAISE EXCEPTION 'resumed recovery was not safely returned to pending: %', result;
    END IF;

    -- A fresh attempt performs its target action and atomically completes the
    -- request/DLQ. Repeating the exact completion must be rejected.
    result := dubakwi_service.dlq_apply(jsonb_build_object(
        'op', 'put', 'scope', 'verify-recovery-claim',
        'request_id', 'tc07-claim-01', 'case_id', case_id_value,
        'jira_issue_id', '10021', 'jira_issue_key', 'JBYS-21',
        'failed_step', 'context_update', 'error_code', 'context_write_failed',
        'summary', 'synthetic context update failure', 'attempts', 2,
        'effects', jsonb_build_object(
            'created_or_reused', jsonb_build_object('status', 'confirmed', 'id', 'JBYS-21'),
            'context_saved', jsonb_build_object('status', 'failed', 'id', 'JBYS-21'),
            'closed', jsonb_build_object('status', 'none'),
            'assigned', jsonb_build_object('status', 'none'),
            'alert', jsonb_build_object('status', 'none')
        ),
        'recovery', jsonb_build_object(
            'version', 1, 'mode', 'payload', 'action', 'context_update',
            'args', jsonb_build_object('body', 'synthetic-safe-context'),
            'reference', NULL, 'reason', 'synthetic confirmed context failure'
        ),
        'last_execution_id', 'exec-recovery-claim-01'
    ));
    SELECT revision INTO STRICT dlq_revision FROM dubakwi_service.dead_letters
    WHERE scope = 'verify-recovery-claim' AND dlq_id = dlq_id_value;
    SELECT revision INTO STRICT state_revision FROM dubakwi_service.request_state
    WHERE scope = 'verify-recovery-claim' AND request_id = 'tc07-claim-01';
    claim_payload := jsonb_build_object(
        'op', 'claim', 'scope', 'verify-recovery-claim', 'dlq_id', dlq_id_value,
        'operator_id', 'operator-contract-test', 'owner_id', 'operator-owner-01',
        'input_hash', input_hash_value, 'expected_dlq_revision', dlq_revision,
        'expected_state_revision', state_revision,
        'original_execution_id', 'exec-recovery-claim-01',
        'recovery_execution_id', 'exec-recovery-claim-02',
        'verification', 'recovery_conditions_confirmed'
    );
    result := dubakwi_service.recovery_claim(claim_payload);
    IF result ->> 'ok' <> 'true' THEN RAISE EXCEPTION 'success path claim failed: %', result; END IF;
    resume_payload := jsonb_build_object(
        'op', 'resume', 'scope', 'verify-recovery-claim', 'dlq_id', dlq_id_value,
        'owner_id', 'operator-owner-01', 'input_hash', input_hash_value,
        'expected_dlq_revision', dlq_revision + 1,
        'expected_state_revision', state_revision,
        'original_execution_id', 'exec-recovery-claim-01',
        'recovery_execution_id', 'exec-recovery-claim-02',
        'verification', 'recovery_conditions_confirmed'
    );
    result := dubakwi_service.recovery_resume(resume_payload);
    IF result ->> 'ok' <> 'true' THEN RAISE EXCEPTION 'success path resume failed: %', result; END IF;
    effects_success := jsonb_build_object(
        'created_or_reused', jsonb_build_object('status', 'confirmed', 'id', 'JBYS-21'),
        'context_saved', jsonb_build_object('status', 'confirmed', 'id', 'JBYS-21'),
        'closed', jsonb_build_object('status', 'none'),
        'assigned', jsonb_build_object('status', 'none'),
        'alert', jsonb_build_object('status', 'none')
    );
    complete_payload := jsonb_build_object(
        'op', 'complete', 'scope', 'verify-recovery-claim', 'dlq_id', dlq_id_value,
        'operator_id', 'operator-contract-test', 'owner_id', 'operator-owner-01',
        'input_hash', input_hash_value,
        'expected_dlq_revision', dlq_revision + 1,
        'expected_state_revision', state_revision + 1,
        'original_execution_id', 'exec-recovery-claim-01',
        'recovery_execution_id', 'exec-recovery-claim-02',
        'jira_issue_id', '10021', 'jira_issue_key', 'JBYS-21',
        'response', jsonb_build_object(
            'request_id', 'tc07-claim-01', 'route', '담당자 이관',
            'answer', '가상 복구가 완료되어 담당자 확인을 기다리고 있습니다.',
            'case_ref', case_id_value,
            'ticket', jsonb_build_object('ticket_id', 'JBYS-21', 'priority', 'normal', 'duplicate', false),
            'sources', jsonb_build_array(), 'agents', jsonb_build_array(),
            'security', jsonb_build_object('blocked_by', NULL, 'reason', NULL, 'masked', 0)
        ),
        'effects', effects_success,
        'verification', 'recovery_action_effects_confirmed'
    );
    result := dubakwi_service.recovery_control(jsonb_set(
        complete_payload, '{effects,context_saved,status}', to_jsonb('unknown'::text)
    ));
    IF result ->> 'ok' <> 'false' OR result ->> 'error_code' <> 'recovery_effect_not_confirmed'
       OR (SELECT replay_status FROM dubakwi_service.dead_letters
           WHERE scope = 'verify-recovery-claim' AND dlq_id = dlq_id_value) <> 'reprocessing'
       OR (SELECT processing_status FROM dubakwi_service.request_state
           WHERE scope = 'verify-recovery-claim' AND request_id = 'tc07-claim-01') <> 'processing' THEN
        RAISE EXCEPTION 'unconfirmed effect must reject completion without mutation: %', result;
    END IF;
    result := dubakwi_service.recovery_control(complete_payload);
    IF result ->> 'ok' <> 'true' OR result ->> 'replay_status' <> 'resolved'
       OR result ->> 'processing_status' <> 'completed'
       OR result #>> '{state_ref,execution_id}' <> 'exec-recovery-claim-02' THEN
        RAISE EXCEPTION 'verified recovery completion failed: %', result;
    END IF;
    result := dubakwi_service.recovery_control(complete_payload);
    IF result ->> 'ok' <> 'false' OR result ->> 'error_code' <> 'recovery_conflict' THEN
        RAISE EXCEPTION 'duplicate recovery completion was not denied: %', result;
    END IF;
END;
$$;

DO $$
BEGIN
    IF has_function_privilege('dubakwi_runtime', 'dubakwi_service.recovery_claim(jsonb)', 'EXECUTE')
       OR has_function_privilege('dubakwi_runtime', 'dubakwi_service.recovery_release(jsonb)', 'EXECUTE')
       OR has_function_privilege('dubakwi_runtime', 'dubakwi_service.recovery_resume(jsonb)', 'EXECUTE')
       OR has_function_privilege('dubakwi_runtime', 'dubakwi_service.recovery_complete(jsonb)', 'EXECUTE')
       OR has_function_privilege('dubakwi_runtime', 'dubakwi_service.recovery_control(jsonb)', 'EXECUTE') THEN
        RAISE EXCEPTION 'runtime role must not execute operator recovery functions';
    END IF;
    IF NOT has_function_privilege('dubakwi_recovery_operator', 'dubakwi_service.recovery_claim(jsonb)', 'EXECUTE')
       OR NOT has_function_privilege('dubakwi_recovery_operator', 'dubakwi_service.recovery_release(jsonb)', 'EXECUTE')
       OR NOT has_function_privilege('dubakwi_recovery_operator', 'dubakwi_service.recovery_resume(jsonb)', 'EXECUTE')
       OR NOT has_function_privilege('dubakwi_recovery_operator', 'dubakwi_service.recovery_complete(jsonb)', 'EXECUTE')
       OR NOT has_function_privilege('dubakwi_recovery_operator', 'dubakwi_service.recovery_control(jsonb)', 'EXECUTE') THEN
        RAISE EXCEPTION 'operator role must execute the allowlisted recovery functions';
    END IF;
END;
$$;

ROLLBACK;
