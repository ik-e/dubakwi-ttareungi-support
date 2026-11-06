BEGIN;

CREATE FUNCTION dubakwi_service.state_ref_json(
    row_value dubakwi_service.request_state
)
RETURNS jsonb
LANGUAGE sql
STABLE
AS $$
    SELECT jsonb_build_object(
        'scope', row_value.scope,
        'request_id', row_value.request_id,
        'owner_id', row_value.owner_id,
        'input_hash', btrim(row_value.input_hash),
        'execution_id', row_value.execution_id,
        'state_revision', row_value.revision
    )
$$;

CREATE FUNCTION dubakwi_service.state_apply(payload jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = pg_catalog, dubakwi_service
AS $$
DECLARE
    op_value text := payload ->> 'op';
    ref_value jsonb := payload -> 'state_ref';
    args_value jsonb := payload -> 'args';
    state_row dubakwi_service.request_state%ROWTYPE;
    request_value jsonb;
    owner_value text;
    scope_value text;
    request_id_value text;
    input_hash_value text;
    execution_value text;
    case_value text;
    expected_revision bigint;
    match_count integer;
BEGIN
    IF jsonb_typeof(payload) <> 'object' OR op_value IS NULL THEN
        RETURN jsonb_build_object(
            'request_id', NULL, 'ok', false, 'skipped', false,
            'state_ref', NULL, 'error_code', 'invalid_state_request'
        );
    END IF;

    IF op_value = 'save' THEN
        args_value := payload;
    END IF;

    IF op_value = 'begin' THEN
        request_value := payload -> 'request';
        scope_value := nullif(btrim(payload ->> 'scope'), '');
        execution_value := nullif(btrim(payload ->> 'execution_id'), '');
        input_hash_value := nullif(btrim(payload ->> 'input_hash'), '');
        owner_value := nullif(btrim(payload #>> '{actor,id}'), '');
        request_id_value := nullif(btrim(request_value ->> 'request_id'), '');

        IF scope_value IS NULL OR execution_value IS NULL
           OR input_hash_value IS NULL
           OR input_hash_value !~ '^[0-9a-f]{64}$'
           OR owner_value IS NULL OR request_id_value IS NULL
           OR length(request_id_value) > 64 THEN
            RETURN jsonb_build_object(
                'request_id', request_id_value, 'mode', 'error',
                'state_ref', NULL, 'support', NULL, 'facts', NULL,
                'response', NULL, 'http_status', 400,
                'error_code', 'invalid_state_request'
            );
        END IF;

        PERFORM pg_advisory_xact_lock(
            hashtextextended(scope_value || ':' || request_id_value, 0)
        );

        SELECT * INTO state_row
        FROM dubakwi_service.request_state
        WHERE scope = scope_value AND request_id = request_id_value;

        IF FOUND THEN
            IF state_row.owner_id <> owner_value
               OR btrim(state_row.input_hash) <> input_hash_value THEN
                RETURN jsonb_build_object(
                    'request_id', request_id_value, 'mode', 'conflict',
                    'state_ref', NULL, 'support', NULL, 'facts', NULL,
                    'response', jsonb_build_object(
                        'error', '요청 식별자가 기존 입력과 충돌합니다.',
                        'codes', jsonb_build_array('request_conflict')
                    ),
                    'http_status', 409, 'error_code', 'request_conflict'
                );
            ELSIF state_row.processing_status = 'completed' THEN
                RETURN jsonb_build_object(
                    'request_id', request_id_value, 'mode', 'replay',
                    'state_ref', NULL, 'support', NULL, 'facts', NULL,
                    'response', state_row.response, 'http_status', 200,
                    'error_code', NULL
                );
            ELSE
                RETURN jsonb_build_object(
                    'request_id', request_id_value, 'mode', 'pending',
                    'state_ref', NULL, 'support', NULL, 'facts', NULL,
                    'response', jsonb_build_object(
                        'error', '기존 요청을 먼저 확인해야 합니다.',
                        'codes', jsonb_build_array(
                            CASE
                                WHEN state_row.processing_status = 'processing'
                                    THEN 'request_in_progress'
                                ELSE 'request_requires_review'
                            END
                        )
                    ),
                    'http_status', 409,
                    'error_code', CASE
                        WHEN state_row.processing_status = 'processing'
                            THEN 'request_in_progress'
                        ELSE 'request_requires_review'
                    END
                );
            END IF;
        END IF;

        IF nullif(btrim(request_value ->> 'case_ref'), '') IS NOT NULL THEN
            RETURN jsonb_build_object(
                'request_id', request_id_value, 'mode', 'error',
                'state_ref', NULL, 'support', NULL, 'facts', NULL,
                'response', NULL, 'http_status', 503,
                'error_code', 'case_verification_required'
            );
        END IF;

        case_value := 'case-' || md5(scope_value || ':' || request_id_value);

        INSERT INTO dubakwi_service.request_state (
            scope, request_id, owner_id, input_hash, case_id,
            first_request_id, processing_status, current_step, execution_id
        ) VALUES (
            scope_value, request_id_value, owner_value, input_hash_value,
            case_value, request_id_value, 'processing', 'begin', execution_value
        )
        RETURNING * INTO state_row;

        RETURN jsonb_build_object(
            'request_id', request_id_value,
            'mode', 'proceed',
            'state_ref', dubakwi_service.state_ref_json(state_row),
            'support', jsonb_build_object(
                'case_id', case_value,
                'owner_id', owner_value,
                'ticket_id', NULL,
                'first_request_id', request_id_value,
                'attempt', greatest(
                    1,
                    CASE
                        WHEN coalesce(request_value ->> 'attempt', '') ~ '^[0-9]+$'
                            THEN (request_value ->> 'attempt')::integer
                        ELSE 1
                    END
                ),
                'version', NULL,
                'status', 'received'
            ),
            'facts', jsonb_build_object(
                'summary', '', 'reported', jsonb_build_array(),
                'confirmed', jsonb_build_array(),
                'attempted_actions', jsonb_build_array(),
                'missing', jsonb_build_array(),
                'uncertainties', jsonb_build_array(),
                'evidence_refs', jsonb_build_array()
            ),
            'response', NULL,
            'http_status', 200,
            'error_code', NULL
        );
    END IF;

    IF op_value = 'fail'
       AND (ref_value IS NULL OR jsonb_typeof(ref_value) = 'null') THEN
        scope_value := nullif(btrim(payload ->> 'scope'), '');
        execution_value := nullif(btrim(payload ->> 'execution_id'), '');
        IF scope_value IS NULL OR execution_value IS NULL
           OR jsonb_typeof(args_value) <> 'object'
           OR coalesce(args_value ->> 'status', '') NOT IN ('failed', 'unknown')
           OR nullif(btrim(args_value ->> 'current_step'), '') IS NULL
           OR nullif(btrim(args_value ->> 'error_code'), '') IS NULL THEN
            RETURN jsonb_build_object(
                'request_id', NULL, 'ok', false, 'skipped', false,
                'state_ref', NULL, 'error_code', 'invalid_state_request'
            );
        END IF;
        SELECT count(*) INTO match_count
        FROM dubakwi_service.request_state
        WHERE scope = scope_value
          AND execution_id = execution_value
          AND processing_status = 'processing';

        IF match_count <> 1 THEN
            RETURN jsonb_build_object(
                'request_id', NULL, 'ok', true, 'skipped', true,
                'state_ref', NULL, 'error_code', NULL
            );
        END IF;

        UPDATE dubakwi_service.request_state
        SET processing_status = args_value ->> 'status',
            current_step = args_value ->> 'current_step',
            error_code = args_value ->> 'error_code',
            revision = revision + 1,
            updated_at = CURRENT_TIMESTAMP
        WHERE scope = scope_value
          AND execution_id = execution_value
          AND processing_status = 'processing'
        RETURNING * INTO state_row;
    ELSE
        scope_value := nullif(btrim(ref_value ->> 'scope'), '');
        request_id_value := nullif(btrim(ref_value ->> 'request_id'), '');
        owner_value := nullif(btrim(ref_value ->> 'owner_id'), '');
        input_hash_value := nullif(btrim(ref_value ->> 'input_hash'), '');
        execution_value := nullif(btrim(ref_value ->> 'execution_id'), '');

        BEGIN
            expected_revision := (ref_value ->> 'state_revision')::bigint;
        EXCEPTION WHEN invalid_text_representation THEN
            expected_revision := NULL;
        END;

        IF scope_value IS NULL OR request_id_value IS NULL
           OR owner_value IS NULL OR input_hash_value IS NULL
           OR execution_value IS NULL OR expected_revision IS NULL
           OR jsonb_typeof(args_value) <> 'object' THEN
            RETURN jsonb_build_object(
                'request_id', request_id_value, 'ok', false,
                'skipped', false, 'state_ref', NULL,
                'error_code', 'invalid_state_request'
            );
        END IF;

        IF op_value = 'prepare' THEN
            UPDATE dubakwi_service.request_state
            SET current_step = args_value ->> 'current_step',
                revision = revision + 1,
                updated_at = CURRENT_TIMESTAMP
            WHERE scope = scope_value AND request_id = request_id_value
              AND owner_id = owner_value AND input_hash = input_hash_value
              AND execution_id = execution_value AND revision = expected_revision
              AND processing_status = 'processing'
              AND nullif(btrim(args_value ->> 'current_step'), '') IS NOT NULL
            RETURNING * INTO state_row;
        ELSIF op_value = 'bind' THEN
            UPDATE dubakwi_service.request_state
            SET jira_issue_id = args_value ->> 'jira_issue_id',
                jira_issue_key = coalesce(args_value ->> 'jira_issue_key', args_value ->> 'key'),
                case_id = args_value ->> 'case_id',
                first_request_id = args_value ->> 'first_request_id',
                current_step = args_value ->> 'next_step',
                revision = revision + 1,
                updated_at = CURRENT_TIMESTAMP
            WHERE scope = scope_value AND request_id = request_id_value
              AND owner_id = owner_value AND input_hash = input_hash_value
              AND execution_id = execution_value AND revision = expected_revision
              AND processing_status = 'processing'
              AND nullif(btrim(args_value ->> 'jira_issue_id'), '') IS NOT NULL
              AND nullif(btrim(coalesce(args_value ->> 'jira_issue_key', args_value ->> 'key')), '') IS NOT NULL
            RETURNING * INTO state_row;
        ELSIF op_value = 'finish' THEN
            UPDATE dubakwi_service.request_state
            SET processing_status = 'completed',
                current_step = 'respond',
                response = args_value -> 'response',
                error_code = NULL,
                revision = revision + 1,
                updated_at = CURRENT_TIMESTAMP
            WHERE scope = scope_value AND request_id = request_id_value
              AND owner_id = owner_value AND input_hash = input_hash_value
              AND execution_id = execution_value AND revision = expected_revision
              AND processing_status = 'processing'
              AND jsonb_typeof(args_value -> 'response') = 'object'
            RETURNING * INTO state_row;
        ELSIF op_value = 'save' THEN
            SELECT * INTO state_row
            FROM dubakwi_service.request_state
            WHERE scope = scope_value AND request_id = request_id_value
              AND owner_id = owner_value AND input_hash = input_hash_value
              AND execution_id = execution_value AND revision = expected_revision
              AND processing_status = 'processing'
              AND case_id = payload ->> 'case_id'
              AND jira_issue_key = payload ->> 'ticket_id'
              AND jsonb_typeof(payload -> 'response') = 'object';

            IF state_row.request_id IS NOT NULL THEN
                RETURN jsonb_build_object(
                    'request_id', state_row.request_id,
                    'ok', false,
                    'state_ref', dubakwi_service.state_ref_json(state_row),
                    'error_code', 'tickets_down',
                    'recovery', jsonb_build_object(
                        'version', 1,
                        'mode', 'manual_required',
                        'action', 'finish',
                        'args', NULL,
                        'reference', NULL,
                        'reason', 'Jira context/version update is not verified'
                    )
                );
            END IF;
        ELSIF op_value = 'fail' THEN
            UPDATE dubakwi_service.request_state
            SET processing_status = args_value ->> 'status',
                current_step = args_value ->> 'current_step',
                error_code = args_value ->> 'error_code',
                revision = revision + 1,
                updated_at = CURRENT_TIMESTAMP
            WHERE scope = scope_value AND request_id = request_id_value
              AND owner_id = owner_value AND input_hash = input_hash_value
              AND execution_id = execution_value AND revision = expected_revision
              AND processing_status = 'processing'
              AND args_value ->> 'status' IN ('failed', 'unknown')
              AND nullif(btrim(args_value ->> 'error_code'), '') IS NOT NULL
            RETURNING * INTO state_row;
        ELSE
            RETURN jsonb_build_object(
                'request_id', request_id_value, 'ok', false,
                'skipped', false, 'state_ref', NULL,
                'error_code', 'invalid_state_request'
            );
        END IF;
    END IF;

    IF state_row.request_id IS NULL THEN
        RETURN jsonb_build_object(
            'request_id', request_id_value, 'ok', false,
            'skipped', false, 'state_ref', NULL,
            'error_code', 'state_conflict'
        );
    END IF;

    RETURN jsonb_build_object(
        'request_id', state_row.request_id, 'ok', true, 'skipped', false,
        'state_ref', dubakwi_service.state_ref_json(state_row),
        'error_code', NULL
    );
EXCEPTION
    WHEN unique_violation THEN
        RETURN jsonb_build_object(
            'request_id', request_id_value, 'ok', false,
            'skipped', false, 'state_ref', NULL,
            'error_code', 'state_conflict'
        );
    WHEN check_violation OR not_null_violation
         OR invalid_text_representation OR numeric_value_out_of_range THEN
        RETURN jsonb_build_object(
            'request_id', request_id_value, 'ok', false,
            'skipped', false, 'state_ref', NULL,
            'error_code', 'invalid_state_request'
        );
END;
$$;

CREATE FUNCTION dubakwi_service.dlq_apply(payload jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = pg_catalog, dubakwi_service
AS $$
DECLARE
    op_value text := payload ->> 'op';
    scope_value text := nullif(btrim(payload ->> 'scope'), '');
    failure_value text;
    dlq_value text;
    expected_revision bigint;
    existing_row dubakwi_service.dead_letters%ROWTYPE;
    result_row dubakwi_service.dead_letters%ROWTYPE;
BEGIN
    IF jsonb_typeof(payload) <> 'object' OR scope_value IS NULL THEN
        RETURN jsonb_build_object(
            'ok', false, 'dlq_id', NULL, 'deduplicated', false,
            'error_code', 'invalid_dlq_request'
        );
    END IF;

    IF op_value = 'put' THEN
        failure_value := md5(concat_ws('|', scope_value,
            coalesce(payload ->> '_dedupe_ref', payload ->> 'request_id', payload ->> 'last_execution_id', ''),
            payload ->> 'failed_step', payload ->> 'error_code'));
        dlq_value := 'dlq-' || failure_value;

        PERFORM pg_advisory_xact_lock(
            hashtextextended(scope_value || ':' || failure_value, 0)
        );

        SELECT * INTO existing_row
        FROM dubakwi_service.dead_letters
        WHERE scope = scope_value AND failure_key = failure_value
        FOR UPDATE;

        IF FOUND THEN
            IF existing_row.replay_status = 'reprocessing' THEN
                RETURN jsonb_build_object(
                    'ok', true,
                    'dlq_id', existing_row.dlq_id,
                    'deduplicated', true,
                    'error_code', NULL
                );
            END IF;

            UPDATE dubakwi_service.dead_letters
            SET request_id = coalesce(payload ->> 'request_id', request_id),
                case_id = coalesce(payload ->> 'case_id', case_id),
                jira_issue_id = coalesce(payload ->> 'jira_issue_id', jira_issue_id),
                jira_issue_key = coalesce(payload ->> 'jira_issue_key', jira_issue_key),
                failed_step = payload ->> 'failed_step',
                error_code = payload ->> 'error_code',
                summary = payload ->> 'summary',
                attempts = greatest(attempts, coalesce((payload ->> 'attempts')::integer, 0)),
                effects = payload -> 'effects',
                recovery = payload -> 'recovery',
                replay_status = 'pending',
                last_execution_id = payload ->> 'last_execution_id',
                resolution = NULL,
                resolved_at = NULL,
                revision = revision + 1,
                updated_at = CURRENT_TIMESTAMP
            WHERE scope = scope_value AND failure_key = failure_value
            RETURNING * INTO result_row;
        ELSE
            INSERT INTO dubakwi_service.dead_letters (
                dlq_id, scope, failure_key, request_id, case_id,
                jira_issue_id, jira_issue_key, failed_step, error_code,
                summary, attempts, effects, recovery, last_execution_id
            ) VALUES (
                dlq_value, scope_value, failure_value, payload ->> 'request_id',
                payload ->> 'case_id', payload ->> 'jira_issue_id',
                payload ->> 'jira_issue_key', payload ->> 'failed_step',
                payload ->> 'error_code', payload ->> 'summary',
                coalesce((payload ->> 'attempts')::integer, 0),
                payload -> 'effects', payload -> 'recovery',
                payload ->> 'last_execution_id'
            ) RETURNING * INTO result_row;
        END IF;

        RETURN jsonb_build_object(
            'ok', true, 'dlq_id', result_row.dlq_id,
            'deduplicated', existing_row.dlq_id IS NOT NULL,
            'error_code', NULL
        );
    END IF;

    BEGIN
        expected_revision := (payload ->> 'expected_revision')::bigint;
    EXCEPTION WHEN invalid_text_representation THEN
        expected_revision := NULL;
    END;

    dlq_value := nullif(btrim(payload ->> 'dlq_id'), '');
    IF dlq_value IS NULL OR expected_revision IS NULL THEN
        RETURN jsonb_build_object(
            'ok', false, 'dlq_id', dlq_value, 'deduplicated', false,
            'error_code', 'invalid_dlq_request'
        );
    END IF;

    IF op_value = 'claim' THEN
        UPDATE dubakwi_service.dead_letters
        SET replay_status = 'reprocessing',
            attempts = attempts + 1,
            last_execution_id = payload ->> 'execution_id',
            revision = revision + 1,
            updated_at = CURRENT_TIMESTAMP
        WHERE scope = scope_value AND dlq_id = dlq_value
          AND revision = expected_revision AND replay_status = 'pending'
        RETURNING * INTO result_row;
    ELSIF op_value = 'resolve' THEN
        UPDATE dubakwi_service.dead_letters
        SET replay_status = 'resolved',
            resolution = payload ->> 'resolution',
            resolved_at = CURRENT_TIMESTAMP,
            last_execution_id = payload ->> 'execution_id',
            revision = revision + 1,
            updated_at = CURRENT_TIMESTAMP
        WHERE scope = scope_value AND dlq_id = dlq_value
          AND revision = expected_revision AND replay_status = 'reprocessing'
          AND nullif(btrim(payload ->> 'resolution'), '') IS NOT NULL
        RETURNING * INTO result_row;
    ELSE
        RETURN jsonb_build_object(
            'ok', false, 'dlq_id', dlq_value, 'deduplicated', false,
            'error_code', 'invalid_dlq_request'
        );
    END IF;

    IF result_row.dlq_id IS NULL THEN
        RETURN jsonb_build_object(
            'ok', false, 'dlq_id', dlq_value, 'deduplicated', false,
            'error_code', 'dlq_conflict'
        );
    END IF;

    RETURN jsonb_build_object(
        'ok', true, 'dlq_id', result_row.dlq_id,
        'deduplicated', false, 'error_code', NULL
    );
EXCEPTION
    WHEN unique_violation THEN
        RETURN jsonb_build_object(
            'ok', false, 'dlq_id', dlq_value, 'deduplicated', false,
            'error_code', 'dlq_conflict'
        );
    WHEN check_violation OR not_null_violation
         OR invalid_text_representation OR numeric_value_out_of_range THEN
        RETURN jsonb_build_object(
            'ok', false, 'dlq_id', dlq_value, 'deduplicated', false,
            'error_code', 'invalid_dlq_request'
        );
END;
$$;

COMMIT;
