BEGIN;

REVOKE ALL ON SCHEMA dubakwi_service FROM PUBLIC;
REVOKE ALL ON TABLE dubakwi_service.request_state FROM PUBLIC;
REVOKE ALL ON TABLE dubakwi_service.dead_letters FROM PUBLIC;

GRANT USAGE ON SCHEMA dubakwi_service TO :"runtime_role";
GRANT SELECT, INSERT, UPDATE
    ON TABLE dubakwi_service.request_state, dubakwi_service.dead_letters
    TO :"runtime_role";

COMMIT;
