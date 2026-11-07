BEGIN;
REVOKE ALL ON FUNCTION dubakwi_service.record_lookup(jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION dubakwi_service.case_lookup(jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION dubakwi_service.case_begin(jsonb) FROM PUBLIC;
-- Same explicitly supplied execution role as 006, never implicitly grant PUBLIC.
GRANT EXECUTE ON FUNCTION dubakwi_service.case_lookup(jsonb) TO :"runtime_role";
GRANT EXECUTE ON FUNCTION dubakwi_service.case_begin(jsonb) TO :"runtime_role";
-- Supply the actual n8n execution login here, not just a NOLOGIN membership role.
-- Effective for fresh connections; VM rollout must renew the target pool and SHOW these values.
ALTER ROLE :"runtime_role" SET statement_timeout = '500ms';
ALTER ROLE :"runtime_role" SET lock_timeout = '250ms';
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='dubakwi_records_reader') THEN
        CREATE ROLE dubakwi_records_reader NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE;
    END IF;
END $$;
GRANT USAGE ON SCHEMA dubakwi_service TO dubakwi_records_reader;
GRANT SELECT ON dubakwi_service.request_state TO dubakwi_records_reader;
GRANT EXECUTE ON FUNCTION dubakwi_service.record_lookup(jsonb) TO dubakwi_records_reader;
GRANT EXECUTE ON FUNCTION dubakwi_service.case_lookup(jsonb) TO dubakwi_records_reader;
COMMIT;
