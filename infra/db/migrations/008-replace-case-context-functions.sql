-- P18: verified snapshots; 005/006 are immutable history.
BEGIN;

-- 보완 요청(case_ref)의 서비스 쪽 확인을 위한 읽기 전용 조회.
-- 소유자가 아니면 case 내용을 돌려주지 않는다. Jira 열림 상태 확인은 호출 워크플로우가 한다.
CREATE OR REPLACE FUNCTION dubakwi_service.case_lookup(payload jsonb)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
SET search_path = pg_catalog, dubakwi_service
AS $$
DECLARE
    scope_value text := nullif(btrim(payload ->> 'scope'), '');
    case_value text := nullif(btrim(payload ->> 'case_ref'), '');
    owner_value text := nullif(btrim(payload ->> 'actor_id'), '');
    case_row dubakwi_service.request_state%ROWTYPE;
BEGIN
    IF scope_value IS NULL OR case_value IS NULL OR owner_value IS NULL THEN
        RETURN jsonb_build_object('ok', false, 'error_code', 'invalid_state_request');
    END IF;

    SELECT * INTO case_row
    FROM dubakwi_service.request_state
    WHERE scope = scope_value AND case_id = case_value
    ORDER BY (jira_issue_key IS NULL), created_at, request_id
    LIMIT 1;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('ok', true, 'found', false);
    END IF;

    IF case_row.owner_id <> owner_value THEN
        RETURN jsonb_build_object('ok', true, 'found', true, 'owner_match', false);
    END IF;

    RETURN jsonb_build_object(
        'ok', true, 'found', true, 'owner_match', true,
        'jira_issue_key', case_row.jira_issue_key,
        'first_request_id', case_row.first_request_id,
        'latest_completed_request_id', (SELECT request_id FROM dubakwi_service.request_state WHERE scope=scope_value AND case_id=case_value AND processing_status='completed' ORDER BY updated_at DESC, created_at DESC, request_id DESC LIMIT 1),
        'has_unresolved', EXISTS (SELECT 1 FROM dubakwi_service.request_state WHERE scope=scope_value AND case_id=case_value AND processing_status IN ('processing','failed','unknown')),
        'busy', EXISTS (
            SELECT 1 FROM dubakwi_service.request_state
            WHERE scope = scope_value AND case_id = case_value
              AND processing_status IN ('processing', 'failed', 'unknown')
        )
    );
END
$$;

