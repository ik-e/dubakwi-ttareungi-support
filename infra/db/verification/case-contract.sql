\set ON_ERROR_STOP on

-- 005 case_lookup / case_begin 계약 확인. 폐기 가능한 시험 DB에서만 실행하고 ROLLBACK으로 끝난다.
BEGIN;

DO $$
DECLARE
    first_ref jsonb;
    result jsonb;
    case_id_value text;
    hash_a text := repeat('a', 64);
    hash_b text := repeat('b', 64);
    hash_c text := repeat('c', 64);
BEGIN
    -- 준비: 첫 문의 begin -> bind -> finish
    result := dubakwi_service.state_apply(jsonb_build_object(
        'op', 'begin', 'scope', 'verify-case', 'execution_id', 'exec-c1', 'input_hash', hash_a,
        'actor', jsonb_build_object('id', 'citizen-a'),
        'request', jsonb_build_object('request_id', 'req-c1', 'question', 'synthetic', 'attempt', 1)
    ));
    IF result ->> 'mode' <> 'proceed' THEN RAISE EXCEPTION 'seed begin failed: %', result; END IF;
    first_ref := result -> 'state_ref';
    case_id_value := result #>> '{support,case_id}';

    result := dubakwi_service.state_apply(jsonb_build_object(
        'op', 'bind', 'state_ref', first_ref,
        'args', jsonb_build_object('jira_issue_id', '10001', 'key', 'JBYS-1', 'case_id', case_id_value,
                                   'first_request_id', 'req-c1', 'next_step', 'B32')
    ));
    IF (result ->> 'ok')::boolean IS NOT TRUE THEN RAISE EXCEPTION 'seed bind failed: %', result; END IF;

    -- 처리 중인 case는 busy
    result := dubakwi_service.case_lookup(jsonb_build_object(
        'scope', 'verify-case', 'case_ref', case_id_value, 'actor_id', 'citizen-a'));
    IF NOT ((result ->> 'found')::boolean AND (result ->> 'owner_match')::boolean AND (result ->> 'busy')::boolean
            AND result ->> 'jira_issue_key' = 'JBYS-1') THEN
        RAISE EXCEPTION 'busy lookup mismatch: %', result;
    END IF;
    result := dubakwi_service.case_begin(jsonb_build_object(
        'scope', 'verify-case', 'execution_id', 'exec-c2', 'input_hash', hash_b, 'jira_open', true, 'jira_attempt', 2,
        'actor', jsonb_build_object('id', 'citizen-a'),
        'request', jsonb_build_object('request_id', 'req-c2', 'case_ref', case_id_value, 'attempt', 2)
    ));
    IF result ->> 'error_code' <> 'case_busy' OR result ->> 'mode' <> 'pending' OR (result ->> 'http_status')::int <> 409 THEN
        RAISE EXCEPTION 'busy case_begin mismatch: %', result;
    END IF;

    -- 첫 요청 완료 후 case가 비활성
    result := dubakwi_service.state_apply(jsonb_build_object(
        'op', 'finish', 'state_ref', (SELECT dubakwi_service.state_ref_json(r) FROM dubakwi_service.request_state r
                                      WHERE scope = 'verify-case' AND request_id = 'req-c1'),
        'args', jsonb_build_object('current_step', 'respond', 'response', jsonb_build_object('request_id', 'req-c1'))
    ));
    IF (result ->> 'ok')::boolean IS NOT TRUE THEN RAISE EXCEPTION 'seed finish failed: %', result; END IF;

    -- 알 수 없는 case -> 400, 타인 -> 403(내용 없음), 닫힘 -> 409
    result := dubakwi_service.case_lookup(jsonb_build_object('scope', 'verify-case', 'case_ref', 'case-unknown', 'actor_id', 'citizen-a'));
    IF (result ->> 'found')::boolean THEN RAISE EXCEPTION 'unknown case found: %', result; END IF;

    result := dubakwi_service.case_lookup(jsonb_build_object('scope', 'verify-case', 'case_ref', case_id_value, 'actor_id', 'citizen-b'));
    IF NOT ((result ->> 'found')::boolean AND NOT (result ->> 'owner_match')::boolean AND result ->> 'jira_issue_key' IS NULL) THEN
        RAISE EXCEPTION 'other owner lookup leaked or mismatched: %', result;
    END IF;

    result := dubakwi_service.case_begin(jsonb_build_object(
        'scope', 'verify-case', 'execution_id', 'exec-c3', 'input_hash', hash_c, 'jira_open', true, 'jira_attempt', 2,
        'actor', jsonb_build_object('id', 'citizen-b'),
        'request', jsonb_build_object('request_id', 'req-c3', 'case_ref', case_id_value, 'attempt', 2)
    ));
    IF result ->> 'error_code' <> 'case_access_denied' OR (result ->> 'http_status')::int <> 403 THEN
        RAISE EXCEPTION 'other owner case_begin mismatch: %', result;
    END IF;
    IF EXISTS (SELECT 1 FROM dubakwi_service.request_state WHERE scope = 'verify-case' AND request_id = 'req-c3') THEN
        RAISE EXCEPTION 'denied request must not create state';
    END IF;

    result := dubakwi_service.case_begin(jsonb_build_object(
        'scope', 'verify-case', 'execution_id', 'exec-c3', 'input_hash', hash_c, 'jira_open', true, 'jira_attempt', 2,
        'actor', jsonb_build_object('id', 'citizen-a'),
        'request', jsonb_build_object('request_id', 'req-c4', 'case_ref', 'case-unknown', 'attempt', 2)
    ));
    IF result ->> 'error_code' <> 'invalid_case_ref' OR (result ->> 'http_status')::int <> 400 THEN
        RAISE EXCEPTION 'unknown case_begin mismatch: %', result;
    END IF;

    result := dubakwi_service.case_begin(jsonb_build_object(
        'scope', 'verify-case', 'execution_id', 'exec-c3', 'input_hash', hash_c, 'jira_open', false, 'jira_attempt', 2,
        'actor', jsonb_build_object('id', 'citizen-a'),
        'request', jsonb_build_object('request_id', 'req-c5', 'case_ref', case_id_value, 'attempt', 2)
    ));
    IF result ->> 'error_code' <> 'case_closed' OR (result ->> 'http_status')::int <> 409 THEN
        RAISE EXCEPTION 'closed case_begin mismatch: %', result;
    END IF;

    -- 정상 보완: 같은 case_id·first_request_id·Jira key를 이어 새 요청이 처리권을 얻는다.
    result := dubakwi_service.case_begin(jsonb_build_object(
        'scope', 'verify-case', 'execution_id', 'exec-c6', 'input_hash', hash_c, 'jira_open', true, 'jira_attempt', 2,
        'actor', jsonb_build_object('id', 'citizen-a'),
        'request', jsonb_build_object('request_id', 'req-c6', 'case_ref', case_id_value, 'attempt', 2)
    ));
    IF result ->> 'mode' <> 'proceed' OR result #>> '{support,case_id}' <> case_id_value
       OR result #>> '{support,first_request_id}' <> 'req-c1' OR result #>> '{support,ticket_id}' <> 'JBYS-1'
       OR (result #>> '{support,attempt}')::int <> 2 OR (result #>> '{state_ref,state_revision}')::int <> 0 THEN
        RAISE EXCEPTION 'proceed case_begin mismatch: %', result;
    END IF;

    -- 같은 case의 두 번째 활성 요청은 막힌다.
    result := dubakwi_service.case_begin(jsonb_build_object(
        'scope', 'verify-case', 'execution_id', 'exec-c7', 'input_hash', hash_b, 'jira_open', true, 'jira_attempt', 3,
        'actor', jsonb_build_object('id', 'citizen-a'),
        'request', jsonb_build_object('request_id', 'req-c7', 'case_ref', case_id_value, 'attempt', 3)
    ));
    IF result ->> 'error_code' <> 'case_busy' THEN RAISE EXCEPTION 'second active request allowed: %', result; END IF;

    -- 입력 계약 오류
    result := dubakwi_service.case_begin(jsonb_build_object('scope', 'verify-case'));
    IF result ->> 'error_code' <> 'invalid_state_request' THEN RAISE EXCEPTION 'invalid input accepted: %', result; END IF;
END
$$;

ROLLBACK;
