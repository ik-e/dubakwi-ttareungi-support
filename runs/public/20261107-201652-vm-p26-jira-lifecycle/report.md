# PR36 live Jira lifecycle and ownership-read check · R01 observation

- Run bundle: `20261107-201652-vm-p26-jira-lifecycle` (2026-11-07 KST)
- VM access: existing Edge Web SSH session; no direct SSH client.
- Test scope: two synthetic TC04/TC14-style support requests for `citizen-a`, then read-only Jira, user API, and PostgreSQL checks. No real contact/payment details were used. The internal key was read from its mounted file in-process and never printed.
- Ticket reference is masked in this shared report (`JBYS-***`).

## Outcomes

| Check | Result | Evidence boundary |
| --- | --- | --- |
| First support request | HTTP 200, `담당자 이관`, `needs_human`; ticket and `case_ref` present | Live PR36 core webhook; response alone is not the Jira effect check |
| Same-case follow-up | HTTP 200, `담당자 이관`; same Jira ticket returned | Live PR36 core webhook; no second ticket was created |
| Jira state and assignment | One open To Do issue, support assignee present, normal request stored as Medium priority | Jira issue UI; assignee identity omitted from shared report |
| Assignment/alert history | One unassigned→assignee transition; one attempted/sent label pair; the follow-up added context labels without another assignment transition or another sent marker | Jira History tab; sent marker is not proof a human read the notification |
| Context snapshots | Jira comments showed revision 1 for handoff and revision 2 for follow-up; revision 2 retained initial `usage_date`/`charge_detail` facts and added `payment_time` | Jira comments; shared report lists field names only |
| Owner lookup | User API `records_mode=jira`: owner `200` with record status `handed_off` | Direct read-only GET to the core user API |
| Privacy lookup boundaries | Different user `403`; missing key `404` | Direct read-only GETs; H22 normalizes both to the same citizen-facing denied result in the workflow |
| Request state and DLQ | Both request rows `completed` at `respond`, Jira key present; matching DLQ rows `0` | PostgreSQL `BEGIN READ ONLY` query followed by `ROLLBACK` |
| Handler lifecycle action | The synthetic ticket was transitioned in Jira UI from open/To Do to Resolved, with resolution `완료`; the transition and updated status appeared in Jira | Explicit user approval; current Jira login performed the test transition. This is a synthetic workflow action, not evidence of the assigned employee personally handling it |
| Citizen lookup after handler action | Owner GET returned HTTP 200 and status `closed` after Jira became Resolved | Direct read-only GET to core user API after transition; confirms the citizen-facing lookup follows Jira status |

## Limits and follow-up

The selected core workflow's Executions page still showed no saved execution rows, so node-level call counts and model timings could not be compared there. Jira History corroborates one assignment and one sent marker for this ticket, but does not establish Discord human receipt. The completion transition was deliberately made with the currently logged-in Jira account after user approval; it verifies the status-to-citizen-lookup path, not that the assigned employee personally performed the work or that a refund was made. J01 owner/other/missing API boundaries and this J02/J03 same-ticket follow-up plus post-transition owner lookup are verified for this synthetic case. TC15 fault injection, WF11 latency, RAG permission/citation cases, and the full VM manifest remain pending.

Unauthenticated ingress is separately recorded in [the HTTP 401 boundary check](../20261107-200826-vm-pr36-auth-boundary/report.md). Existing failures and previous run totals are unchanged.

## Documentation and artifact checks

After recording this addendum, `py -3 scripts/test/check_project_docs.py` reported 22 documents, 649 local links, 57 anchors, 0 errors; `py -3 scripts/test/check_public_files.py` reported 490 candidate files, 476 tracked, 0 ignored tracked files, 994 public local links, 0 errors. The summary JSON parsed successfully and `git diff --check` passed (line-ending warnings only). `tscan` is not installed in this workspace, and no staged-content scan was run; the repository public-file checker is the available substitute, with that limited coverage.