-- Jira에서 열림이 확인된 기존 case에 새 요청의 처리권을 얻는다.
-- state_apply(begin)는 case_ref에 case_verification_required를 돌려주므로 그 뒤에 호출한다.
CREATE OR REPLACE FUNCTION dubakwi_service.case_begin(payload jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = pg_catalog, dubakwi_service
AS $$
DECLARE
    request_value jsonb := payload -> 'request';
    scope_value text := nullif(btrim(payload ->> 'scope'), '');
    execution_value text := nullif(btrim(payload ->> 'execution_id'), '');
    input_hash_value text := nullif(btrim(payload ->> 'input_hash'), '');
    owner_value text := nullif(btrim(payload #>> '{actor,id}'), '');
    request_id_value text := nullif(btrim(request_value ->> 'request_id'), '');
    case_value text := nullif(btrim(request_value ->> 'case_ref'), '');
    attempt_value integer;
    case_row dubakwi_service.request_state%ROWTYPE;
    state_row dubakwi_service.request_state%ROWTYPE;
    latest_id text;
    verified jsonb := payload -> 'verified_case';
BEGIN
    IF jsonb_typeof(payload) <> 'object' OR jsonb_typeof(request_value) <> 'object'
       OR scope_value IS NULL OR execution_value IS NULL
       OR input_hash_value IS NULL OR input_hash_value !~ '^[0-9a-f]{64}$'
       OR owner_value IS NULL OR request_id_value IS NULL
       OR length(request_id_value) > 64 OR case_value IS NULL
       OR jsonb_typeof(payload -> 'jira_open') IS DISTINCT FROM 'boolean'
       OR coalesce(payload ->> 'jira_attempt', '') !~ '^[1-9][0-9]*$' THEN
        RETURN jsonb_build_object(
            'request_id', request_id_value, 'mode', 'error',
            'state_ref', NULL, 'support', NULL, 'facts', NULL,
            'response', NULL, 'http_status', 400,
            'error_code', 'invalid_state_request'
        );
    END IF;
    attempt_value := (payload ->> 'jira_attempt')::integer;

    PERFORM pg_advisory_xact_lock(hashtextextended(scope_value || ':' || request_id_value, 0));
    PERFORM pg_advisory_xact_lock(hashtextextended(scope_value || ':case:' || case_value, 0));

    -- 같은 request_id가 이미 있으면 재전송 판정은 state_apply의 몫이므로 여기서 새로 만들지 않는다.
    IF EXISTS (
        SELECT 1 FROM dubakwi_service.request_state
        WHERE scope = scope_value AND request_id = request_id_value
    ) THEN
        RETURN dubakwi_service.state_apply(payload || jsonb_build_object('op','begin'));
    END IF;

    SELECT * INTO case_row
    FROM dubakwi_service.request_state
    WHERE scope = scope_value AND case_id = case_value
    ORDER BY (jira_issue_key IS NULL), created_at, request_id
    LIMIT 1;

    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'request_id', request_id_value, 'mode', 'conflict',
            'state_ref', NULL, 'support', NULL, 'facts', NULL,
            'response', jsonb_build_object(
                'error', '알 수 없는 문의 번호입니다.',
                'codes', jsonb_build_array('invalid_case_ref')
            ),
            'http_status', 400, 'error_code', 'invalid_case_ref'
        );
    END IF;

    IF case_row.owner_id <> owner_value THEN
        RETURN jsonb_build_object(
            'request_id', request_id_value, 'mode', 'conflict',
            'state_ref', NULL, 'support', NULL, 'facts', NULL,
            'response', jsonb_build_object(
                'error', '이 문의에 접근할 수 없습니다.',
                'codes', jsonb_build_array('case_access_denied')
            ),
            'http_status', 403, 'error_code', 'case_access_denied'
        );
    END IF;

    IF NOT (payload ->> 'jira_open')::boolean THEN
        RETURN jsonb_build_object(
            'request_id', request_id_value, 'mode', 'conflict',
            'state_ref', NULL, 'support', NULL, 'facts', NULL,
            'response', jsonb_build_object(
                'error', '종료된 문의입니다. 새 문의로 접수해 주세요.',
                'codes', jsonb_build_array('case_closed')
            ),
            'http_status', 409, 'error_code', 'case_closed'
        );
    END IF;

    -- Re-check latest completed snapshot while holding the same case advisory lock.
    SELECT request_id INTO latest_id FROM dubakwi_service.request_state
    WHERE scope=scope_value AND case_id=case_value AND processing_status='completed'
    ORDER BY updated_at DESC, created_at DESC, request_id DESC LIMIT 1;
    IF jsonb_typeof(verified) IS DISTINCT FROM 'object'
       OR latest_id IS NULL OR verified ->> 'request_id' IS DISTINCT FROM latest_id
       OR verified ->> 'scope' IS DISTINCT FROM scope_value
       OR verified ->> 'case_id' IS DISTINCT FROM case_value
       OR verified ->> 'owner_id' IS DISTINCT FROM owner_value
       OR verified ->> 'ticket_key' IS DISTINCT FROM case_row.jira_issue_key
       OR verified ->> 'first_request_id' IS DISTINCT FROM case_row.first_request_id
       OR verified -> 'schema_version' IS DISTINCT FROM '1'::jsonb
       OR coalesce(verified ->> 'revision','') !~ '^[1-9][0-9]*$'
       OR coalesce(verified ->> 'event_id','') !~ '^[0-9a-f]{64}$'
       OR jsonb_typeof(verified -> 'support') IS DISTINCT FROM 'object'
       OR verified #>> '{support,case_id}' IS DISTINCT FROM case_value
       OR verified #>> '{support,owner_id}' IS DISTINCT FROM owner_value
       OR verified #>> '{support,ticket_id}' IS DISTINCT FROM case_row.jira_issue_key
       OR verified #>> '{support,first_request_id}' IS DISTINCT FROM case_row.first_request_id
       OR verified #> '{support,version}' IS DISTINCT FROM 'null'::jsonb
       OR coalesce(verified #>> '{support,status}','') NOT IN ('waiting_info','handed_off')
       OR verified #>> '{support,attempt}' IS DISTINCT FROM payload ->> 'jira_attempt'
       OR jsonb_typeof(verified -> 'facts') IS DISTINCT FROM 'object'
       OR jsonb_typeof(verified #> '{facts,summary}') IS DISTINCT FROM 'string'
       OR jsonb_typeof(verified #> '{facts,reported}') IS DISTINCT FROM 'array'
       OR jsonb_typeof(verified #> '{facts,confirmed}') IS DISTINCT FROM 'array'
       OR jsonb_typeof(verified #> '{facts,attempted_actions}') IS DISTINCT FROM 'array'
       OR jsonb_typeof(verified #> '{facts,missing}') IS DISTINCT FROM 'array'
       OR jsonb_typeof(verified #> '{facts,uncertainties}') IS DISTINCT FROM 'array'
       OR jsonb_typeof(verified #> '{facts,evidence_refs}') IS DISTINCT FROM 'array'
       OR (verified #>> '{support,status}'='handed_off' AND (
           coalesce(verified #>> '{support,assignee_role}','') NOT IN ('support','security')
           OR coalesce(verified #>> '{support,priority}','') NOT IN ('normal','high'))) THEN
        RETURN jsonb_build_object('request_id',request_id_value,'mode','error',
            'state_ref',NULL,'support',NULL,'facts',NULL,'response',NULL,
            'http_status',503,'error_code','case_verification_required');
    END IF;

    BEGIN
        INSERT INTO dubakwi_service.request_state (
            scope, request_id, owner_id, input_hash, case_id, first_request_id,
            jira_issue_id, jira_issue_key, processing_status, current_step, execution_id
        ) VALUES (
            scope_value, request_id_value, owner_value, input_hash_value,
            case_row.case_id, case_row.first_request_id,
            case_row.jira_issue_id, case_row.jira_issue_key,
            'processing', 'begin', execution_value
        )
        RETURNING * INTO state_row;
    EXCEPTION WHEN unique_violation THEN
        RETURN jsonb_build_object(
            'request_id', request_id_value, 'mode', 'pending',
            'state_ref', NULL, 'support', NULL, 'facts', NULL,
            'response', jsonb_build_object(
                'error', '기존 요청을 먼저 확인해야 합니다.',
                'codes', jsonb_build_array('case_busy')
            ),
            'http_status', 409, 'error_code', 'case_busy'
        );
    END;

    RETURN jsonb_build_object(
        'request_id', request_id_value,
        'mode', 'proceed',
        'state_ref', dubakwi_service.state_ref_json(state_row),
        'support', verified -> 'support',
        'facts', verified -> 'facts',
        'response', NULL,
        'http_status', 200,
        'error_code', NULL
    );
END
$$;


-- Read-only provider binding. Caller must supply server-configured scope and verified actor.
CREATE OR REPLACE FUNCTION dubakwi_service.record_lookup(payload jsonb)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY INVOKER
SET search_path = pg_catalog, dubakwi_service AS $$
DECLARE
    row_value dubakwi_service.request_state%ROWTYPE;
    scope_value text := nullif(btrim(payload ->> 'scope'),'');
    key_value text := nullif(btrim(payload ->> 'ticket_key'),'');
    owner_value text := nullif(btrim(payload ->> 'actor_id'),'');
BEGIN
    IF scope_value IS NULL OR owner_value IS NULL OR key_value IS NULL
       OR key_value !~ '^JBYS-[0-9]+$' THEN
        RETURN jsonb_build_object('ok',false,'error_code','invalid_state_request');
    END IF;
    SELECT * INTO row_value FROM dubakwi_service.request_state
    WHERE scope=scope_value AND jira_issue_key=key_value
    ORDER BY created_at,request_id LIMIT 1;
    IF NOT FOUND THEN RETURN jsonb_build_object('ok',true,'found',false); END IF;
    IF row_value.owner_id <> owner_value THEN
        RETURN jsonb_build_object('ok',true,'found',true,'owner_match',false);
    END IF;
    IF EXISTS (SELECT 1 FROM dubakwi_service.request_state
       WHERE scope=scope_value AND jira_issue_key=key_value
       AND (owner_id<>owner_value OR case_id<>row_value.case_id
            OR first_request_id<>row_value.first_request_id)) THEN
        RETURN jsonb_build_object('ok',false,'error_code','state_error');
    END IF;
    RETURN dubakwi_service.case_lookup(jsonb_build_object(
        'scope',scope_value,'case_ref',row_value.case_id,'actor_id',owner_value))
        || jsonb_build_object('scope',scope_value,'case_id',row_value.case_id,
             'owner_id',owner_value,'ticket_key',key_value);
END $$;

COMMIT;
