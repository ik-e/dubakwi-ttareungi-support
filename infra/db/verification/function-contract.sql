\set ON_ERROR_STOP on

BEGIN;

DO $$
DECLARE
    begin_payload jsonb;
    result jsonb;
    state_ref jsonb;
    case_id_value text;
    dlq_revision bigint;
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

    SELECT revision INTO STRICT dlq_revision
    FROM dubakwi_service.dead_letters
    WHERE scope = 'verify-functions' AND request_id = 'req-state-01';

    result := dubakwi_service.dlq_apply(jsonb_build_object(
        'op', 'resolve',
        'scope', 'verify-functions',
        'dlq_id', result ->> 'dlq_id',
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
