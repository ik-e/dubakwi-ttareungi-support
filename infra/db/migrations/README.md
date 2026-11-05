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

Restore into a separate empty test database, never over the live database, and
verify row counts, constraints, indexes, and unresolved DLQ entries. A dump is
not accepted as a working backup until this restore check passes.

The backup directory, retention period, encryption/access policy, and restore
operator remain environment decisions for R01 and R04. Git, the n8n SQLite
volume, Jira, and PostgreSQL backups are separate recovery scopes.

## Current limitation

These files are a migration and permission proposal. They are not evidence that
PostgreSQL was started, migrated, backed up, restored, or connected to n8n on the
team VM.
