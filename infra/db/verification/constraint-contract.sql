\set ON_ERROR_STOP on

BEGIN;

CREATE FUNCTION pg_temp.expect_rejected(label text, statement text)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
    BEGIN
        EXECUTE statement;
    EXCEPTION
        WHEN check_violation OR unique_violation OR string_data_right_truncation THEN
            RETURN;
    END;
    RAISE EXCEPTION 'expected rejection did not occur: %', label;
END;
$$;

SELECT pg_temp.expect_rejected(
    '65-character request_id',
    $sql$INSERT INTO dubakwi_service.request_state
        (scope, request_id, owner_id, input_hash, case_id, first_request_id,
         processing_status, current_step)
    VALUES
        ('verify', repeat('r', 65), 'citizen-a', repeat('a', 64),
         'case-long-id', 'first-long-id', 'processing', 'begin')$sql$
);

SELECT pg_temp.expect_rejected(
    'uppercase input_hash',
    $sql$INSERT INTO dubakwi_service.request_state
        (scope, request_id, owner_id, input_hash, case_id, first_request_id,
         processing_status, current_step)
    VALUES
        ('verify', 'req-uppercase', 'citizen-a', repeat('A', 64),
         'case-uppercase', 'req-uppercase', 'processing', 'begin')$sql$
);

SELECT pg_temp.expect_rejected(
    'short input_hash',
    $sql$INSERT INTO dubakwi_service.request_state
        (scope, request_id, owner_id, input_hash, case_id, first_request_id,
         processing_status, current_step)
    VALUES
        ('verify', 'req-short-hash', 'citizen-a', repeat('a', 63),
         'case-short-hash', 'req-short-hash', 'processing', 'begin')$sql$
);

SELECT pg_temp.expect_rejected(
    'whitespace-only required value',
    $sql$INSERT INTO dubakwi_service.request_state
        (scope, request_id, owner_id, input_hash, case_id, first_request_id,
         processing_status, current_step)
    VALUES
        ('verify', 'req-whitespace', '   ', repeat('a', 64),
         'case-whitespace', 'req-whitespace', 'processing', 'begin')$sql$
);

SELECT pg_temp.expect_rejected(
    'non-object response',
    $sql$INSERT INTO dubakwi_service.request_state
        (scope, request_id, owner_id, input_hash, case_id, first_request_id,
         processing_status, current_step, response)
    VALUES
        ('verify', 'req-array-response', 'citizen-a', repeat('a', 64),
         'case-array-response', 'req-array-response', 'completed', 'respond', '[]')$sql$
);

SELECT pg_temp.expect_rejected(
    'failed state without error_code',
    $sql$INSERT INTO dubakwi_service.request_state
        (scope, request_id, owner_id, input_hash, case_id, first_request_id,
         processing_status, current_step)
    VALUES
        ('verify', 'req-failed-code', 'citizen-a', repeat('a', 64),
         'case-failed-code', 'req-failed-code', 'failed', 'jira_create')$sql$
);

SELECT pg_temp.expect_rejected(
    'invalid processing_status',
    $sql$INSERT INTO dubakwi_service.request_state
        (scope, request_id, owner_id, input_hash, case_id, first_request_id,
         processing_status, current_step)
    VALUES
        ('verify', 'req-invalid-status', 'citizen-a', repeat('a', 64),
         'case-invalid-status', 'req-invalid-status', 'done', 'respond')$sql$
);

SELECT pg_temp.expect_rejected(
    'negative revision',
    $sql$INSERT INTO dubakwi_service.request_state
        (scope, request_id, owner_id, input_hash, case_id, first_request_id,
         processing_status, current_step, revision)
    VALUES
        ('verify', 'req-negative-revision', 'citizen-a', repeat('a', 64),
         'case-negative-revision', 'req-negative-revision', 'processing',
         'begin', -1)$sql$
);

