BEGIN;

-- 보완 요청(case_ref)의 서비스 쪽 확인을 위한 읽기 전용 조회.
-- 소유자가 아니면 case 내용을 돌려주지 않는다. Jira 열림 상태 확인은 호출 워크플로우가 한다.
CREATE FUNCTION dubakwi_service.case_lookup(payload jsonb)
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
    ORDER BY (jira_issue_key IS NULL), created_at
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
CREATE FUNCTION dubakwi_service.case_begin(payload jsonb)
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
        RETURN jsonb_build_object(
            'request_id', request_id_value, 'mode', 'error',
            'state_ref', NULL, 'support', NULL, 'facts', NULL,
            'response', NULL, 'http_status', 400,
            'error_code', 'invalid_state_request'
        );
    END IF;

    SELECT * INTO case_row
    FROM dubakwi_service.request_state
    WHERE scope = scope_value AND case_id = case_value
    ORDER BY (jira_issue_key IS NULL), created_at
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
        'support', jsonb_build_object(
            'case_id', case_row.case_id,
            'owner_id', owner_value,
            'ticket_id', case_row.jira_issue_key,
            'first_request_id', case_row.first_request_id,
            'attempt', attempt_value,
            'version', NULL,
            'status', 'waiting_info'
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
END
$$;

COMMIT;
