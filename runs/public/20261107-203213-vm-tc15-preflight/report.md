# TC-15 live fault-injection preflight

- Run: `20261107-203213-vm-tc15-preflight` (2026-11-07 KST)
- Case: TC-15 (synthetic handoff alert fault)
- Status: **NOT RUN — blocked before import/execution**
- User approval: received for the synthetic request and its expected Jira/DLQ side effects.

## Findings

The published PR36 support workflow was exported from the n8n UI. It is active and routes Jira handoff to the live PR36 handoff webhook. The support workflow also calls PR36-specific state and DLQ child workflows. The existing private fault-copy attempt was based on the tracked local workflow source (its source hash matches `workflows/dubakwi-support.json`), not the live support export. Therefore it cannot be treated as a faithful copy of the deployed system.

The currently published PR36 Jira handoff workflow was not exported. No test copy was imported or activated, and no request was sent. No Jira issue, Discord alert, state row, DLQ row, or VM workflow change was created by this preflight. The production support workflow remained published/active.

## Required continuation

1. Export the current PR36 handoff workflow through the n8n UI and inspect only its non-secret contract, nodes, webhook path, and credential references.
2. Regenerate both inactive test copies from live exports, using distinct webhook paths. The test support copy must redirect only B27 to the test handoff webhook and retain the verified PR36 state/DLQ child IDs and existing scope.
3. Inspect the exported JSON for embedded secret values, confirm both copies are inactive and production IDs/paths are unchanged, then import and activate only the two copies.
4. Execute the approved TC-15 first request and same-case followup once each; read back Jira, state, DLQ, and execution evidence; deactivate the copies.
5. Record the first result and any retest in distinct run bundles.

No TC-15 expected outcome is marked passed.
