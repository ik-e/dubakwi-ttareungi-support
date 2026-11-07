-- Atomically finalize a manually executed and independently verified action.
-- The DB stores the response and resolves the DLQ; it never calls Jira/Discord.
BEGIN;

CREATE FUNCTION dubakwi_service.recovery_complete(payload jsonb)
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
    jira_id_value text := nullif(btrim(payload ->> 'jira_issue_id'), '');
    jira_key_value text := nullif(btrim(payload ->> 'jira_issue_key'), '');
    expected_dlq_revision bigint;
    expected_state_revision bigint;
    dlq_row dubakwi_service.dead_letters%ROWTYPE;
    state_row dubakwi_service.request_state%ROWTYPE;
    result_row dubakwi_service.request_state%ROWTYPE;
    action_value text;
    target_effect text;
    response_value jsonb;
    effects_value jsonb;
    state_ref_value jsonb;
    effect_key text;
BEGIN
    IF jsonb_typeof(payload) IS DISTINCT FROM 'object'
       OR payload - ARRAY['op','scope','dlq_id','operator_id','owner_id','input_hash',
            'expected_dlq_revision','expected_state_revision','original_execution_id',
            'recovery_execution_id','jira_issue_id','jira_issue_key','response','effects','verification'] <> '{}'::jsonb
       OR payload ->> 'op' IS DISTINCT FROM 'complete'
       OR scope_value IS NULL OR dlq_value IS NULL OR operator_value IS NULL
       OR owner_value IS NULL OR input_hash_value !~ '^[0-9a-f]{64}$'
       OR original_execution IS NULL OR recovery_execution IS NULL
       OR payload ->> 'verification' IS DISTINCT FROM 'recovery_action_effects_confirmed'
       OR jira_id_value IS NULL OR jira_key_value !~ '^JBYS-[0-9]+$'
       OR jsonb_typeof(payload -> 'response') IS DISTINCT FROM 'object'
       OR jsonb_typeof(payload -> 'effects') IS DISTINCT FROM 'object' THEN
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
       OR dlq_row.recovery ->> 'claimed_by_operator' IS DISTINCT FROM operator_value
       OR dlq_row.request_id IS NULL THEN
        RETURN jsonb_build_object('ok', false, 'error_code', 'recovery_conflict');
    END IF;
    SELECT * INTO state_row FROM dubakwi_service.request_state
    WHERE scope = scope_value AND request_id = dlq_row.request_id FOR UPDATE;
    IF NOT FOUND OR state_row.revision <> expected_state_revision
       OR state_row.processing_status <> 'processing'
       OR state_row.execution_id IS DISTINCT FROM recovery_execution
       OR state_row.owner_id IS DISTINCT FROM owner_value
       OR state_row.input_hash::text IS DISTINCT FROM input_hash_value
       OR state_row.case_id IS DISTINCT FROM dlq_row.case_id THEN
        RETURN jsonb_build_object('ok', false, 'error_code', 'recovery_conflict');
    END IF;

    action_value := dlq_row.recovery ->> 'action';
    target_effect := CASE action_value
        WHEN 'create' THEN 'created_or_reused'
        WHEN 'bind' THEN 'created_or_reused'
        WHEN 'context_update' THEN 'context_saved'
        WHEN 'close' THEN 'closed'
        WHEN 'assign' THEN 'assigned'
        WHEN 'alert' THEN 'alert'
        ELSE NULL
    END;
    effects_value := payload -> 'effects';
    IF target_effect IS NULL
       OR effects_value - ARRAY['created_or_reused','context_saved','closed','assigned','alert'] <> '{}'::jsonb
       OR jsonb_typeof(effects_value -> target_effect) IS DISTINCT FROM 'object'
       OR effects_value #>> ARRAY[target_effect,'status'] IS DISTINCT FROM 'confirmed'
       OR (action_value NOT IN ('bind') AND NOT (
            dlq_row.effects #>> ARRAY[target_effect,'status'] = 'failed'
            OR (dlq_row.effects #>> ARRAY[target_effect,'status'] = 'confirmed'
                AND dlq_row.recovery #>> '{operator_reconciliation,decision}' = 'already_applied'
                AND dlq_row.recovery #>> '{operator_reconciliation,operator_id}' = operator_value)
       ))
       OR (action_value NOT IN ('create','bind')
           AND (state_row.jira_issue_id IS DISTINCT FROM dlq_row.jira_issue_id
                OR state_row.jira_issue_key IS DISTINCT FROM dlq_row.jira_issue_key
                OR jira_id_value IS DISTINCT FROM state_row.jira_issue_id
                OR jira_key_value IS DISTINCT FROM state_row.jira_issue_key))
       OR (action_value IN ('create','bind')
           AND ((state_row.jira_issue_id IS NOT NULL AND state_row.jira_issue_id <> jira_id_value)
                OR (state_row.jira_issue_key IS NOT NULL AND state_row.jira_issue_key <> jira_key_value)
                OR (dlq_row.jira_issue_id IS NOT NULL AND dlq_row.jira_issue_id <> jira_id_value)
                OR (dlq_row.jira_issue_key IS NOT NULL AND dlq_row.jira_issue_key <> jira_key_value))) THEN
        RETURN jsonb_build_object('ok', false, 'error_code', 'recovery_effect_not_confirmed');
    END IF;

    FOREACH effect_key IN ARRAY ARRAY['created_or_reused','context_saved','closed','assigned','alert'] LOOP
        IF effect_key <> target_effect
           AND coalesce(effects_value #>> ARRAY[effect_key,'status'], '')
               IS DISTINCT FROM coalesce(dlq_row.effects #>> ARRAY[effect_key,'status'], '') THEN
            RETURN jsonb_build_object('ok', false, 'error_code', 'recovery_effect_mismatch');
        END IF;
        IF coalesce(effects_value #>> ARRAY[effect_key,'status'], '') NOT IN ('confirmed','none') THEN
            RETURN jsonb_build_object('ok', false, 'error_code', 'recovery_effect_unknown');
        END IF;
    END LOOP;

    response_value := payload -> 'response';
    IF response_value ->> 'request_id' IS DISTINCT FROM state_row.request_id
       OR coalesce(response_value ->> 'route', '') NOT IN ('자동 답변','보완 질문','담당자 이관','긴급 이관','거절')
       OR nullif(btrim(response_value ->> 'answer'), '') IS NULL
       OR jsonb_typeof(response_value -> 'ticket') IS DISTINCT FROM 'object'
       OR response_value #>> '{ticket,ticket_id}' IS DISTINCT FROM jira_key_value
       OR (state_row.case_id IS NOT NULL AND response_value ->> 'case_ref' IS DISTINCT FROM state_row.case_id)
       OR length(response_value::text) > 16000
       OR response_value::text ~* '\m[[:alnum:]._%+-]+@[[:alnum:].-]+\.[[:alpha:]]{2,}\M'
       OR response_value::text ~ '\m0[0-9]{1,2}[-. ]?[0-9]{3,4}[-. ]?[0-9]{4}\M' THEN
        RETURN jsonb_build_object('ok', false, 'error_code', 'recovery_response_invalid');
    END IF;

    UPDATE dubakwi_service.request_state
    SET processing_status = 'completed', current_step = 'respond', response = response_value,
        jira_issue_id = jira_id_value, jira_issue_key = jira_key_value,
        error_code = NULL, revision = revision + 1, updated_at = CURRENT_TIMESTAMP
    WHERE scope = scope_value AND request_id = state_row.request_id
      AND revision = expected_state_revision AND execution_id = recovery_execution
      AND processing_status = 'processing'
    RETURNING * INTO result_row;
    IF result_row.request_id IS NULL THEN RAISE EXCEPTION 'recovery_conflict'; END IF;

    UPDATE dubakwi_service.dead_letters
    SET replay_status = 'resolved', effects = effects_value,
        jira_issue_id = jira_id_value, jira_issue_key = jira_key_value,
        resolution = 'operator:' || operator_value || ':action verified and response stored',
        resolved_at = CURRENT_TIMESTAMP, revision = revision + 1, updated_at = CURRENT_TIMESTAMP
    WHERE scope = scope_value AND dlq_id = dlq_value
      AND revision = expected_dlq_revision AND replay_status = 'reprocessing'
      AND last_execution_id = recovery_execution
    RETURNING * INTO dlq_row;
    IF dlq_row.dlq_id IS NULL THEN RAISE EXCEPTION 'recovery_conflict'; END IF;

    state_ref_value := dubakwi_service.state_ref_json(result_row);
    RETURN jsonb_build_object('ok', true, 'error_code', NULL,
        'request_id', result_row.request_id, 'processing_status', result_row.processing_status,
        'response', result_row.response, 'state_ref', state_ref_value,
        'state_revision', result_row.revision, 'execution_id', recovery_execution,
        'dlq_id', dlq_row.dlq_id, 'replay_status', dlq_row.replay_status,
        'dlq_revision', dlq_row.revision, 'recovered_action', action_value,
        'ticket_id', jira_key_value);
EXCEPTION
    WHEN raise_exception OR unique_violation THEN
        RETURN jsonb_build_object('ok', false, 'error_code', 'recovery_conflict');
    WHEN check_violation OR not_null_violation
         OR invalid_text_representation OR numeric_value_out_of_range THEN
        RETURN jsonb_build_object('ok', false, 'error_code', 'invalid_recovery_request');
END;
$$;

REVOKE ALL ON FUNCTION dubakwi_service.recovery_complete(jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION dubakwi_service.recovery_complete(jsonb)
    TO dubakwi_recovery_operator;
COMMIT;
