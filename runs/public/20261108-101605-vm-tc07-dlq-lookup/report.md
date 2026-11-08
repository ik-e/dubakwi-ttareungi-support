# TC-07 PR36 DLQ and Jira read-only lookup

- Run ID: `20261108-101605-vm-tc07-dlq-lookup` (KST)
- Date: 2026-11-08
- Environment: VM PR36 PostgreSQL, n8n, and linked Jira GET
- Source commit: `3b7bc74` (`P18: integrate DLQ lookup into operator workflow`)
- Database migration: `017-operator-dlq-list.sql`
- Workflow: existing inactive `dubakwi-recovery-operator` manual test workflow, same workflow ID
- Scenario: TC-07 unresolved DLQ list/inspect, then linked Jira status/assignee read

## Result

PASS for the requested read-only lookup integration. A private dump of the
configured PR36 database was archive-validated and restored to a separate
database. On the restore, the existing `recovery_finish(jsonb)` was already
present; migrations 010–016 were not reapplied. Migration 017 applied
successfully, and a targeted read-only check as `dubakwi_recovery_operator`
verified a bounded list, a sanitized inspect, and no direct table SELECT for
the login. The broader `operator-dlq-list-contract.sql` was also attempted but
stopped at its recovery-dispatcher check because `recovery_control(jsonb)` is
not part of this dual-storage restore. No pass is claimed for that broader
contract.

Migration 017 then applied to the configured PR36 database. The VM lacked the
canonical workflow ID from the source JSON, so the existing inactive
`R01 TC07 operator E2E` manual test workflow ID was reused in place; no
additional workflow ID was created. That workflow executed list and inspect
successfully using the actual scope `dubakwi-p19-real`. Inspect found linked
Jira issue `JBYS-33`; the existing
`dubakwi-Jira SW Cloud account` performed a read-only GET. The returned status
was `해야 할 일`; assignee was null (unassigned).

The first Jira test input contained a mistyped DLQ ID and returned
`recovery_not_found`; that failed attempt is retained in n8n execution history.
The corrected ID then passed. In a separate schema-reconciliation mistake,
migration 017 had first been applied to the service database; both lookup
functions were subsequently dropped there. No service data rows were modified.

## Checks and effects

| Check | Result |
| --- | --- |
| Private PR36 dump archive validation | PASS |
| Restore to separate database | PASS |
| Migration 017 on restored PR36 DB | PASS |
| Targeted list and inspect as operator role | PASS; 5 listed, inspect object valid and sanitized |
| Recovery operator direct table SELECT | DENIED as intended |
| Broader `operator-dlq-list-contract.sql` | INCOMPLETE; requires `recovery_control(jsonb)` absent from this restore |
| Migration 017 on configured PR36 DB | PASS |
| Existing n8n workflow list execution | PASS |
| Existing n8n workflow inspect execution | PASS |
| Linked Jira status/assignee GET | PASS; issue found, status `해야 할 일`, assignee null |
| Workflow active after execution | `false` |
| Manual test payload after execution | reset to `{}` |
| PR36 request/state/DLQ writes | 0 |
| Jira writes / Discord sends | 0 / 0 |
| Wrong service DB lookup functions | removed after reconciliation |
| `check_project_docs.py` | PASS; 22 files, 775 local links, 58 anchors |
| `check_public_files.py` | PASS; 580 candidate paths, 1,144 public local links |
| `git diff --check` and evidence JSON parse | PASS |

## Boundaries

This run verifies the TC-07 **read-only lookup slice** only. It does not verify
DLQ retry/recovery actions, Discord, Jira mutation, or full operator recovery
contracts on the PR36 dual-storage database. The workflow remains inactive and
the test input is blank. Importing the source workflow under its canonical
source ID remains separate; the tested existing VM manual test workflow can
execute while inactive. Earlier failed attempts and the restore contract
failure remain preserved in their original execution/evidence records.
