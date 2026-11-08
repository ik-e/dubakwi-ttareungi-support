-- Read-only, bounded list/inspect branch for the existing manual recovery operator workflow.
BEGIN;

CREATE FUNCTION dubakwi_service.recovery_list(payload jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, dubakwi_service
AS $$
DECLARE
    scope_value text := nullif(btrim(payload ->> 'scope'), '');
    limit_value integer;
    offset_value integer;
    item_values jsonb;
    has_more_value boolean;
BEGIN
    IF jsonb_typeof(payload) IS DISTINCT FROM 'object'
       OR payload ->> 'op' IS DISTINCT FROM 'list'
       OR scope_value IS NULL
       OR (payload - 'op' - 'scope' - 'limit' - 'offset') <> '{}'::jsonb THEN
        RETURN jsonb_build_object('ok', false, 'error_code', 'invalid_recovery_list_request');
    END IF;

    BEGIN
        limit_value := COALESCE((payload ->> 'limit')::integer, 20);
        offset_value := COALESCE((payload ->> 'offset')::integer, 0);
    EXCEPTION WHEN invalid_text_representation OR numeric_value_out_of_range THEN
        RETURN jsonb_build_object('ok', false, 'error_code', 'invalid_recovery_list_request');
    END;

    IF limit_value < 1 OR limit_value > 50 OR offset_value < 0 OR offset_value > 10000 THEN
        RETURN jsonb_build_object('ok', false, 'error_code', 'invalid_recovery_list_request');
    END IF;

    WITH page AS (
        SELECT dlq_id, request_id, case_id, jira_issue_id, jira_issue_key,
               failed_step, error_code, replay_status, last_execution_id,
               revision, updated_at
        FROM dubakwi_service.dead_letters
        WHERE scope = scope_value AND replay_status IN ('pending', 'reprocessing')
        ORDER BY updated_at DESC, dlq_id
        LIMIT limit_value + 1 OFFSET offset_value
    ), numbered AS (
        SELECT page.*, row_number() OVER (ORDER BY updated_at DESC, dlq_id) AS page_row
        FROM page
    )
    SELECT COALESCE(jsonb_agg(
               jsonb_build_object(
                   'dlq_id', dlq_id,
                   'request_id', request_id,
                   'case_id', case_id,
                   'jira_issue_id', jira_issue_id,
                   'jira_issue_key', jira_issue_key,
                   'failed_step', failed_step,
                   'error_code', error_code,
                   'replay_status', replay_status,
                   'last_execution_id', last_execution_id,
                   'revision', revision,
                   'updated_at', updated_at
               ) ORDER BY updated_at DESC, dlq_id
           ) FILTER (WHERE page_row <= limit_value), '[]'::jsonb),
           count(*) > limit_value
      INTO item_values, has_more_value
    FROM numbered;

    RETURN jsonb_build_object(
        'ok', true,
        'scope', scope_value,
        'limit', limit_value,
        'offset', offset_value,
        'has_more', has_more_value,
        'items', item_values
    );
END;
$$;

REVOKE ALL ON FUNCTION dubakwi_service.recovery_list(jsonb) FROM PUBLIC;
GRANT USAGE ON SCHEMA dubakwi_service TO dubakwi_recovery_operator;

CREATE FUNCTION dubakwi_service.recovery_lookup(payload jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, dubakwi_service
AS $$
DECLARE
    inspect_value jsonb;
BEGIN
    IF jsonb_typeof(payload) IS DISTINCT FROM 'object' THEN
        RETURN jsonb_build_object('ok', false, 'error_code', 'invalid_dlq_lookup_request');
    END IF;
    CASE payload ->> 'op'
        WHEN 'list' THEN
            RETURN dubakwi_service.recovery_list(payload);
        WHEN 'inspect' THEN
            IF (payload - 'op' - 'scope' - 'dlq_id' - 'operator_id') <> '{}'::jsonb
               OR NOT (payload ?& ARRAY['op', 'scope', 'dlq_id', 'operator_id']) THEN
                RETURN jsonb_build_object('ok', false, 'error_code', 'invalid_dlq_lookup_request');
            END IF;
            inspect_value := dubakwi_service.recovery_finish(payload);
            IF inspect_value ->> 'ok' IS DISTINCT FROM 'true' THEN
                RETURN jsonb_build_object(
                    'ok', false,
                    'error_code', COALESCE(inspect_value ->> 'error_code', 'dlq_inspect_failed')
                );
            END IF;
            RETURN jsonb_build_object(
                'ok', true,
                'dlq', jsonb_build_object(
                    'dlq_id', inspect_value #>> '{dlq,dlq_id}',
                    'scope', inspect_value #>> '{dlq,scope}',
                    'request_id', inspect_value #>> '{dlq,request_id}',
                    'case_id', inspect_value #>> '{dlq,case_id}',
                    'jira_issue_id', inspect_value #>> '{dlq,jira_issue_id}',
                    'jira_issue_key', inspect_value #>> '{dlq,jira_issue_key}',
                    'failed_step', inspect_value #>> '{dlq,failed_step}',
                    'error_code', inspect_value #>> '{dlq,error_code}',
                    'replay_status', inspect_value #>> '{dlq,replay_status}',
                    'last_execution_id', inspect_value #>> '{dlq,last_execution_id}',
                    'revision', (inspect_value #>> '{dlq,revision}')::bigint
                ),
                'state', jsonb_build_object(
                    'processing_status', inspect_value #>> '{state,processing_status}',
                    'jira_issue_key', inspect_value #>> '{state,jira_issue_key}',
                    'revision', (inspect_value #>> '{state,revision}')::bigint
                )
            );
        ELSE
            RETURN jsonb_build_object('ok', false, 'error_code', 'invalid_dlq_lookup_request');
    END CASE;
END;
$$;
REVOKE ALL ON FUNCTION dubakwi_service.recovery_lookup(jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION dubakwi_service.recovery_lookup(jsonb)
    TO dubakwi_recovery_operator;

COMMIT;
