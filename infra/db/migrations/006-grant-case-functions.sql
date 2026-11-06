BEGIN;

REVOKE ALL ON FUNCTION dubakwi_service.case_lookup(jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION dubakwi_service.case_begin(jsonb) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION dubakwi_service.case_lookup(jsonb) TO :"runtime_role";
GRANT EXECUTE ON FUNCTION dubakwi_service.case_begin(jsonb) TO :"runtime_role";

COMMIT;
