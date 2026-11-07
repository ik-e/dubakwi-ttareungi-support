\set ON_ERROR_STOP on
-- 008/009 only; disposable database. Preserve all rows by rolling back.
BEGIN;
DO $$
DECLARE
    result jsonb;
    ref jsonb;
    case_value text;
    snapshot jsonb;
    payload jsonb;
    first_hash text := repeat('a',64);
BEGIN
    result := dubakwi_service.state_apply(jsonb_build_object(
        'op','begin','scope','verify-context','execution_id','exec-first',
        'input_hash',first_hash,'actor',jsonb_build_object('id','citizen-a'),
        'request',jsonb_build_object('request_id','ctx-first','question','synthetic')));
    IF result->>'mode' <> 'proceed' THEN RAISE EXCEPTION 'seed begin'; END IF;
    ref:=result->'state_ref'; case_value:=result#>>'{support,case_id}';
    result:=dubakwi_service.state_apply(jsonb_build_object('op','bind','state_ref',ref,
        'args',jsonb_build_object('jira_issue_id','9001','jira_issue_key','JBYS-9001',
             'case_id',case_value,'first_request_id','ctx-first','next_step','B32')));
    IF result->>'ok' <> 'true' THEN RAISE EXCEPTION 'seed bind'; END IF;
    result:=dubakwi_service.state_apply(jsonb_build_object('op','finish','state_ref',result->'state_ref',
        'args',jsonb_build_object('current_step','respond','response',jsonb_build_object('request_id','ctx-first'))));
    IF result->>'ok' <> 'true' THEN RAISE EXCEPTION 'seed finish'; END IF;
    result:=dubakwi_service.case_lookup(jsonb_build_object('scope','verify-context',
        'case_ref',case_value,'actor_id','citizen-a'));
    IF result->>'latest_completed_request_id' <> 'ctx-first' OR result->>'has_unresolved' <> 'false'
       THEN RAISE EXCEPTION 'latest completed selection'; END IF;
    snapshot:=jsonb_build_object('schema_version',1,'scope','verify-context','case_id',case_value,
        'owner_id','citizen-a','ticket_key','JBYS-9001','first_request_id','ctx-first',
        'request_id','ctx-first','phase','save','event_id',repeat('b',64),'revision',1,
        'support',jsonb_build_object('case_id',case_value,'owner_id','citizen-a',
             'ticket_id','JBYS-9001','first_request_id','ctx-first','attempt',3,'version',NULL,
             'status','handed_off','assignee_role','support','priority','normal'),
        'facts',jsonb_build_object('summary','masked synthetic','reported',jsonb_build_array(
             jsonb_build_object('key','station_or_place','value','synthetic place','origin','user')),
             'confirmed','[]'::jsonb,'attempted_actions','["app restart"]'::jsonb,
             'missing','[]'::jsonb,'uncertainties','[]'::jsonb,'evidence_refs','[]'::jsonb));
    payload:=jsonb_build_object('scope','verify-context','execution_id','exec-followup',
        'input_hash',repeat('c',64),'actor',jsonb_build_object('id','citizen-a'),
        'request',jsonb_build_object('request_id','ctx-followup','case_ref',case_value),
        'jira_open',true,'jira_attempt',3,'verified_case',snapshot);
    result:=dubakwi_service.case_begin(payload-'verified_case');
    IF result->>'error_code' <> 'case_verification_required' THEN RAISE EXCEPTION 'legacy unverified accepted'; END IF;
    result:=dubakwi_service.case_begin(jsonb_set(payload,'{verified_case,request_id}','"not-completed"'));
    IF result->>'error_code' <> 'case_verification_required' THEN RAISE EXCEPTION 'wrong completed request accepted'; END IF;
    result:=dubakwi_service.case_begin(jsonb_set(payload,'{verified_case,support,version}','2'));
    IF result->>'error_code' <> 'case_verification_required' THEN RAISE EXCEPTION 'physical version accepted'; END IF;
    result:=dubakwi_service.case_begin(jsonb_set(payload,'{verified_case,owner_id}','"citizen-b"'));
    IF result->>'error_code' <> 'case_verification_required' THEN RAISE EXCEPTION 'wrong snapshot owner accepted'; END IF;
    result:=dubakwi_service.case_begin(jsonb_set(payload,'{jira_open}','false'));
    IF result->>'error_code' <> 'case_closed' THEN RAISE EXCEPTION 'closed accepted'; END IF;
    result:=dubakwi_service.case_begin(payload);
    IF result->>'mode' <> 'proceed' OR result#>>'{support,status}' <> 'handed_off'
       OR result#>>'{support,assignee_role}' <> 'support'
       OR result#>>'{support,attempt}' <> '3'
       OR result->'facts' IS DISTINCT FROM snapshot->'facts'
       THEN RAISE EXCEPTION 'verified facts/support not restored'; END IF;
    ref:=result->'state_ref';
    result:=dubakwi_service.case_begin(jsonb_set(payload,'{request,request_id}','"ctx-other"'));
    IF result->>'error_code' <> 'case_busy' THEN RAISE EXCEPTION 'second case request accepted'; END IF;
    result:=dubakwi_service.case_lookup(jsonb_build_object('scope','verify-context','case_ref',case_value,'actor_id','citizen-b'));
    IF result->>'owner_match' <> 'false' OR result ? 'latest_completed_request_id'
       THEN RAISE EXCEPTION 'other owner leaked'; END IF;
    result:=dubakwi_service.record_lookup(jsonb_build_object('scope','verify-context','ticket_key','JBYS-9001','actor_id','citizen-a'));
    IF result->>'owner_match' <> 'true' OR result->>'latest_completed_request_id' <> 'ctx-first'
       OR result->>'has_unresolved' <> 'true' THEN RAISE EXCEPTION 'records binding'; END IF;
    result:=dubakwi_service.record_lookup(jsonb_build_object('scope','verify-context','ticket_key','JBYS-9001','actor_id','citizen-b'));
    IF result->>'owner_match' <> 'false' OR result ? 'case_id' THEN RAISE EXCEPTION 'records leaked'; END IF;
    result:=dubakwi_service.record_lookup(jsonb_build_object('scope','other-scope','ticket_key','JBYS-9001','actor_id','citizen-a'));
    IF result->>'found' <> 'false' THEN RAISE EXCEPTION 'cross scope leak'; END IF;
    result:=dubakwi_service.state_apply(jsonb_build_object('op','finish','state_ref',ref,
        'args',jsonb_build_object('current_step','respond','response',jsonb_build_object('request_id','ctx-followup'))));
    IF result->>'ok' <> 'true' THEN RAISE EXCEPTION 'followup finish'; END IF;
    -- CURRENT_TIMESTAMP ties within one transaction; request_id is the stable tie breaker.
    result:=dubakwi_service.case_lookup(jsonb_build_object('scope','verify-context','case_ref',case_value,'actor_id','citizen-a'));
    IF result->>'latest_completed_request_id' <> 'ctx-followup' THEN RAISE EXCEPTION 'latest completed tie'; END IF;
END $$;

SET LOCAL ROLE dubakwi_records_reader;
SELECT dubakwi_service.record_lookup('{"scope":"verify-context","ticket_key":"JBYS-9001","actor_id":"citizen-a"}'::jsonb);
DO $$ BEGIN
    BEGIN
        UPDATE dubakwi_service.request_state SET current_step='should-not-write' WHERE false;
        RAISE EXCEPTION 'reader update was allowed';
    EXCEPTION WHEN insufficient_privilege THEN NULL; END;
    BEGIN
        PERFORM dubakwi_service.state_apply('{}'::jsonb);
        RAISE EXCEPTION 'reader state_apply was allowed';
    EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $$;
ROLLBACK;