SELECT pg_temp.expect_rejected(
    'completed state without response',
    $sql$INSERT INTO dubakwi_service.request_state
        (scope, request_id, owner_id, input_hash, case_id, first_request_id,
         processing_status, current_step)
    VALUES
        ('verify', 'req-completed-no-response', 'citizen-a', repeat('a', 64),
         'case-completed-no-response', 'req-completed-no-response',
         'completed', 'respond')$sql$
);

SELECT pg_temp.expect_rejected(
    'resolved DLQ without resolution and resolved_at',
    $sql$INSERT INTO dubakwi_service.dead_letters
        (dlq_id, scope, failure_key, failed_step, error_code, summary,
         effects, recovery, replay_status)
    VALUES
        ('dlq-resolved-missing', 'verify', 'resolved-missing', 'jira_create',
         'tickets_down', 'synthetic verification', '{}', '{}', 'resolved')$sql$
);

SELECT pg_temp.expect_rejected(
    'pending DLQ with resolved_at',
    $sql$INSERT INTO dubakwi_service.dead_letters
        (dlq_id, scope, failure_key, failed_step, error_code, summary,
         effects, recovery, replay_status, resolved_at)
    VALUES
        ('dlq-pending-resolved-at', 'verify', 'pending-resolved-at',
         'jira_create', 'tickets_down', 'synthetic verification', '{}', '{}',
         'pending', CURRENT_TIMESTAMP)$sql$
);

INSERT INTO dubakwi_service.request_state
    (scope, request_id, owner_id, input_hash, case_id, first_request_id,
     processing_status, current_step)
VALUES
    ('verify', 'req-active-first', 'citizen-a', repeat('a', 64),
     'case-active', 'req-active-first', 'processing', 'begin');

SELECT pg_temp.expect_rejected(
    'duplicate request key',
    $sql$INSERT INTO dubakwi_service.request_state
        (scope, request_id, owner_id, input_hash, case_id, first_request_id,
         processing_status, current_step)
    VALUES
        ('verify', 'req-active-first', 'citizen-a', repeat('a', 64),
         'case-duplicate-request', 'req-active-first', 'processing', 'begin')$sql$
);

SELECT pg_temp.expect_rejected(
    'second active request for the same case',
    $sql$INSERT INTO dubakwi_service.request_state
        (scope, request_id, owner_id, input_hash, case_id, first_request_id,
         processing_status, current_step, error_code)
    VALUES
        ('verify', 'req-active-second', 'citizen-a', repeat('b', 64),
         'case-active', 'req-active-first', 'unknown', 'jira_create',
         'ticket_unknown')$sql$
);

INSERT INTO dubakwi_service.request_state
    (scope, request_id, owner_id, input_hash, case_id, first_request_id,
     processing_status, current_step, response)
VALUES
    ('verify', 'req-completed-first', 'citizen-a', repeat('c', 64),
     'case-reusable', 'req-completed-first', 'completed', 'respond', '{}');

INSERT INTO dubakwi_service.request_state
    (scope, request_id, owner_id, input_hash, case_id, first_request_id,
     processing_status, current_step)
VALUES
    ('verify', 'req-after-completed', 'citizen-a', repeat('d', 64),
     'case-reusable', 'req-completed-first', 'processing', 'begin');

INSERT INTO dubakwi_service.dead_letters
    (dlq_id, scope, failure_key, failed_step, error_code, summary,
     effects, recovery)
VALUES
    ('dlq-duplicate-first', 'verify', 'duplicate-failure', 'jira_create',
     'tickets_down', 'synthetic verification', '{}', '{}');

SELECT pg_temp.expect_rejected(
    'duplicate DLQ failure key',
    $sql$INSERT INTO dubakwi_service.dead_letters
        (dlq_id, scope, failure_key, failed_step, error_code, summary,
         effects, recovery)
    VALUES
        ('dlq-duplicate-second', 'verify', 'duplicate-failure', 'jira_create',
         'tickets_down', 'synthetic verification', '{}', '{}')$sql$
);

ROLLBACK;
