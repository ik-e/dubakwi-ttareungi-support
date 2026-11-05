\set ON_ERROR_STOP on

SELECT set_config('dubakwi.verify_runtime_login', :'runtime_login', false);
SELECT set_config('dubakwi.verify_runtime_role', :'runtime_role', false);

DO $$
DECLARE
    login_name text := current_setting('dubakwi.verify_runtime_login');
    role_name text := current_setting('dubakwi.verify_runtime_role');
    attrs record;
BEGIN
    SELECT rolsuper, rolcreaterole, rolcreatedb, rolbypassrls
      INTO STRICT attrs
      FROM pg_roles
     WHERE rolname = login_name;

    IF attrs.rolsuper OR attrs.rolcreaterole OR attrs.rolcreatedb
       OR attrs.rolbypassrls THEN
        RAISE EXCEPTION 'runtime login has a forbidden cluster privilege';
    END IF;

    IF NOT pg_has_role(login_name, role_name, 'MEMBER') THEN
        RAISE EXCEPTION 'runtime login does not inherit the reviewed runtime role';
    END IF;
END;
$$;

SELECT
    r.rolname,
    r.rolsuper,
    r.rolcreaterole,
    r.rolcreatedb,
    r.rolbypassrls,
    pg_has_role(
        current_setting('dubakwi.verify_runtime_login'),
        current_setting('dubakwi.verify_runtime_role'),
        'MEMBER'
    ) AS inherits_runtime_role
FROM pg_roles AS r
WHERE r.rolname = current_setting('dubakwi.verify_runtime_login');
