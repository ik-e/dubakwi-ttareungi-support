\set ON_ERROR_STOP on

SELECT 'request_state' AS object_name, count(*) AS row_count
FROM dubakwi_service.request_state
UNION ALL
SELECT 'dead_letters', count(*)
FROM dubakwi_service.dead_letters
ORDER BY object_name;

SELECT
    c.conname AS constraint_name,
    c.contype AS constraint_type,
    pg_get_constraintdef(c.oid, true) AS definition
FROM pg_constraint AS c
JOIN pg_namespace AS n ON n.oid = c.connamespace
WHERE n.nspname = 'dubakwi_service'
ORDER BY c.conrelid::regclass::text, c.conname;

SELECT
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes
WHERE schemaname = 'dubakwi_service'
ORDER BY tablename, indexname;

SELECT
    scope,
    dlq_id,
    failure_key,
    replay_status,
    revision
FROM dubakwi_service.dead_letters
WHERE replay_status <> 'resolved'
ORDER BY scope, dlq_id;
