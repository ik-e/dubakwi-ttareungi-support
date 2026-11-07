-- Issue a fresh StateRef after a successful operator claim and make a failed
-- recovery attempt safely releasable. External effects are still driven by n8n.
BEGIN;

CREATE FUNCTION dubakwi_service.recovery_resume(payload jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, dubakwi_service
AS $$
DECLARE
    scope_value text := nullif(btrim(payload ->> 'scope'), '');
    dlq_value text := nullif(btrim(payload ->> 'dlq_id'), '');
    owner_value text := nullif(btrim(payload ->> 'owner_id'), '');
    input_hash_value text := nullif(btrim(payload ->> 'input_hash'), '');
    original_execution text := nullif(btrim(payload ->> 'original_execution_id'), '');
    recovery_execution text := nullif(btrim(payload ->> 'recovery_execution_id'), '');
    expected_dlq_revision bigint;
    expected_state_revision bigint;
    dlq_row dubakwi_service.dead_letters%ROWTYPE;
    state_row dubakwi_service.request_state%ROWTYPE;
    state_ref_value jsonb;
BEGIN
    IF jsonb_typeof(payload) IS DISTINCT FROM 'object'
       OR payload - ARRAY['op','scope','dlq_id','owner_id','input_hash',
            'expected_dlq_revision','expected_state_revision','original_execution_id',
            'recovery_execution_id','verification'] <> '{}'::jsonb
       OR payload ->> 'op' IS DISTINCT FROM 'resume'
       OR scope_value IS NULL OR dlq_value IS NULL OR owner_value IS NULL
       OR input_hash_value !~ '^[0-9a-f]{64}$'
       OR original_execution IS NULL OR recovery_execution IS NULL
       OR payload ->> 'verification' IS DISTINCT FROM 'recovery_conditions_confirmed' THEN
        RETURN jsonb_build_object('ok', false, 'error_code', 'invalid_recovery_request');
    END IF;

    BEGIN
        expected_dlq_revision := (payload ->> 'expected_dlq_revision')::bigint;
        expected_state_revision := (payload ->> 'expected_state_revision')::bigint;
    EXCEPTION WHEN invalid_text_representation OR numeric_value_out_of_range THEN
        expected_dlq_revision := NULL;
        expected_state_revision := NULL;
    END;
    IF expected_dlq_revision IS NULL OR expected_state_revision IS NULL THEN
        RETURN jsonb_build_object('ok', false, 'error_code', 'invalid_recovery_request');
    END IF;

    SELECT * INTO dlq_row FROM dubakwi_service.dead_letters
    WHERE scope = scope_value AND dlq_id = dlq_value FOR UPDATE;
    IF NOT FOUND OR dlq_row.revision <> expected_dlq_revision
       OR dlq_row.replay_status <> 'reprocessing'
       OR dlq_row.last_execution_id IS DISTINCT FROM recovery_execution
       OR dlq_row.recovery ->> 'claimed_from_execution_id' IS DISTINCT FROM original_execution
       OR dlq_row.request_id IS NULL THEN
        RETURN jsonb_build_object('ok', false, 'error_code', 'recovery_conflict');
    END IF;

    SELECT * INTO state_row FROM dubakwi_service.request_state
    WHERE scope = scope_value AND request_id = dlq_row.request_id FOR UPDATE;
    IF NOT FOUND OR state_row.revision <> expected_state_revision
       OR state_row.processing_status NOT IN ('failed','unknown')
       OR state_row.execution_id IS DISTINCT FROM original_execution
       OR state_row.owner_id IS DISTINCT FROM owner_value
       OR state_row.input_hash::text IS DISTINCT FROM input_hash_value
       OR state_row.case_id IS DISTINCT FROM dlq_row.case_id
       OR ((dlq_row.recovery ->> 'action') IS DISTINCT FROM 'bind'
           AND (state_row.jira_issue_id IS DISTINCT FROM dlq_row.jira_issue_id
                OR state_row.jira_issue_key IS DISTINCT FROM dlq_row.jira_issue_key))
       OR ((dlq_row.recovery ->> 'action') = 'bind'
           AND ((state_row.jira_issue_id IS NOT NULL AND state_row.jira_issue_id <> dlq_row.jira_issue_id)
                OR (state_row.jira_issue_key IS NOT NULL AND state_row.jira_issue_key <> dlq_row.jira_issue_key))) THEN
        RETURN jsonb_build_object('ok', false, 'error_code', 'recovery_conflict');
    END IF;

    UPDATE dubakwi_service.request_state
    SET processing_status = 'processing', current_step = 'recovery.' || (dlq_row.recovery ->> 'action'),
        execution_id = recovery_execution, error_code = NULL,
        revision = revision + 1, updated_at = CURRENT_TIMESTAMP
    WHERE scope = scope_value AND request_id = state_row.request_id
      AND revision = expected_state_revision
      AND execution_id = original_execution
      AND processing_status IN ('failed','unknown')
    RETURNING * INTO state_row;
    IF state_row.request_id IS NULL THEN
        RAISE EXCEPTION 'recovery_conflict';
    END IF;

    state_ref_value := dubakwi_service.state_ref_json(state_row);
    RETURN jsonb_build_object(
        'ok', true, 'error_code', NULL, 'request_id', state_row.request_id,
        'processing_status', state_row.processing_status, 'state_revision', state_row.revision,
        'state_ref', state_ref_value, 'execution_id', recovery_execution,
        'dlq_id', dlq_row.dlq_id, 'dlq_revision', dlq_row.revision,
        'action', dlq_row.recovery ->> 'action',
        'action_required', coalesce(
            dlq_row.recovery #>> '{operator_reconciliation,decision}' <> 'already_applied',
            true
        ),
        'operator_reconciliation', dlq_row.recovery -> 'operator_reconciliation'
    );
EXCEPTION
    WHEN raise_exception OR unique_violation THEN
        RETURN jsonb_build_object('ok', false, 'error_code', 'recovery_conflict');
    WHEN check_violation OR not_null_violation
         OR invalid_text_representation OR numeric_value_out_of_range THEN
        RETURN jsonb_build_object('ok', false, 'error_code', 'invalid_recovery_request');
END;
$$;

-- Resume a claimed retry and release use the same recovery execution ID. Once
-- resumed, operator must attest that the execution ended and effects were
-- rechecked before returning the request to failed and the DLQ to pending.
CREATE OR REPLACE FUNCTION dubakwi_service.recovery_release(payload jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, dubakwi_service
AS $$
DECLARE
    scope_value text := nullif(btrim(payload ->> 'scope'), '');
    dlq_value text := nullif(btrim(payload ->> 'dlq_id'), '');
    operator_value text := nullif(btrim(payload ->> 'operator_id'), '');
    owner_value text := nullif(btrim(payload ->> 'owner_id'), '');
    input_hash_value text := nullif(btrim(payload ->> 'input_hash'), '');
    original_execution text := nullif(btrim(payload ->> 'original_execution_id'), '');
    recovery_execution text := nullif(btrim(payload ->> 'recovery_execution_id'), '');
    reason_value text := nullif(btrim(payload ->> 'reason'), '');
    effect_status_value text := payload ->> 'target_effect_status';
    expected_dlq_revision bigint;
    expected_state_revision bigint;
    dlq_row dubakwi_service.dead_letters%ROWTYPE;
    state_row dubakwi_service.request_state%ROWTYPE;
    resumed boolean;
    action_value text;
    action_key text;
    reconciliation_value text;
BEGIN
    IF jsonb_typeof(payload) IS DISTINCT FROM 'object'
       OR payload - ARRAY['op','scope','dlq_id','operator_id','owner_id','input_hash',
            'expected_dlq_revision','expected_state_revision','original_execution_id',
            'recovery_execution_id','reason','verification','target_effect_status'] <> '{}'::jsonb
       OR payload ->> 'op' IS DISTINCT FROM 'release'
       OR scope_value IS NULL OR dlq_value IS NULL OR operator_value IS NULL
       OR owner_value IS NULL OR input_hash_value !~ '^[0-9a-f]{64}$'
       OR original_execution IS NULL OR recovery_execution IS NULL OR reason_value IS NULL
       OR length(reason_value) > 200 THEN
        RETURN jsonb_build_object('ok', false, 'error_code', 'invalid_recovery_request');
    END IF;
    BEGIN
        expected_dlq_revision := (payload ->> 'expected_dlq_revision')::bigint;
        expected_state_revision := (payload ->> 'expected_state_revision')::bigint;
    EXCEPTION WHEN invalid_text_representation OR numeric_value_out_of_range THEN
        expected_dlq_revision := NULL; expected_state_revision := NULL;
    END;
    IF expected_dlq_revision IS NULL OR expected_state_revision IS NULL THEN
        RETURN jsonb_build_object('ok', false, 'error_code', 'invalid_recovery_request');
    END IF;

    SELECT * INTO dlq_row FROM dubakwi_service.dead_letters
    WHERE scope = scope_value AND dlq_id = dlq_value FOR UPDATE;
    IF NOT FOUND OR dlq_row.revision <> expected_dlq_revision
       OR dlq_row.replay_status <> 'reprocessing'
       OR dlq_row.last_execution_id IS DISTINCT FROM recovery_execution
       OR dlq_row.recovery ->> 'claimed_from_execution_id' IS DISTINCT FROM original_execution
       OR dlq_row.request_id IS NULL THEN
        RETURN jsonb_build_object('ok', false, 'error_code', 'recovery_conflict');
    END IF;
    action_value := dlq_row.recovery ->> 'action';
    action_key := CASE action_value
        WHEN 'create' THEN 'created_or_reused'
        WHEN 'context_update' THEN 'context_saved'
        WHEN 'close' THEN 'closed'
        WHEN 'assign' THEN 'assigned'
        WHEN 'alert' THEN 'alert'
        ELSE NULL
    END;
    IF action_value = 'bind' THEN
        IF effect_status_value IS DISTINCT FROM 'none' THEN
            RETURN jsonb_build_object('ok', false, 'error_code', 'invalid_recovery_request');
        END IF;
    ELSIF action_key IS NULL OR effect_status_value NOT IN ('failed','unknown','confirmed') THEN
        RETURN jsonb_build_object('ok', false, 'error_code', 'invalid_recovery_request');
    END IF;
    IF payload ->> 'verification' IS DISTINCT FROM 'recovery_execution_ended_and_effects_rechecked' THEN
        RETURN jsonb_build_object('ok', false, 'error_code', 'recovery_confirmation_required');
    END IF;
    SELECT * INTO state_row FROM dubakwi_service.request_state
    WHERE scope = scope_value AND request_id = dlq_row.request_id FOR UPDATE;
    IF NOT FOUND OR state_row.revision <> expected_state_revision
       OR state_row.owner_id IS DISTINCT FROM owner_value
       OR state_row.input_hash::text IS DISTINCT FROM input_hash_value
       OR state_row.case_id IS DISTINCT FROM dlq_row.case_id THEN
        RETURN jsonb_build_object('ok', false, 'error_code', 'recovery_conflict');
    END IF;
    resumed := state_row.execution_id = recovery_execution;
    IF resumed THEN
        IF state_row.processing_status NOT IN ('processing','failed','unknown') THEN
            RETURN jsonb_build_object('ok', false, 'error_code', 'recovery_confirmation_required');
        END IF;
    ELSIF state_row.execution_id IS DISTINCT FROM original_execution
          OR state_row.processing_status NOT IN ('failed','unknown') THEN
        RETURN jsonb_build_object('ok', false, 'error_code', 'recovery_conflict');
    END IF;

    IF resumed THEN
        UPDATE dubakwi_service.request_state
        SET processing_status = 'failed', current_step = 'recovery.interrupted',
            error_code = 'recovery_interrupted', revision = revision + 1,
            updated_at = CURRENT_TIMESTAMP
        WHERE scope = scope_value AND request_id = state_row.request_id
          AND revision = expected_state_revision AND execution_id = recovery_execution
          AND processing_status IN ('processing','failed','unknown')
        RETURNING * INTO state_row;
        IF state_row.request_id IS NULL THEN RAISE EXCEPTION 'recovery_conflict'; END IF;
    END IF;

    UPDATE dubakwi_service.dead_letters
    SET replay_status = 'pending',
        last_execution_id = CASE WHEN resumed THEN recovery_execution ELSE original_execution END,
        effects = CASE WHEN action_key IS NULL THEN effects ELSE jsonb_set(
            effects, ARRAY[action_key,'status'], to_jsonb(effect_status_value), false
        ) END,
        recovery = CASE
            WHEN action_key IS NULL THEN jsonb_set(recovery, '{last_effect_check}',
                jsonb_build_object('status',effect_status_value,'operator_id',operator_value,
                    'recovery_execution_id',recovery_execution,'checked_at',CURRENT_TIMESTAMP), true)
            WHEN effect_status_value = 'confirmed' THEN jsonb_set(
                jsonb_set(recovery - 'last_effect_check', '{operator_reconciliation}',
                    jsonb_build_object('decision','already_applied','operator_id',operator_value,
                        'checked_at',CURRENT_TIMESTAMP), true),
                '{last_effect_check}',
                jsonb_build_object('status',effect_status_value,'operator_id',operator_value,
                    'recovery_execution_id',recovery_execution,'checked_at',CURRENT_TIMESTAMP), true)
            ELSE jsonb_set(
                jsonb_set(recovery - 'operator_reconciliation', '{last_effect_check}',
                    jsonb_build_object('status',effect_status_value,'operator_id',operator_value,
                        'recovery_execution_id',recovery_execution,'checked_at',CURRENT_TIMESTAMP), true),
                '{reason}', to_jsonb('operator:' || operator_value || ':' || reason_value), true)
        END,
        revision = revision + 1, updated_at = CURRENT_TIMESTAMP
    WHERE scope = scope_value AND dlq_id = dlq_value
      AND revision = expected_dlq_revision AND replay_status = 'reprocessing'
      AND last_execution_id = recovery_execution
    RETURNING * INTO dlq_row;
    IF dlq_row.dlq_id IS NULL THEN RAISE EXCEPTION 'recovery_conflict'; END IF;
    RETURN jsonb_build_object('ok', true, 'error_code', NULL,
        'dlq_id', dlq_row.dlq_id, 'replay_status', dlq_row.replay_status,
        'dlq_revision', dlq_row.revision, 'attempts', dlq_row.attempts,
        'request_id', state_row.request_id, 'processing_status', state_row.processing_status,
        'state_revision', state_row.revision, 'execution_id', state_row.execution_id,
        'recovery_execution_id', recovery_execution,
        'target_effect_status', effect_status_value);
EXCEPTION
    WHEN raise_exception OR unique_violation THEN
        RETURN jsonb_build_object('ok', false, 'error_code', 'recovery_conflict');
    WHEN check_violation OR not_null_violation
         OR invalid_text_representation OR numeric_value_out_of_range THEN
        RETURN jsonb_build_object('ok', false, 'error_code', 'invalid_recovery_request');
END;
$$;

REVOKE ALL ON FUNCTION dubakwi_service.recovery_resume(jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION dubakwi_service.recovery_release(jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION dubakwi_service.recovery_resume(jsonb)
    TO dubakwi_recovery_operator;
GRANT EXECUTE ON FUNCTION dubakwi_service.recovery_release(jsonb)
    TO dubakwi_recovery_operator;

COMMIT;
