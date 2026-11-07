-- Operator-only CAS claim/release for action-specific recovery drivers.
-- This migration never calls Jira/Discord and never starts a request by itself.
BEGIN;

CREATE FUNCTION dubakwi_service.recovery_claim(payload jsonb)
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
    expected_dlq_revision bigint;
    expected_state_revision bigint;
    dlq_row dubakwi_service.dead_letters%ROWTYPE;
    state_row dubakwi_service.request_state%ROWTYPE;
    action_value text;
    effects_value jsonb;
    selected_status text;
    action_key text;
    effect_key text;
    verification_value text := payload ->> 'verification';
    reconciliation_value text;
    action_required boolean := true;
BEGIN
    IF jsonb_typeof(payload) IS DISTINCT FROM 'object'
       OR payload - ARRAY[
            'op','scope','dlq_id','operator_id','owner_id','input_hash',
            'expected_dlq_revision','expected_state_revision',
            'original_execution_id','recovery_execution_id','verification'
       ] <> '{}'::jsonb
       OR payload ->> 'op' IS DISTINCT FROM 'claim'
       OR scope_value IS NULL OR dlq_value IS NULL OR operator_value IS NULL
       OR owner_value IS NULL OR input_hash_value IS NULL
       OR input_hash_value !~ '^[0-9a-f]{64}$'
       OR original_execution IS NULL OR recovery_execution IS NULL
       OR recovery_execution = original_execution
       OR verification_value IS NULL
       OR verification_value NOT IN (
            'recovery_conditions_confirmed',
            'recovery_unknown_effect_checked_absent',
            'recovery_unknown_effect_checked_present'
       ) THEN
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

    -- Lock in the same order as recovery_finish so operators serialize by DLQ.
    SELECT * INTO dlq_row
    FROM dubakwi_service.dead_letters
    WHERE scope = scope_value AND dlq_id = dlq_value
    FOR UPDATE;
    IF NOT FOUND OR dlq_row.revision <> expected_dlq_revision
       OR dlq_row.replay_status <> 'pending' OR dlq_row.request_id IS NULL THEN
        RETURN jsonb_build_object('ok', false, 'error_code', 'recovery_conflict');
    END IF;

    SELECT * INTO state_row
    FROM dubakwi_service.request_state
    WHERE scope = scope_value AND request_id = dlq_row.request_id
    FOR UPDATE;
    IF NOT FOUND OR state_row.revision <> expected_state_revision
       OR state_row.processing_status NOT IN ('failed', 'unknown')
       OR state_row.execution_id IS DISTINCT FROM original_execution
       OR dlq_row.last_execution_id IS DISTINCT FROM original_execution
       OR state_row.owner_id IS DISTINCT FROM owner_value
       OR state_row.input_hash::text IS DISTINCT FROM input_hash_value
       OR state_row.case_id IS DISTINCT FROM dlq_row.case_id THEN
        RETURN jsonb_build_object('ok', false, 'error_code', 'recovery_conflict');
    END IF;

    action_value := dlq_row.recovery ->> 'action';
    IF action_value IS DISTINCT FROM 'bind'
       AND (state_row.jira_issue_id IS DISTINCT FROM dlq_row.jira_issue_id
            OR state_row.jira_issue_key IS DISTINCT FROM dlq_row.jira_issue_key) THEN
        RETURN jsonb_build_object('ok', false, 'error_code', 'recovery_conflict');
    END IF;
    effects_value := dlq_row.effects;
    IF dlq_row.recovery ->> 'version' IS DISTINCT FROM '1'
       OR dlq_row.recovery ->> 'mode' IS DISTINCT FROM 'payload'
       OR action_value IS NULL
       OR action_value NOT IN ('create','bind','context_update','close','assign','alert')
       OR jsonb_typeof(dlq_row.recovery -> 'args') IS DISTINCT FROM 'object' THEN
        RETURN jsonb_build_object('ok', false, 'error_code', 'recovery_not_supported');
    END IF;
    IF length((dlq_row.recovery -> 'args')::text) > 16000
       OR (dlq_row.recovery -> 'args')::text ~* '\m[[:alnum:]._%+-]+@[[:alnum:].-]+\.[[:alpha:]]{2,}\M'
       OR (dlq_row.recovery -> 'args')::text ~ '\m0[0-9]{1,2}[-. ]?[0-9]{3,4}[-. ]?[0-9]{4}\M' THEN
        RETURN jsonb_build_object('ok', false, 'error_code', 'recovery_not_supported');
    END IF;

    -- A Jira reference identifies the target but cannot reconstruct a write.
    -- Require the exact action material; unsupported/incomplete capsules stay
    -- pending for manual review instead of locking a claim that cannot run.
    IF (action_value = 'create'
        AND jsonb_typeof(dlq_row.recovery #> '{args,ticket_request}') IS DISTINCT FROM 'object')
       OR (action_value = 'bind'
        AND (nullif(btrim(dlq_row.recovery #>> '{args,jira_issue_id}'), '') IS NULL
             OR nullif(btrim(dlq_row.recovery #>> '{args,key}'), '') IS NULL
             OR nullif(btrim(dlq_row.recovery #>> '{args,case_id}'), '') IS NULL
             OR nullif(btrim(dlq_row.recovery #>> '{args,first_request_id}'), '') IS NULL
             OR coalesce(dlq_row.recovery #>> '{args,next_step}', '') NOT IN ('H08','H09','B32')))
       OR (action_value = 'context_update'
        AND jsonb_typeof(dlq_row.recovery #> '{args,snapshot}') IS DISTINCT FROM 'object'
        AND nullif(btrim(dlq_row.recovery #>> '{args,body}'), '') IS NULL)
       OR (action_value = 'close'
        AND (coalesce(dlq_row.recovery #>> '{args,close_status}', '') NOT IN ('closed_guidance','closed_rejected')
             OR nullif(btrim(dlq_row.recovery #>> '{args,answer}'), '') IS NULL))
       OR (action_value = 'assign'
        AND (nullif(btrim(dlq_row.recovery #>> '{args,assignee_account_id}'), '') IS NULL
             OR coalesce(dlq_row.recovery #>> '{args,priority}', '') NOT IN ('normal','high')))
       OR (action_value = 'alert'
        AND (nullif(btrim(dlq_row.recovery #>> '{args,recipient_id}'), '') IS NULL
             OR nullif(btrim(dlq_row.recovery #>> '{args,message}'), '') IS NULL
             OR nullif(btrim(dlq_row.recovery #>> '{args,idempotency_key}'), '') IS NULL)) THEN
        RETURN jsonb_build_object('ok', false, 'error_code', 'recovery_not_supported');
    END IF;

    action_key := CASE action_value
        WHEN 'create' THEN 'created_or_reused'
        WHEN 'bind' THEN NULL
        WHEN 'context_update' THEN 'context_saved'
        WHEN 'close' THEN 'closed'
        WHEN 'assign' THEN 'assigned'
        WHEN 'alert' THEN 'alert'
    END;
    IF action_value = 'bind' THEN
        IF effects_value #>> '{created_or_reused,status}' IS DISTINCT FROM 'confirmed'
           OR dlq_row.jira_issue_id IS NULL OR dlq_row.jira_issue_key IS NULL
           OR (state_row.jira_issue_id IS NOT NULL AND state_row.jira_issue_id <> dlq_row.jira_issue_id)
           OR (state_row.jira_issue_key IS NOT NULL AND state_row.jira_issue_key <> dlq_row.jira_issue_key) THEN
            RETURN jsonb_build_object('ok', false, 'error_code', 'recovery_not_supported');
        END IF;
    ELSE
        selected_status := effects_value #>> ARRAY[action_key, 'status'];
        IF selected_status = 'failed'
           AND verification_value = 'recovery_conditions_confirmed' THEN
            reconciliation_value := NULL;
        ELSIF selected_status = 'unknown'
           AND verification_value = 'recovery_unknown_effect_checked_absent' THEN
            effects_value := jsonb_set(
                effects_value, ARRAY[action_key, 'status'], to_jsonb('failed'::text), false
            );
            reconciliation_value := 'not_applied';
        ELSIF selected_status = 'unknown'
           AND verification_value = 'recovery_unknown_effect_checked_present' THEN
            effects_value := jsonb_set(
                effects_value, ARRAY[action_key, 'status'], to_jsonb('confirmed'::text), false
            );
            reconciliation_value := 'already_applied';
            action_required := false;
        ELSIF selected_status = 'confirmed'
           AND verification_value = 'recovery_unknown_effect_checked_present' THEN
            reconciliation_value := 'already_applied';
            action_required := false;
        ELSE
            RETURN jsonb_build_object('ok', false, 'error_code', 'recovery_effect_not_confirmed_failed');
        END IF;
    END IF;

    -- Every non-target effect must be known; any unknown effect could duplicate
    -- an already completed Jira/Discord side effect if the driver resumed it.
    FOREACH effect_key IN ARRAY ARRAY['created_or_reused','context_saved','closed','assigned','alert'] LOOP
        IF effect_key IS DISTINCT FROM action_key
           AND coalesce(effects_value #>> ARRAY[effect_key, 'status'], '') NOT IN ('confirmed','none') THEN
            RETURN jsonb_build_object('ok', false, 'error_code', 'recovery_effect_unknown');
        END IF;
    END LOOP;
    IF action_value = 'create'
       AND (dlq_row.jira_issue_id IS NOT NULL OR dlq_row.jira_issue_key IS NOT NULL) THEN
        RETURN jsonb_build_object('ok', false, 'error_code', 'recovery_effect_unknown');
    END IF;

    UPDATE dubakwi_service.dead_letters
    SET replay_status = 'reprocessing',
        attempts = attempts + 1,
        last_execution_id = recovery_execution,
        effects = effects_value,
        recovery = CASE WHEN reconciliation_value IS NULL THEN
            jsonb_set(
                jsonb_set(recovery, '{claimed_from_execution_id}', to_jsonb(original_execution), true),
                '{claimed_by_operator}', to_jsonb(operator_value), true
            )
        ELSE
            jsonb_set(
                jsonb_set(
                    jsonb_set(recovery, '{claimed_from_execution_id}', to_jsonb(original_execution), true),
                    '{claimed_by_operator}', to_jsonb(operator_value), true
                ),
                '{operator_reconciliation}',
                jsonb_build_object(
                    'decision', reconciliation_value,
                    'operator_id', operator_value,
                    'checked_at', CURRENT_TIMESTAMP
                ),
                true
            )
        END,
        revision = revision + 1,
        updated_at = CURRENT_TIMESTAMP
    WHERE scope = scope_value AND dlq_id = dlq_value
      AND revision = expected_dlq_revision AND replay_status = 'pending'
    RETURNING * INTO dlq_row;
    IF dlq_row.dlq_id IS NULL THEN
        RAISE EXCEPTION 'recovery_conflict';
    END IF;

    RETURN jsonb_build_object(
        'ok', true, 'error_code', NULL,
        'dlq_id', dlq_row.dlq_id, 'replay_status', dlq_row.replay_status,
        'dlq_revision', dlq_row.revision, 'attempts', dlq_row.attempts,
        'request_id', state_row.request_id, 'owner_id', state_row.owner_id,
        'input_hash', state_row.input_hash, 'state_revision', state_row.revision,
        'processing_status', state_row.processing_status,
        'original_execution_id', state_row.execution_id,
        'recovery_execution_id', recovery_execution,
        'action', action_value, 'recovery', dlq_row.recovery,
        'effects', dlq_row.effects,
        'action_required', action_required,
        'operator_reconciliation', dlq_row.recovery -> 'operator_reconciliation',
        'jira_issue_id', dlq_row.jira_issue_id,
        'jira_issue_key', dlq_row.jira_issue_key
    );
EXCEPTION
    WHEN raise_exception OR unique_violation THEN
        RETURN jsonb_build_object('ok', false, 'error_code', 'recovery_conflict');
    WHEN check_violation OR not_null_violation
         OR invalid_text_representation OR numeric_value_out_of_range THEN
        RETURN jsonb_build_object('ok', false, 'error_code', 'invalid_recovery_request');
END;
$$;

CREATE FUNCTION dubakwi_service.recovery_release(payload jsonb)
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
    expected_dlq_revision bigint;
    expected_state_revision bigint;
    dlq_row dubakwi_service.dead_letters%ROWTYPE;
    state_row dubakwi_service.request_state%ROWTYPE;
BEGIN
    IF jsonb_typeof(payload) IS DISTINCT FROM 'object'
       OR payload - ARRAY[
            'op','scope','dlq_id','operator_id','owner_id','input_hash',
            'expected_dlq_revision','expected_state_revision',
            'original_execution_id','recovery_execution_id','reason'
       ] <> '{}'::jsonb
       OR payload ->> 'op' IS DISTINCT FROM 'release'
       OR scope_value IS NULL OR dlq_value IS NULL OR operator_value IS NULL
       OR owner_value IS NULL OR input_hash_value IS NULL
       OR input_hash_value !~ '^[0-9a-f]{64}$'
       OR original_execution IS NULL OR recovery_execution IS NULL OR reason_value IS NULL
       OR length(reason_value) > 200 THEN
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

    SELECT * INTO dlq_row
    FROM dubakwi_service.dead_letters
    WHERE scope = scope_value AND dlq_id = dlq_value
    FOR UPDATE;
    IF NOT FOUND OR dlq_row.revision <> expected_dlq_revision
       OR dlq_row.replay_status <> 'reprocessing'
       OR dlq_row.last_execution_id IS DISTINCT FROM recovery_execution
       OR dlq_row.request_id IS NULL THEN
        RETURN jsonb_build_object('ok', false, 'error_code', 'recovery_conflict');
    END IF;

    SELECT * INTO state_row
    FROM dubakwi_service.request_state
    WHERE scope = scope_value AND request_id = dlq_row.request_id
    FOR UPDATE;
    IF NOT FOUND OR state_row.revision <> expected_state_revision
       OR state_row.processing_status NOT IN ('failed', 'unknown')
       OR state_row.execution_id IS DISTINCT FROM original_execution
       OR state_row.owner_id IS DISTINCT FROM owner_value
       OR state_row.input_hash::text IS DISTINCT FROM input_hash_value
       OR state_row.case_id IS DISTINCT FROM dlq_row.case_id THEN
        RETURN jsonb_build_object('ok', false, 'error_code', 'recovery_conflict');
    END IF;

    UPDATE dubakwi_service.dead_letters
    SET replay_status = 'pending',
        recovery = jsonb_set(
            recovery,
            '{reason}',
            to_jsonb('operator:' || operator_value || ':' || reason_value),
            true
        ),
        revision = revision + 1,
        updated_at = CURRENT_TIMESTAMP
    WHERE scope = scope_value AND dlq_id = dlq_value
      AND revision = expected_dlq_revision
      AND replay_status = 'reprocessing'
      AND last_execution_id = recovery_execution
    RETURNING * INTO dlq_row;
    IF dlq_row.dlq_id IS NULL THEN
        RAISE EXCEPTION 'recovery_conflict';
    END IF;

    RETURN jsonb_build_object(
        'ok', true, 'error_code', NULL,
        'dlq_id', dlq_row.dlq_id, 'replay_status', dlq_row.replay_status,
        'dlq_revision', dlq_row.revision, 'attempts', dlq_row.attempts,
        'request_id', state_row.request_id,
        'processing_status', state_row.processing_status,
        'state_revision', state_row.revision,
        'original_execution_id', state_row.execution_id,
        'recovery_execution_id', recovery_execution
    );
EXCEPTION
    WHEN raise_exception OR unique_violation THEN
        RETURN jsonb_build_object('ok', false, 'error_code', 'recovery_conflict');
    WHEN check_violation OR not_null_violation
         OR invalid_text_representation OR numeric_value_out_of_range THEN
        RETURN jsonb_build_object('ok', false, 'error_code', 'invalid_recovery_request');
END;
$$;

REVOKE ALL ON FUNCTION dubakwi_service.recovery_claim(jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION dubakwi_service.recovery_release(jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION dubakwi_service.recovery_claim(jsonb)
    TO dubakwi_recovery_operator;
GRANT EXECUTE ON FUNCTION dubakwi_service.recovery_release(jsonb)
    TO dubakwi_recovery_operator;

COMMIT;
