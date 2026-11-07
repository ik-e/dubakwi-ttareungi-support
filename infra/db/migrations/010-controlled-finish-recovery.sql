-- Operator-only, effect-free recovery for a persisted finish response.
-- Apply after 001~009. The recovery role is NOLOGIN; provision a separate
-- environment login as its member and use it only in the operator workflow.
BEGIN;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_roles WHERE rolname = 'dubakwi_recovery_operator'
    ) THEN
        CREATE ROLE dubakwi_recovery_operator
            NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT;
    END IF;
END;
$$;

CREATE FUNCTION dubakwi_service.recovery_finish(payload jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, dubakwi_service
AS $$
DECLARE
    op_value text := payload ->> 'op';
    scope_value text := nullif(btrim(payload ->> 'scope'), '');
    dlq_value text := nullif(btrim(payload ->> 'dlq_id'), '');
    operator_value text := nullif(btrim(payload ->> 'operator_id'), '');
    original_execution text := nullif(btrim(payload ->> 'original_execution_id'), '');
    recovery_execution text := nullif(btrim(payload ->> 'recovery_execution_id'), '');
    request_value text;
    expected_dlq_revision bigint;
    expected_state_revision bigint;
    dlq_row dubakwi_service.dead_letters%ROWTYPE;
    state_row dubakwi_service.request_state%ROWTYPE;
    response_value jsonb;
    effects_value jsonb;
    action_value text;
    mode_value text;
    route_value text;
    state_ref_value jsonb;
    result_row dubakwi_service.request_state%ROWTYPE;
BEGIN
    IF jsonb_typeof(payload) IS DISTINCT FROM 'object'
       OR op_value IS NULL OR op_value NOT IN ('inspect', 'finish')
       OR scope_value IS NULL OR dlq_value IS NULL
       OR operator_value IS NULL THEN
        RETURN jsonb_build_object(
            'ok', false, 'error_code', 'invalid_recovery_request'
        );
    END IF;

    BEGIN
        expected_dlq_revision := (payload ->> 'expected_dlq_revision')::bigint;
        expected_state_revision := (payload ->> 'expected_state_revision')::bigint;
    EXCEPTION WHEN invalid_text_representation OR numeric_value_out_of_range THEN
        expected_dlq_revision := NULL;
        expected_state_revision := NULL;
    END;

    SELECT * INTO dlq_row
    FROM dubakwi_service.dead_letters
    WHERE scope = scope_value AND dlq_id = dlq_value;

    IF NOT FOUND OR dlq_row.request_id IS NULL THEN
        RETURN jsonb_build_object(
            'ok', false, 'error_code', 'recovery_not_found'
        );
    END IF;

    SELECT * INTO state_row
    FROM dubakwi_service.request_state
    WHERE scope = scope_value AND request_id = dlq_row.request_id;

    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'ok', false, 'error_code', 'recovery_state_not_found'
        );
    END IF;

    IF op_value = 'inspect' THEN
        RETURN jsonb_build_object(
            'ok', true,
            'dlq', jsonb_build_object(
                'dlq_id', dlq_row.dlq_id,
                'scope', dlq_row.scope,
                'request_id', dlq_row.request_id,
                'case_id', dlq_row.case_id,
                'jira_issue_id', dlq_row.jira_issue_id,
                'jira_issue_key', dlq_row.jira_issue_key,
                'failed_step', dlq_row.failed_step,
                'error_code', dlq_row.error_code,
                'effects', dlq_row.effects,
                'recovery', dlq_row.recovery,
                'replay_status', dlq_row.replay_status,
                'last_execution_id', dlq_row.last_execution_id,
                'revision', dlq_row.revision
            ),
            'state', jsonb_build_object(
                'request_id', state_row.request_id,
                'scope', state_row.scope,
                'owner_id', state_row.owner_id,
                'jira_issue_id', state_row.jira_issue_id,
                'jira_issue_key', state_row.jira_issue_key,
                'processing_status', state_row.processing_status,
                'current_step', state_row.current_step,
                'execution_id', state_row.execution_id,
                'revision', state_row.revision,
                'response', state_row.response
            )
        );
    END IF;

    IF expected_dlq_revision IS NULL OR expected_state_revision IS NULL
       OR original_execution IS NULL OR recovery_execution IS NULL
       OR recovery_execution = original_execution
       OR payload ->> 'verification' IS DISTINCT FROM 'jira_effects_confirmed' THEN
        RETURN jsonb_build_object(
            'ok', false, 'error_code', 'invalid_recovery_request'
        );
    END IF;

    -- Lock in a stable order so simultaneous operators cannot both recover.
    SELECT * INTO dlq_row
    FROM dubakwi_service.dead_letters
    WHERE scope = scope_value AND dlq_id = dlq_value
    FOR UPDATE;

    IF NOT FOUND OR dlq_row.revision IS DISTINCT FROM expected_dlq_revision
       OR dlq_row.replay_status IS DISTINCT FROM 'pending' THEN
        RETURN jsonb_build_object(
            'ok', false, 'error_code', 'recovery_conflict'
        );
    END IF;

    request_value := dlq_row.request_id;
    SELECT * INTO state_row
    FROM dubakwi_service.request_state
    WHERE scope = scope_value AND request_id = request_value
    FOR UPDATE;

    IF NOT FOUND OR state_row.revision IS DISTINCT FROM expected_state_revision
       OR state_row.processing_status IS NULL OR state_row.processing_status NOT IN ('failed', 'unknown')
       OR state_row.execution_id IS DISTINCT FROM original_execution
       OR dlq_row.last_execution_id IS DISTINCT FROM original_execution
       OR state_row.jira_issue_id IS NULL
       OR state_row.jira_issue_id <> dlq_row.jira_issue_id
       OR state_row.jira_issue_key IS DISTINCT FROM dlq_row.jira_issue_key THEN
        RETURN jsonb_build_object(
            'ok', false, 'error_code', 'recovery_conflict'
        );
    END IF;

    mode_value := dlq_row.recovery ->> 'mode';
    action_value := dlq_row.recovery ->> 'action';
    response_value := dlq_row.recovery #> '{args,response}';
    effects_value := dlq_row.effects;
    route_value := response_value ->> 'route';

    IF mode_value IS DISTINCT FROM 'payload' OR action_value IS DISTINCT FROM 'finish'
       OR jsonb_typeof(response_value) IS DISTINCT FROM 'object'
       OR response_value ->> 'request_id' IS DISTINCT FROM state_row.request_id
       OR jsonb_typeof(effects_value) IS DISTINCT FROM 'object'
       OR (effects_value #>> '{created_or_reused,status}') IS DISTINCT FROM 'confirmed'
       OR (effects_value #>> '{context_saved,status}') IS DISTINCT FROM 'confirmed'
       OR (effects_value #>> '{closed,status}') IS NULL
       OR (effects_value #>> '{closed,status}') NOT IN ('confirmed', 'none')
       OR (effects_value #>> '{assigned,status}') IS NULL
       OR (effects_value #>> '{assigned,status}') NOT IN ('confirmed', 'none')
       OR (effects_value #>> '{alert,status}') IS NULL
       OR (effects_value #>> '{alert,status}') NOT IN ('confirmed', 'none')
       OR (route_value = '담당자 이관'
           AND ((effects_value #>> '{assigned,status}') IS DISTINCT FROM 'confirmed'
                OR (effects_value #>> '{alert,status}') IS DISTINCT FROM 'confirmed'))
       OR (route_value = '자동 답변'
           AND (effects_value #>> '{closed,status}') IS DISTINCT FROM 'confirmed')
       OR route_value IS NULL
       OR route_value NOT IN ('자동 답변', '보완 질문', '담당자 이관', '긴급 이관', '거절') THEN
        RETURN jsonb_build_object(
            'ok', false, 'error_code', 'recovery_not_supported'
        );
    END IF;

    UPDATE dubakwi_service.dead_letters
    SET replay_status = 'reprocessing',
        attempts = attempts + 1,
        last_execution_id = recovery_execution,
        revision = revision + 1,
        updated_at = CURRENT_TIMESTAMP
    WHERE scope = scope_value AND dlq_id = dlq_value
      AND revision = expected_dlq_revision AND replay_status = 'pending'
    RETURNING * INTO dlq_row;

    IF dlq_row.dlq_id IS NULL THEN
        RAISE EXCEPTION 'recovery_conflict';
    END IF;

    UPDATE dubakwi_service.request_state
    SET processing_status = 'processing',
        current_step = 'recovery.finish',
        error_code = NULL,
        execution_id = recovery_execution,
        revision = revision + 1,
        updated_at = CURRENT_TIMESTAMP
    WHERE scope = scope_value AND request_id = request_value
      AND revision = expected_state_revision
      AND processing_status IN ('failed', 'unknown')
      AND execution_id = original_execution
    RETURNING * INTO state_row;

    IF state_row.request_id IS NULL THEN
        RAISE EXCEPTION 'recovery_conflict';
    END IF;

    UPDATE dubakwi_service.request_state
    SET processing_status = 'completed',
        current_step = 'respond',
        response = response_value,
        error_code = NULL,
        revision = revision + 1,
        updated_at = CURRENT_TIMESTAMP
    WHERE scope = scope_value AND request_id = request_value
      AND revision = state_row.revision
      AND execution_id = recovery_execution
      AND processing_status = 'processing'
    RETURNING * INTO result_row;

    IF result_row.request_id IS NULL THEN
        RAISE EXCEPTION 'recovery_conflict';
    END IF;

    UPDATE dubakwi_service.dead_letters
    SET replay_status = 'resolved',
        resolution = 'operator:' || operator_value || ':finish response restored after Jira verification',
        resolved_at = CURRENT_TIMESTAMP,
        revision = revision + 1,
        updated_at = CURRENT_TIMESTAMP
    WHERE scope = scope_value AND dlq_id = dlq_value
      AND revision = dlq_row.revision
      AND replay_status = 'reprocessing'
      AND last_execution_id = recovery_execution
    RETURNING * INTO dlq_row;

    IF dlq_row.dlq_id IS NULL THEN
        RAISE EXCEPTION 'recovery_conflict';
    END IF;

    state_ref_value := dubakwi_service.state_ref_json(result_row);
    RETURN jsonb_build_object(
        'ok', true,
        'request_id', request_value,
        'state_ref', state_ref_value,
        'processing_status', result_row.processing_status,
        'state_revision', result_row.revision,
        'dlq_id', dlq_row.dlq_id,
        'replay_status', dlq_row.replay_status,
        'dlq_revision', dlq_row.revision,
        'execution_id', recovery_execution,
        'recovered_action', 'finish',
        'ticket_id', result_row.jira_issue_key,
        'error_code', NULL
    );
EXCEPTION
    WHEN raise_exception THEN
        RETURN jsonb_build_object('ok', false, 'error_code', 'recovery_conflict');
    WHEN unique_violation THEN
        RETURN jsonb_build_object('ok', false, 'error_code', 'recovery_conflict');
    WHEN check_violation OR not_null_violation
         OR invalid_text_representation OR numeric_value_out_of_range THEN
        RETURN jsonb_build_object('ok', false, 'error_code', 'invalid_recovery_request');
END;
$$;

REVOKE ALL ON FUNCTION dubakwi_service.recovery_finish(jsonb) FROM PUBLIC;
GRANT USAGE ON SCHEMA dubakwi_service TO dubakwi_recovery_operator;
GRANT EXECUTE ON FUNCTION dubakwi_service.recovery_finish(jsonb)
    TO dubakwi_recovery_operator;

COMMIT;
