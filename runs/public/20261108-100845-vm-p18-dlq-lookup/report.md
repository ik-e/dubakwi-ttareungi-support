# TC-07 PR36 VM lookup deployment attempt

- Run ID: `20261108-100845-vm-p18-dlq-lookup` (KST)
- Date: 2026-11-08
- Environment: VM n8n and PostgreSQL, plus a private restored database
- Source: `3b7bc74` (`P18: integrate DLQ lookup into operator workflow`)
- Workflow: existing manual recovery operator workflow, updated in place
- Scenario: read-only DLQ list/inspect and linked Jira lookup

## Outcome

Partial; deployment is not accepted. The existing n8n workflow was imported in
place with the existing workflow ID and remained inactive. A UI execution routed
to the DLQ lookup node and failed because `dubakwi_service.recovery_lookup(jsonb)`
was absent in the database used by that credential. No Jira request was reached.

A private custom-format backup of the configured PR36 database was created and
validated, then restored to a separate database. The restored database contains
the expected DLQ/state tables and rows. Applying migration 010 stopped because
`recovery_finish(jsonb)` already exists, so migrations 011–017 and their
verification contracts were not run on that restore or the configured database.
This first failed migration attempt is preserved; no retry result is implied.

During target reconciliation, migration 017 was applied to the other service
database before the credential target was identified. It added only the read-only
list/lookup functions and operator grants; it did not alter request/DLQ rows or
call Jira/Discord. Removing those functions and confirming grants remain needed.

## Checks and observed effects

| Check | Result |
| --- | --- |
| Private PR36 database dump archive validation | PASS |
| Restore to separate empty database | PASS |
| Existing operator workflow imported in place | PASS; same ID, inactive |
| Live n8n lookup execution | FAIL at missing `recovery_lookup(jsonb)` |
| Migration sequence on restored PR36 database | BLOCKED at migration 010 duplicate function |
| Jira read/write | 0 requests / 0 writes |
| Discord send | 0 |
| PR36 request state or DLQ rows changed | 0 |

## Remaining work

- Reconnect to the VM through the Edge web SSH tab.
- Inspect the existing `recovery_finish(jsonb)` definition and migration state;
  reconcile the correct forward-only migration path without replacing an
  unknown existing function.
- Apply the lookup migration to the configured PR36 database after a successful
  restore rehearsal and run the SQL contract there.
- Remove the mistakenly applied lookup functions from the other service DB,
  after verifying their exact signatures and grants.
- Run a read-only DLQ lookup and linked Jira GET through the existing operator
  workflow; verify the workflow remains inactive after the manual execution.

## Preserved prior evidence

The local-only report at `20261108-094943-local-existing-operator-lookup` and
all earlier first-failure evidence remain unchanged.
