\set ON_ERROR_STOP on

BEGIN;

DO $$
DECLARE
    begin_payload jsonb;
    result jsonb;
    state_ref jsonb;
    response_value jsonb := jsonb_build_object(
        'request_id', 'tc07-finish-01',
        'route', '자동 답변',
        'answer', 'synthetic verified response',
        'sources', jsonb_build_array(),
        'ticket', NULL,
        'agents', jsonb_build_array('triage', 'writer', 'verifier'),
        'security', jsonb_build_object('blocked_by', NULL, 'reason', NULL, 'masked', 0)
    );
    dlq_id_value text;
    dlq_revision bigint;
    state_revision bigint;
    recovery_payload jsonb;
BEGIN
    begin_payload := jsonb_build_object(
        'op', 'begin',
        'scope', 'verify-recovery',
        'execution_id', 'exec-original-01',
        'input_hash', repeat('a', 64),
        'actor', jsonb_build_object('id', 'citizen-a'),
        'request', jsonb_build_object(
            'request_id', 'tc07-finish-01',
            'question', 'synthetic recovery verification',
            'attempt', 1
        )
    );

    result := dubakwi_service.state_apply(begin_payload);
    IF result ->> 'mode' <> 'proceed' THEN
        RAISE EXCEPTION 'recovery fixture begin failed: %', result;
    END IF;
    state_ref := result -> 'state_ref';

    result := dubakwi_service.state_apply(jsonb_build_object(
        'op', 'prepare', 'state_ref', state_ref,
        'args', jsonb_build_object('current_step', 'finish')
    ));
    IF coalesce((result ->> 'ok')::boolean, false) IS NOT TRUE THEN
        RAISE EXCEPTION 'recovery fixture prepare failed: %', result;
    END IF;
    state_ref := result -> 'state_ref';

    result := dubakwi_service.state_apply(jsonb_build_object(
        'op', 'bind', 'state_ref', state_ref,
        'args', jsonb_build_object(
            'jira_issue_id', '10007',
            'jira_issue_key', 'JBYS-7',
            'case_id', 'case-tc07-finish-01',
            'first_request_id', 'tc07-finish-01',
            'next_step', 'finish'
        )
    ));
    IF coalesce((result ->> 'ok')::boolean, false) IS NOT TRUE THEN
        RAISE EXCEPTION 'recovery fixture bind failed: %', result;
    END IF;
    state_ref := result -> 'state_ref';

    result := dubakwi_service.state_apply(jsonb_build_object(
        'op', 'fail', 'state_ref', state_ref,
        'args', jsonb_build_object(
            'status', 'failed', 'current_step', 'finish', 'error_code', 'state_error'
        )
    ));
    IF coalesce((result ->> 'ok')::boolean, false) IS NOT TRUE THEN
        RAISE EXCEPTION 'recovery fixture fail transition failed: %', result;
    END IF;

    result := dubakwi_service.dlq_apply(jsonb_build_object(
        'op', 'put', 'scope', 'verify-recovery',
        'request_id', 'tc07-finish-01', 'case_id', 'case-tc07-finish-01',
        'jira_issue_id', '10007', 'jira_issue_key', 'JBYS-7',
        'failed_step', 'finish', 'error_code', 'state_error',
        'summary', 'synthetic finish failure', 'attempts', 0,
        'effects', jsonb_build_object(
            'created_or_reused', jsonb_build_object('status', 'confirmed', 'id', 'JBYS-7'),
            'context_saved', jsonb_build_object('status', 'confirmed', 'id', 'JBYS-7'),
            'closed', jsonb_build_object('status', 'confirmed', 'id', 'JBYS-7'),
            'assigned', jsonb_build_object('status', 'none'),
            'alert', jsonb_build_object('status', 'none')
        ),
        'recovery', jsonb_build_object(
            'version', 1, 'mode', 'payload', 'action', 'finish',
            'args', jsonb_build_object('response', response_value),
            'reference', NULL, 'reason', 'finish response preserved'
        ),
        'last_execution_id', 'exec-original-01'
    ));
    IF coalesce((result ->> 'ok')::boolean, false) IS NOT TRUE THEN
        RAISE EXCEPTION 'recovery DLQ fixture put failed: %', result;
    END IF;
    dlq_id_value := result ->> 'dlq_id';

    SELECT revision INTO STRICT dlq_revision
    FROM dubakwi_service.dead_letters
    WHERE scope = 'verify-recovery' AND dlq_id = dlq_id_value;
    SELECT revision INTO STRICT state_revision
    FROM dubakwi_service.request_state
    WHERE scope = 'verify-recovery' AND request_id = 'tc07-finish-01';

    result := dubakwi_service.recovery_finish(jsonb_build_object(
        'op', 'inspect', 'scope', 'verify-recovery', 'dlq_id', dlq_id_value,
        'operator_id', 'operator-contract-test'
    ));
    IF coalesce((result ->> 'ok')::boolean, false) IS NOT TRUE
       OR result #>> '{dlq,replay_status}' <> 'pending'
       OR result #>> '{state,processing_status}' <> 'failed'
       OR result #>> '{dlq,recovery,action}' <> 'finish' THEN
        RAISE EXCEPTION 'operator recovery inspect mismatch: %', result;
    END IF;

    recovery_payload := jsonb_build_object(
        'op', 'finish', 'scope', 'verify-recovery', 'dlq_id', dlq_id_value,
        'expected_dlq_revision', dlq_revision,
        'expected_state_revision', state_revision,
        'original_execution_id', 'exec-original-01',
        'recovery_execution_id', 'exec-recovery-01',
        'operator_id', 'operator-contract-test',
        'verification', 'jira_effects_confirmed'
    );

    result := dubakwi_service.recovery_finish(recovery_payload);
    IF coalesce((result ->> 'ok')::boolean, false) IS NOT TRUE
       OR result ->> 'processing_status' <> 'completed'
       OR result ->> 'replay_status' <> 'resolved'
       OR result ->> 'execution_id' <> 'exec-recovery-01'
       OR (result ->> 'state_revision')::bigint <> state_revision + 2
       OR (result ->> 'dlq_revision')::bigint <> dlq_revision + 2 THEN
        RAISE EXCEPTION 'controlled finish recovery failed: %', result;
    END IF;

    IF (SELECT count(*) FROM dubakwi_service.request_state
        WHERE scope = 'verify-recovery' AND jira_issue_id = '10007') <> 1 THEN
        RAISE EXCEPTION 'finish recovery changed Jira ticket identity/count';
    END IF;

    result := dubakwi_service.state_apply(begin_payload);
    IF result ->> 'mode' <> 'replay'
       OR result #>> '{response,answer}' <> 'synthetic verified response' THEN
        RAISE EXCEPTION 'same request did not replay recovered response: %', result;
    END IF;

    result := dubakwi_service.recovery_finish(recovery_payload);
    IF coalesce((result ->> 'ok')::boolean, true) IS NOT FALSE
       OR result ->> 'error_code' <> 'recovery_conflict' THEN
        RAISE EXCEPTION 'recovery was not one-shot: %', result;
    END IF;

    -- Unknown/failed notification effects must never be accepted by finish replay.
    result := dubakwi_service.state_apply(jsonb_set(
        jsonb_set(
            jsonb_set(begin_payload, '{execution_id}', to_jsonb('exec-original-02'::text)),
            '{input_hash}', to_jsonb(repeat('b', 64))
        ),
        '{request,request_id}', to_jsonb('tc07-finish-02'::text)
    ));
    IF result ->> 'mode' <> 'proceed' THEN
        RAISE EXCEPTION 'second recovery fixture begin failed: %', result;
    END IF;
    state_ref := result -> 'state_ref';
    result := dubakwi_service.state_apply(jsonb_build_object(
        'op', 'prepare', 'state_ref', state_ref,
        'args', jsonb_build_object('current_step', 'finish')
    ));
    state_ref := result -> 'state_ref';
    result := dubakwi_service.state_apply(jsonb_build_object(
        'op', 'bind', 'state_ref', state_ref,
        'args', jsonb_build_object(
            'jira_issue_id', '10008', 'jira_issue_key', 'JBYS-8',
            'case_id', 'case-tc07-finish-02', 'first_request_id', 'tc07-finish-02',
            'next_step', 'finish'
        )
    ));
    state_ref := result -> 'state_ref';
    result := dubakwi_service.state_apply(jsonb_build_object(
        'op', 'fail', 'state_ref', state_ref,
        'args', jsonb_build_object(
            'status', 'unknown', 'current_step', 'finish', 'error_code', 'state_error'
        )
    ));
    result := dubakwi_service.dlq_apply(jsonb_build_object(
        'op', 'put', 'scope', 'verify-recovery',
        'request_id', 'tc07-finish-02', 'case_id', 'case-tc07-finish-02',
        'jira_issue_id', '10008', 'jira_issue_key', 'JBYS-8',
        'failed_step', 'finish', 'error_code', 'state_error',
        'summary', 'synthetic alert uncertainty', 'attempts', 0,
        'effects', jsonb_build_object(
            'created_or_reused', jsonb_build_object('status', 'confirmed', 'id', 'JBYS-8'),
            'context_saved', jsonb_build_object('status', 'confirmed', 'id', 'JBYS-8'),
            'closed', jsonb_build_object('status', 'none'),
            'assigned', jsonb_build_object('status', 'confirmed', 'id', 'JBYS-8'),
            'alert', jsonb_build_object('status', 'unknown')
        ),
        'recovery', jsonb_build_object(
            'version', 1, 'mode', 'payload', 'action', 'finish',
            'args', jsonb_build_object('response', jsonb_set(response_value, '{request_id}', to_jsonb('tc07-finish-02'::text))),
            'reference', NULL, 'reason', 'notification effect is unknown'
        ),
        'last_execution_id', 'exec-original-02'
    ));
    dlq_id_value := result ->> 'dlq_id';

    SELECT revision INTO STRICT dlq_revision
    FROM dubakwi_service.dead_letters
    WHERE scope = 'verify-recovery' AND dlq_id = dlq_id_value;
    SELECT revision INTO STRICT state_revision
    FROM dubakwi_service.request_state
    WHERE scope = 'verify-recovery' AND request_id = 'tc07-finish-02';

    recovery_payload := jsonb_build_object(
        'op', 'finish', 'scope', 'verify-recovery', 'dlq_id', dlq_id_value,
        'expected_dlq_revision', dlq_revision,
        'expected_state_revision', state_revision,
        'original_execution_id', 'exec-original-02',
        'recovery_execution_id', 'exec-recovery-02',
        'operator_id', 'operator-contract-test',
        'verification', 'jira_effects_confirmed'
    );
    result := dubakwi_service.recovery_finish(recovery_payload);
    IF coalesce((result ->> 'ok')::boolean, true) IS NOT FALSE
       OR result ->> 'error_code' <> 'recovery_not_supported' THEN
        RAISE EXCEPTION 'unknown external effect was replayed: %', result;
    END IF;
    IF (SELECT replay_status FROM dubakwi_service.dead_letters
        WHERE scope = 'verify-recovery' AND dlq_id = dlq_id_value) <> 'pending'
       OR (SELECT processing_status FROM dubakwi_service.request_state
           WHERE scope = 'verify-recovery' AND request_id = 'tc07-finish-02') <> 'unknown' THEN
        RAISE EXCEPTION 'rejected recovery changed source state or DLQ';
    END IF;
END;
$$;

ROLLBACK;
