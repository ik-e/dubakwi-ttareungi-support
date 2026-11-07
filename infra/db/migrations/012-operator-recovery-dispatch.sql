-- Single allowlisted entry point for the manual operator workflow.
BEGIN;

CREATE FUNCTION dubakwi_service.recovery_control(payload jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = pg_catalog, dubakwi_service
AS $$
BEGIN
    IF jsonb_typeof(payload) IS DISTINCT FROM 'object' THEN
        RETURN jsonb_build_object('ok', false, 'error_code', 'invalid_recovery_request');
    END IF;

    CASE payload ->> 'op'
        WHEN 'inspect' THEN
            RETURN dubakwi_service.recovery_finish(payload);
        WHEN 'finish' THEN
            RETURN dubakwi_service.recovery_finish(payload);
        WHEN 'claim' THEN
            RETURN dubakwi_service.recovery_claim(payload);
        WHEN 'release' THEN
            RETURN dubakwi_service.recovery_release(payload);
        ELSE
            RETURN jsonb_build_object('ok', false, 'error_code', 'invalid_recovery_request');
    END CASE;
END;
$$;

REVOKE ALL ON FUNCTION dubakwi_service.recovery_control(jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION dubakwi_service.recovery_control(jsonb)
    TO dubakwi_recovery_operator;

COMMIT;
