-- 기존 001~006 적용 환경에서 alert_marker DLQ를 case 단위로 중복 제거한다.
BEGIN;

CREATE OR REPLACE FUNCTION dubakwi_service.dlq_apply(payload jsonb)
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
