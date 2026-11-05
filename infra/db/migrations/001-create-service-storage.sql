BEGIN;

CREATE SCHEMA IF NOT EXISTS dubakwi_service;

CREATE TABLE dubakwi_service.request_state (
    scope text NOT NULL CHECK (btrim(scope) <> ''),
    request_id varchar(64) NOT NULL CHECK (btrim(request_id) <> ''),
    owner_id text NOT NULL CHECK (btrim(owner_id) <> ''),
    input_hash char(64) NOT NULL CHECK (input_hash ~ '^[0-9a-f]{64}$'),
    case_id text NOT NULL CHECK (btrim(case_id) <> ''),
    first_request_id text NOT NULL CHECK (btrim(first_request_id) <> ''),
    jira_issue_id text CHECK (jira_issue_id IS NULL OR btrim(jira_issue_id) <> ''),
    jira_issue_key text CHECK (jira_issue_key IS NULL OR btrim(jira_issue_key) <> ''),
    processing_status text NOT NULL
        CHECK (processing_status IN ('processing', 'completed', 'failed', 'unknown')),
    current_step text NOT NULL CHECK (btrim(current_step) <> ''),
    response jsonb CHECK (response IS NULL OR jsonb_typeof(response) = 'object'),
    execution_id text CHECK (execution_id IS NULL OR btrim(execution_id) <> ''),
    revision bigint NOT NULL DEFAULT 0 CHECK (revision >= 0),
    created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (scope, request_id),
    CHECK (processing_status <> 'completed' OR response IS NOT NULL)
);

CREATE UNIQUE INDEX request_state_one_active_case_idx
    ON dubakwi_service.request_state (scope, case_id)
    WHERE processing_status IN ('processing', 'failed', 'unknown');

CREATE INDEX request_state_case_lookup_idx
    ON dubakwi_service.request_state (scope, case_id);

CREATE INDEX request_state_status_updated_idx
    ON dubakwi_service.request_state (processing_status, updated_at);

CREATE TABLE dubakwi_service.dead_letters (
    dlq_id text PRIMARY KEY CHECK (btrim(dlq_id) <> ''),
    scope text NOT NULL CHECK (btrim(scope) <> ''),
    failure_key text NOT NULL CHECK (btrim(failure_key) <> ''),
    request_id varchar(64) CHECK (request_id IS NULL OR btrim(request_id) <> ''),
    case_id text CHECK (case_id IS NULL OR btrim(case_id) <> ''),
    jira_issue_id text CHECK (jira_issue_id IS NULL OR btrim(jira_issue_id) <> ''),
    jira_issue_key text CHECK (jira_issue_key IS NULL OR btrim(jira_issue_key) <> ''),
    failed_step text NOT NULL CHECK (btrim(failed_step) <> ''),
    error_code text NOT NULL CHECK (btrim(error_code) <> ''),
    summary text NOT NULL CHECK (btrim(summary) <> ''),
    attempts integer NOT NULL DEFAULT 0 CHECK (attempts >= 0),
    effects jsonb NOT NULL CHECK (jsonb_typeof(effects) = 'object'),
    recovery jsonb NOT NULL CHECK (jsonb_typeof(recovery) = 'object'),
    replay_status text NOT NULL DEFAULT 'pending'
        CHECK (replay_status IN ('pending', 'reprocessing', 'resolved')),
    last_execution_id text
        CHECK (last_execution_id IS NULL OR btrim(last_execution_id) <> ''),
    resolution text CHECK (resolution IS NULL OR btrim(resolution) <> ''),
    revision bigint NOT NULL DEFAULT 0 CHECK (revision >= 0),
    created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    resolved_at timestamptz,
    UNIQUE (scope, failure_key),
    CHECK (
        (replay_status = 'resolved' AND resolution IS NOT NULL AND resolved_at IS NOT NULL)
        OR
        (replay_status <> 'resolved' AND resolved_at IS NULL)
    )
);

CREATE INDEX dead_letters_status_updated_idx
    ON dubakwi_service.dead_letters (replay_status, updated_at);

CREATE INDEX dead_letters_request_lookup_idx
    ON dubakwi_service.dead_letters (scope, request_id);

CREATE INDEX dead_letters_case_lookup_idx
    ON dubakwi_service.dead_letters (scope, case_id);

COMMENT ON TABLE dubakwi_service.request_state IS
    'Minimal request processing state; Jira remains the ticket source of truth.';
COMMENT ON TABLE dubakwi_service.dead_letters IS
    'Failures requiring effect confirmation or controlled recovery.';

COMMIT;
