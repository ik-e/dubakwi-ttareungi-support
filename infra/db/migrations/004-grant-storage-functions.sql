BEGIN;

REVOKE ALL ON FUNCTION dubakwi_service.state_ref_json(
    dubakwi_service.request_state
) FROM PUBLIC;
REVOKE ALL ON FUNCTION dubakwi_service.state_apply(jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION dubakwi_service.dlq_apply(jsonb) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION dubakwi_service.state_ref_json(
    dubakwi_service.request_state
) TO :"runtime_role";
GRANT EXECUTE ON FUNCTION dubakwi_service.state_apply(jsonb)
    TO :"runtime_role";
GRANT EXECUTE ON FUNCTION dubakwi_service.dlq_apply(jsonb)
    TO :"runtime_role";

COMMIT;
