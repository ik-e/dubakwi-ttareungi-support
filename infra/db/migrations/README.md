# R04 service-storage migrations

This directory prepares the two PostgreSQL tables owned by the R04 storage
boundary. Jira remains the ticket source of truth, and n8n keeps its own
execution history. Database data, dumps, connection strings, and passwords must
stay outside Git.

## Proposed runtime baseline

- PostgreSQL image: `postgres:16.15-bookworm`, pinned to the VM architecture's
  reviewed digest by R01.
- Network: internal Docker network only; do not publish PostgreSQL port `5432`.
- Storage: a persistent volume separate from n8n SQLite and its volume.
- Roles: a migration owner for DDL and a separate login that inherits a
  no-login runtime role. The runtime role has only `USAGE`, `SELECT`, `INSERT`,
  and `UPDATE` on the R04 schema and two tables.

R01 creates the environment-specific login and no-login runtime roles without
putting passwords in this repository. The examples below use
`dubakwi_runtime` only as a non-secret role name.

## Apply

Run each migration in filename order with `ON_ERROR_STOP`. Apply the first file
once to a new service database. A repeated initial migration intentionally fails
if the tables already exist instead of silently accepting schema drift.

```sh
psql "$DUBAKWI_DATABASE_URL" -v ON_ERROR_STOP=1 \
  -f infra/db/migrations/001-create-service-storage.sql

psql "$DUBAKWI_DATABASE_URL" -v ON_ERROR_STOP=1 \
  -v runtime_role=dubakwi_runtime \
  -f infra/db/migrations/002-grant-runtime-access.sql
```

Record the applied commit and migration filenames in the private deployment
record. Do not echo the connection URL or attach command output containing
server details to a public report.

## Required application behavior

- Acquire new request ownership with one atomic insert; only the successful
  insert may proceed to LLM or Jira work.
- Compare the expected `revision` and permitted status in every conditional
  update, then increment `revision` in that same statement.
- Update `updated_at` explicitly in every successful state change.
- Bind a known Jira ID before any later Jira mutation.
- Never add a foreign key from `dead_letters` to `request_state`; a DLQ write
  must remain possible when state storage failed.
- Use parameterized SQL only. Do not accept table, schema, URL, SQL, or code
  identifiers from a workflow payload.
- Do not grant the runtime login `CREATE`, `ALTER`, `DROP`, `TRUNCATE`, or
  role-management privileges.

## Verify before n8n connection

1. Apply both migrations to an empty test database.
2. Confirm the runtime login can select, insert, and conditionally update both
   tables.
3. Confirm the runtime login cannot create, alter, drop, truncate, or delete.
4. Confirm duplicate `(scope, request_id)`, duplicate active `(scope, case_id)`,
   invalid status, negative revision, and completed state without a response are
   rejected.
5. Confirm duplicate `(scope, failure_key)` is rejected so the application must
   update the existing DLQ item.
6. Restart PostgreSQL and confirm the two tables and inserted test rows remain.

## Backup and restore check

Create a custom-format dump in a private directory outside the repository before
schema changes and according to the schedule R01 and R04 agree for the VM.

```sh
pg_dump "$DUBAKWI_DATABASE_URL" --format=custom --no-owner --no-acl \
  --file "$DUBAKWI_BACKUP_FILE"
```

Restore into a separate empty test database as the intended migration owner,
never over the live database. Because the dump deliberately omits ownership and
ACLs, restored objects become owned by the role that performs the restore and
runtime grants are not restored. Use the following order:

1. Create an empty restore-test database owned by the intended migration owner.
2. Restore the custom dump with `--no-owner --no-acl` while connected as that
   migration owner.
3. Verify that the `dubakwi_service` schema and both tables are owned by the
   intended migration owner. Stop if another or privileged login owns them.
4. Reapply `002-grant-runtime-access.sql` with the environment's no-login
   runtime role. This repeats the `PUBLIC` revokes and the minimum grants.
5. Connect as the environment's runtime login and repeat the allow/deny tests
   below. Do not accept a restore based only on row counts.
6. Verify row counts, constraints, indexes, unresolved DLQ entries, and the
   application health check before declaring the backup restorable.

Owner verification queries run as the migration owner or another read-only
catalog observer:

```sql
SELECT n.nspname AS schema_name, pg_get_userbyid(n.nspowner) AS owner
FROM pg_namespace AS n
WHERE n.nspname = 'dubakwi_service';

SELECT c.relname AS object_name, c.relkind, pg_get_userbyid(c.relowner) AS owner
FROM pg_class AS c
JOIN pg_namespace AS n ON n.oid = c.relnamespace
WHERE n.nspname = 'dubakwi_service'
ORDER BY c.relkind, c.relname;
```

The schema, tables, and owned indexes must resolve to the reviewed migration
owner. Environment-specific role names and catalog output stay in the private
deployment record.

Reapply runtime permissions after restore:

```sh
psql "$DUBAKWI_RESTORE_DATABASE_URL" -v ON_ERROR_STOP=1 \
  -v runtime_role=dubakwi_runtime \
  -f infra/db/migrations/002-grant-runtime-access.sql
```

Run the following behavior checks with the runtime login in a disposable
transaction. `SELECT`, `INSERT`, and a revision-checked `UPDATE` on both tables
must succeed and then be rolled back. `DELETE`, `TRUNCATE`, `ALTER`, `DROP`, and
creating an object in `dubakwi_service` must each fail. Execute expected-denial
statements separately so one expected error does not hide later checks. Do not
run denial tests against the live database.

A dump is not accepted as a working backup until owner verification, permission
reapplication, runtime allow/deny checks, and data/constraint checks all pass.

The backup directory, retention period, encryption/access policy, and restore
operator remain environment decisions for R01 and R04. Git, the n8n SQLite
volume, Jira, and PostgreSQL backups are separate recovery scopes.

## Current limitation

These files are a migration and permission proposal. They are not evidence that
PostgreSQL was started, migrated, backed up, restored, or connected to n8n on the
team VM.

## Local validation evidence (2026-11-05)

This is a redacted summary: it contains no connection URL, role login, server
address, row contents, or credentials. The official `runs/public/` evidence and
team verdict remain subject to R05 review.

- Static inspection found both required tables, required constraints and
  indexes, no foreign key from `dead_letters` to `request_state`, and only
  `USAGE`, `SELECT`, `INSERT`, and `UPDATE` runtime grants.
- `uv run --locked python -m unittest discover -s scripts/test -p 'test_*.py'`
  ran 45 tests: 38 passed and 7 HTTP environment-dependent tests were skipped.
- Ruff check/format and the public-file audit passed; staged secret-pattern
  matches were zero.
- No PostgreSQL server or `psql` client was available. DDL application, restored
  ownership, permission reapplication, runtime allow/deny behavior, restart
  persistence, and backup/restore remain unexecuted.

The validation baseline was commit `3caf6ad` on main `0e44fdb`. This section is
the local evidence path for the migration preparation only, not VM acceptance.
