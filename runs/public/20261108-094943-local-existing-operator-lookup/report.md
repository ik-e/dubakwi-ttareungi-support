# TC-07 DLQ lookup integration: local verification

- Run ID: `20261108-094943-local-existing-operator-lookup` (KST)
- Date: 2026-11-08
- Environment: local repository and disposable PostgreSQL 16.15
- Source: branch `r01/p18-dlq-jira-lookup`, working tree changes based on `fc56bb4`
- Workflow source: existing `workflows/dubakwi-recovery-operator.json`
- Database source: migrations 001–017, including migration 017
- Scenario: TC-07 read-only DLQ list/inspect and linked Jira status/assignee lookup

## Outcome

Local verification passed. The query feature is integrated into the existing manual recovery-operator workflow source and reuses the existing `dubakwi_recovery_operator` NOLOGIN role, the existing `dubakwi-recovery-operator` PostgreSQL credential, and the existing `dubakwi-Jira SW Cloud account` credential for Jira GET. The separate lookup workflow and separate reader role were removed from the current candidate.

`list` returns bounded unresolved DLQ metadata. `inspect` returns a sanitized DLQ/state view. A valid linked Jira key is sent to a read-only Jira REST GET for status and assignee display name. The lookup branch cannot claim/resume/finish/release/complete recovery work or mutate Jira. It does not send Discord notifications. Existing recovery commands retain their prior route.

## Checks

| Check | Result |
| --- | --- |
| `tc07-dlq-lookup-workflow-contract.js` | PASS, 37 checks |
| `tc07-operator-workflow-contract.js` | PASS, 25 checks |
| `tc07-finish-capsule-contract.js` | PASS, 3/3 |
| `tc07-handoff-recovery-capsule-contract.js` | PASS, 6 checks |
| Fresh disposable PostgreSQL 16.15, migrations 001–017 | PASS |
| `operator-dlq-list-contract.sql` | PASS: bounded list, pending/reprocessing filter, sanitized inspect, operator execute, runtime denied, no direct table SELECT, no separate reader role |
| Workflow JSON and n8n Code node syntax | PASS |
| `git diff --check` | PASS |
| `check_project_docs.py` | PASS, 22 files / 772 local links / 58 anchors |
| `check_public_files.py` | PASS, 576 Git candidates / 1,140 public links |
| Python unittest discovery | PASS, 148 tests / 7 skipped |

The disposable PostgreSQL run first exposed two test-fixture setup omissions (the `runtime_role` psql variable and the corresponding role). The fixture was corrected; the final fresh database run passed. These were local harness setup failures, not VM or application failures.

The first public-file scan was run before staging the removed superseded workflow path and flagged that deleted path as still in the Git index. After staging the deletion, the scan passed. No file content was lost from the earlier report for the superseded candidate.

## Not verified / deployment gate

- No Jira REST request was executed in this run. The n8n UI credential inventory confirmed the existing Dubakwi credential name and Jira domain, but the API response remains unverified.
- Migration 017 has not been applied to the VM. Its fresh private backup/restore rehearsal is still required before VM migration.
- The updated workflow source has not been imported or updated in the VM n8n instance; the existing TC-07 operator test copy remains deactivated.
- No live DLQ data was read or changed, no Jira issue was created or changed, and no Discord message was sent.
- This evidence is local verification only; it is not a completed VM integration result.

## Preserved evidence

Earlier evidence for the superseded separate-workflow candidate remains unchanged at `20261108-091400-local-dlq-jira-lookup`. The current evidence records the corrected existing-workflow integration and does not rewrite the earlier result.
