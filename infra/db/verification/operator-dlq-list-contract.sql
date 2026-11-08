-- Run after migrations 001~017 in a disposable database. All fixtures roll back.
BEGIN;

INSERT INTO dubakwi_service.dead_letters (
    dlq_id, scope, failure_key, request_id, case_id, jira_issue_id, jira_issue_key,
    failed_step, error_code, summary, effects, recovery, replay_status, revision,
    updated_at, resolved_at, resolution
) VALUES
    ('tc07-list-pending', 'tc07-list-contract', 'pending', 'req-pending', 'case-pending',
     '10042', 'JBYS-42', 'H05', 'jira_timeout', 'synthetic summary', '{}'::jsonb,
     '{"mode":"payload","args":{"private":"omit"}}'::jsonb, 'pending', 2,
     '2026-11-08 01:00:00+09', NULL, NULL),
    ('tc07-list-processing', 'tc07-list-contract', 'processing', 'req-processing', 'case-processing',
     NULL, NULL, 'H09', 'jira_timeout', 'synthetic summary', '{}'::jsonb, '{}'::jsonb,
     'reprocessing', 3, '2026-11-08 00:00:00+09', NULL, NULL),
    ('tc07-list-resolved', 'tc07-list-contract', 'resolved', 'req-resolved', 'case-resolved',
     NULL, NULL, 'H05', 'jira_timeout', 'synthetic summary', '{}'::jsonb, '{}'::jsonb,
     'resolved', 4, '2026-11-08 02:00:00+09', '2026-11-08 02:00:00+09', 'synthetic');

INSERT INTO dubakwi_service.request_state (
    scope, request_id, owner_id, input_hash, case_id, first_request_id,
    jira_issue_id, jira_issue_key, processing_status, current_step,
    error_code, execution_id, revision
) VALUES (
    'tc07-list-contract', 'req-pending', 'synthetic-owner', repeat('a', 64),
    'case-pending', 'req-pending', '10042', 'JBYS-42', 'failed', 'H05',
    'jira_timeout', 'exec-pending', 3
);

DO $$
DECLARE
    page_one jsonb;
    page_two jsonb;
    invalid_page jsonb;
BEGIN
    page_one := dubakwi_service.recovery_lookup(
        '{"op":"list","scope":"tc07-list-contract","limit":1,"offset":0}'::jsonb
    );
    IF page_one ->> 'ok' <> 'true'
       OR page_one ->> 'has_more' <> 'true'
       OR jsonb_array_length(page_one -> 'items') <> 1
       OR page_one #>> '{items,0,dlq_id}' <> 'tc07-list-pending'
       OR page_one #>> '{items,0,jira_issue_key}' <> 'JBYS-42'
       OR page_one::text LIKE '%private%'
       OR page_one::text LIKE '%summary%' THEN
        RAISE EXCEPTION 'bounded read-only list first page mismatch: %', page_one;
    END IF;

    page_two := dubakwi_service.recovery_lookup(
        '{"op":"list","scope":"tc07-list-contract","limit":1,"offset":1}'::jsonb
    );
    IF page_two ->> 'ok' <> 'true'
       OR page_two ->> 'has_more' <> 'false'
       OR jsonb_array_length(page_two -> 'items') <> 1
       OR page_two #>> '{items,0,dlq_id}' <> 'tc07-list-processing' THEN
        RAISE EXCEPTION 'bounded read-only list second page mismatch: %', page_two;
    END IF;

    invalid_page := dubakwi_service.recovery_lookup(
        '{"op":"list","scope":"tc07-list-contract","limit":51}'::jsonb
    );
    IF invalid_page ->> 'ok' <> 'false'
       OR invalid_page ->> 'error_code' <> 'invalid_recovery_list_request' THEN
        RAISE EXCEPTION 'out-of-range list request was not denied: %', invalid_page;
    END IF;
END;
$$;

DO $$
BEGIN
    IF has_function_privilege('dubakwi_dlq_reader', 'dubakwi_service.recovery_lookup(jsonb)', 'EXECUTE') IS DISTINCT FROM true
       OR has_function_privilege('dubakwi_dlq_reader', 'dubakwi_service.recovery_list(jsonb)', 'EXECUTE') IS DISTINCT FROM false
       OR has_function_privilege('dubakwi_dlq_reader', 'dubakwi_service.recovery_control(jsonb)', 'EXECUTE') IS DISTINCT FROM false
       OR has_function_privilege('dubakwi_runtime', 'dubakwi_service.recovery_lookup(jsonb)', 'EXECUTE') IS DISTINCT FROM false
       OR has_function_privilege('dubakwi_runtime', 'dubakwi_service.recovery_control(jsonb)', 'EXECUTE') IS DISTINCT FROM false THEN
        RAISE EXCEPTION 'lookup/recovery function grants are broader than intended';
    END IF;
    IF EXISTS (
        SELECT 1 FROM pg_roles
        WHERE rolname = 'dubakwi_dlq_reader'
          AND (rolcanlogin OR rolsuper OR rolcreatedb OR rolcreaterole OR rolinherit)
    ) THEN
        RAISE EXCEPTION 'read-only role must remain NOLOGIN and nonprivileged';
    END IF;
END;
$$;

SET LOCAL ROLE dubakwi_dlq_reader;
DO $$
DECLARE
    result jsonb;
BEGIN
    result := dubakwi_service.recovery_lookup(
        '{"op":"list","scope":"tc07-list-contract","limit":10,"offset":0}'::jsonb
    );
    IF result ->> 'ok' <> 'true' OR jsonb_array_length(result -> 'items') <> 2 THEN
        RAISE EXCEPTION 'reader role could not list unresolved items: %', result;
    END IF;
    result := dubakwi_service.recovery_lookup(
        '{"op":"inspect","scope":"tc07-list-contract","dlq_id":"tc07-list-pending","operator_id":"synthetic-reader"}'::jsonb
    );
    IF result ->> 'ok' <> 'true'
       OR result #>> '{dlq,jira_issue_key}' <> 'JBYS-42'
       OR result #>> '{state,processing_status}' <> 'failed'
       OR result::text LIKE '%synthetic-owner%'
       OR result::text LIKE '%recovery%'
       OR result::text LIKE '%effects%'
       OR result::text LIKE '%response%' THEN
        RAISE EXCEPTION 'reader role could not inspect a selected DLQ: %', result;
    END IF;
    result := dubakwi_service.recovery_lookup(
        '{"op":"claim","scope":"tc07-list-contract"}'::jsonb
    );
    IF result ->> 'ok' <> 'false'
       OR result ->> 'error_code' <> 'invalid_dlq_lookup_request' THEN
        RAISE EXCEPTION 'read-only dispatcher accepted a recovery action: %', result;
    END IF;
    IF has_table_privilege(current_user, 'dubakwi_service.dead_letters', 'SELECT') THEN
        RAISE EXCEPTION 'reader role must not SELECT the DLQ table directly';
    END IF;
END;
$$;

ROLLBACK;
