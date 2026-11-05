\set ON_ERROR_STOP on

BEGIN;

DO $$
DECLARE
    begin_payload jsonb;
    result jsonb;
    state_ref jsonb;
    case_id_value text;
    dlq_revision bigint;
    dlq_id_value text;
BEGIN
    begin_payload := jsonb_build_object(
        'op', 'begin',
        'scope', 'verify-functions',
        'execution_id', 'exec-state-01',
        'input_hash', repeat('a', 64),
        'actor', jsonb_build_object('id', 'citizen-a'),
        'request', jsonb_build_object(
            'request_id', 'req-state-01',
            'question', 'synthetic verification',
            'attempt', 1
        )
    );

    result := dubakwi_service.state_apply(begin_payload);
    IF result ->> 'mode' <> 'proceed' THEN
        RAISE EXCEPTION 'begin did not acquire state: %', result;
    END IF;
    case_id_value := result #>> '{support,case_id}';
    state_ref := result -> 'state_ref';

    result := dubakwi_service.state_apply(jsonb_build_object(
        'op', 'prepare',
        'state_ref', state_ref,
        'args', jsonb_build_object('current_step', 'jira_create')
    ));
    IF coalesce((result ->> 'ok')::boolean, false) IS NOT TRUE THEN
        RAISE EXCEPTION 'prepare failed: %', result;
    END IF;
    state_ref := result -> 'state_ref';

    result := dubakwi_service.state_apply(jsonb_build_object(
        'op', 'bind',
        'state_ref', state_ref,
        'args', jsonb_build_object(
            'jira_issue_id', '10001',
            'jira_issue_key', 'JBYS-1',
            'case_id', case_id_value,
            'first_request_id', 'req-state-01',
            'next_step', 'respond'
        )
    ));
    IF coalesce((result ->> 'ok')::boolean, false) IS NOT TRUE THEN
        RAISE EXCEPTION 'bind failed: %', result;
    END IF;
    state_ref := result -> 'state_ref';

    result := dubakwi_service.state_apply(jsonb_build_object(
        'op', 'save',
        'state_ref', state_ref,
        'case_id', case_id_value,
        'first_request_id', 'req-state-01',
        'attempt', 1,
        'expected_case_version', 999,
        'ticket_id', 'JBYS-1',
        'facts', jsonb_build_object(),
        'outcome', jsonb_build_object(),
        'response', jsonb_build_object('request_id', 'req-state-01')
    ));
    IF coalesce((result ->> 'ok')::boolean, true) IS NOT FALSE
       OR result ->> 'error_code' <> 'tickets_down' THEN
        RAISE EXCEPTION 'save completed without verified Jira context: %', result;
    END IF;

    SELECT dubakwi_service.state_ref_json(rs) INTO STRICT state_ref
    FROM dubakwi_service.request_state AS rs
    WHERE scope = 'verify-functions' AND request_id = 'req-state-01'
      AND processing_status = 'processing';

    result := dubakwi_service.state_apply(jsonb_build_object(
        'op', 'finish',
        'state_ref', state_ref,
        'args', jsonb_build_object(
            'current_step', 'respond',
            'response', jsonb_build_object(
                'request_id', 'req-state-01',
                'route', '담당자 이관',
                'answer', 'synthetic verification'
            )
        )
    ));
    IF coalesce((result ->> 'ok')::boolean, false) IS NOT TRUE THEN
        RAISE EXCEPTION 'finish failed: %', result;
    END IF;

    result := dubakwi_service.state_apply(begin_payload);
    IF result ->> 'mode' <> 'replay' THEN
        RAISE EXCEPTION 'completed request was not replayed: %', result;
    END IF;

    result := dubakwi_service.state_apply(
        jsonb_set(begin_payload, '{input_hash}', to_jsonb(repeat('b', 64)))
    );
    IF result ->> 'mode' <> 'conflict' THEN
        RAISE EXCEPTION 'changed payload did not conflict: %', result;
    END IF;

    result := dubakwi_service.state_apply(jsonb_build_object(
        'op', 'begin',
        'scope', 'verify-functions',
        'execution_id', 'exec-state-02',
        'input_hash', repeat('c', 64),
        'actor', jsonb_build_object('id', 'citizen-a'),
        'request', jsonb_build_object(
            'request_id', 'req-state-02',
            'question', 'synthetic follow-up',
            'case_ref', 'case-existing'
        )
    ));
    IF result ->> 'error_code' <> 'case_verification_required' THEN
        RAISE EXCEPTION 'case_ref proceeded without Jira verification: %', result;
    END IF;

    result := dubakwi_service.state_apply(jsonb_build_object(
        'op', 'begin',
        'scope', 'verify-functions',
        'execution_id', 'exec-null-fail-01',
        'input_hash', repeat('d', 64),
        'actor', jsonb_build_object('id', 'citizen-a'),
        'request', jsonb_build_object('request_id', 'req-null-fail-01')
    ));
    IF result ->> 'mode' <> 'proceed' THEN
        RAISE EXCEPTION 'null-ref fail setup did not acquire state: %', result;
    END IF;

    result := dubakwi_service.state_apply(jsonb_build_object(
        'op', 'fail',
        'scope', 'verify-functions',
        'execution_id', 'exec-null-fail-01',
        'state_ref', NULL,
        'args', jsonb_build_object(
            'status', 'unknown',
            'current_step', 'jira_create',
            'error_code', 'ticket_unknown'
        )
    ));
    IF coalesce((result ->> 'ok')::boolean, false) IS NOT TRUE
       OR coalesce((result ->> 'skipped')::boolean, true) IS NOT FALSE THEN
        RAISE EXCEPTION 'owned null-ref fail was not stored: %', result;
    END IF;

    result := dubakwi_service.dlq_apply(jsonb_build_object(
        'op', 'put',
        'scope', 'verify-functions',
        'request_id', 'req-state-01',
        'case_id', 'case-state-01',
        'jira_issue_id', '10001',
        'jira_issue_key', 'JBYS-1',
        'failed_step', 'jira_close',
        'error_code', 'tickets_down',
        'summary', 'synthetic verification',
        'attempts', 0,
        'effects', jsonb_build_object('closed', jsonb_build_object('status', 'unknown')),
        'recovery', jsonb_build_object('version', 1, 'mode', 'jira_ref'),
        'last_execution_id', 'exec-state-01'
    ));
    IF coalesce((result ->> 'ok')::boolean, false) IS NOT TRUE
       OR coalesce((result ->> 'deduplicated')::boolean, true) IS NOT FALSE THEN
        RAISE EXCEPTION 'first DLQ put failed: %', result;
    END IF;

    result := dubakwi_service.dlq_apply(jsonb_build_object(
        'op', 'put',
        'scope', 'verify-functions',
        'request_id', 'req-state-01',
        'case_id', 'case-state-01',
        'jira_issue_id', '10001',
        'jira_issue_key', 'JBYS-1',
        'failed_step', 'jira_close',
        'error_code', 'tickets_down',
        'summary', 'synthetic verification retry',
        'attempts', 1,
        'effects', jsonb_build_object('closed', jsonb_build_object('status', 'unknown')),
        'recovery', jsonb_build_object('version', 1, 'mode', 'jira_ref'),
        'last_execution_id', 'exec-state-02'
    ));
    IF coalesce((result ->> 'deduplicated')::boolean, false) IS NOT TRUE THEN
        RAISE EXCEPTION 'second DLQ put was not deduplicated: %', result;
    END IF;

    SELECT revision INTO STRICT dlq_revision
    FROM dubakwi_service.dead_letters
    WHERE scope = 'verify-functions' AND request_id = 'req-state-01';

    result := dubakwi_service.dlq_apply(jsonb_build_object(
        'op', 'claim',
        'scope', 'verify-functions',
        'dlq_id', result ->> 'dlq_id',
        'expected_revision', dlq_revision,
        'operator_id', 'operator-demo',
        'execution_id', 'exec-recovery-01'
    ));
    IF coalesce((result ->> 'ok')::boolean, false) IS NOT TRUE THEN
        RAISE EXCEPTION 'DLQ claim failed: %', result;
    END IF;
    dlq_id_value := result ->> 'dlq_id';

    SELECT revision INTO STRICT dlq_revision
    FROM dubakwi_service.dead_letters
    WHERE scope = 'verify-functions' AND request_id = 'req-state-01';

    result := dubakwi_service.dlq_apply(jsonb_build_object(
        'op', 'put',
        'scope', 'verify-functions',
        'request_id', 'req-state-01',
        'case_id', 'case-state-01',
        'jira_issue_id', '10001',
        'jira_issue_key', 'JBYS-1',
        'failed_step', 'jira_close',
        'error_code', 'tickets_down',
        'summary', 'duplicate during active recovery',
        'attempts', 2,
        'effects', jsonb_build_object('closed', jsonb_build_object('status', 'unknown')),
        'recovery', jsonb_build_object('version', 1, 'mode', 'jira_ref'),
        'last_execution_id', 'exec-state-03'
    ));
    IF coalesce((result ->> 'deduplicated')::boolean, false) IS NOT TRUE THEN
        RAISE EXCEPTION 'active DLQ duplicate was not deduplicated: %', result;
    END IF;

    IF EXISTS (
        SELECT 1 FROM dubakwi_service.dead_letters
        WHERE dlq_id = dlq_id_value
          AND (replay_status <> 'reprocessing'
               OR revision <> dlq_revision
               OR last_execution_id <> 'exec-recovery-01')
    ) THEN
        RAISE EXCEPTION 'active DLQ claim was changed by duplicate put';
    END IF;

    result := dubakwi_service.dlq_apply(jsonb_build_object(
        'op', 'claim',
        'scope', 'verify-functions',
        'dlq_id', dlq_id_value,
        'expected_revision', dlq_revision,
        'operator_id', 'operator-other',
        'execution_id', 'exec-recovery-02'
    ));
    IF coalesce((result ->> 'ok')::boolean, true) IS NOT FALSE THEN
        RAISE EXCEPTION 'second operator acquired active DLQ claim: %', result;
    END IF;

    result := dubakwi_service.dlq_apply(jsonb_build_object(
        'op', 'resolve',
        'scope', 'verify-functions',
        'dlq_id', dlq_id_value,
        'expected_revision', dlq_revision,
        'operator_id', 'operator-demo',
        'execution_id', 'exec-recovery-01',
        'resolution', 'synthetic verification complete'
    ));
    IF coalesce((result ->> 'ok')::boolean, false) IS NOT TRUE THEN
        RAISE EXCEPTION 'DLQ resolve failed: %', result;
    END IF;
END;
$$;

ROLLBACK;
