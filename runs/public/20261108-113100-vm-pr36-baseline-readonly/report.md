# VM PR36 and UX baseline snapshot (read-only)

- Run ID: `20261108-113100-vm-pr36-baseline-readonly` (KST)
- Date: 2026-11-08
- Environment: Edge web SSH, VM Docker, n8n UI, PostgreSQL catalog
- Code baseline: local/remote `main` `dd919d7`; VM runtime tags are independently observed, not proven to match this commit
- Scope: read-only inventory only; no workflow execution, service mutation, DB write, Jira change, or Discord send

## Runtime snapshot

| Component | Observed state |
| --- | --- |
| VM kernel | `7.0.0-42-generic` |
| Docker server | `29.9.2` |
| PR36 user API | Running, healthy, image `dubakwi-user-api:pr36-a657890`, image ID prefix `sha256:4001727dbd9d45227c7aa9d`; tag suffix resolves in the repository to commit `a65789086a5c1151ff8c431759bab8b79877456e` |
| UX user API | Running, healthy, image `dubakwi-user-api:ux-6f9561b`, image ID prefix `sha256:2cd3c43c2553943fc20d3d9`; tag suffix resolves to commit `6f9561bae48ad5da44b726f95c18d29024ba0d0d` |
| Discord bot | Running, image `dubakwi-discord-bot:pr36-1328c63`, image ID prefix `sha256:1aeb6fc597b7a9913f339917`; tag suffix resolves to commit `1328c63fffae69236ece37c8f554ba4669c93dea` |
| n8n server | Running, image `dubakwi-n8n-auth-boundary:pr36-a657890`, image ID prefix `sha256:99c18d48ffa86a9a8040ae2a`; `n8n --version` returns `2.42.6` |
| PostgreSQL | Running, healthy, image `postgres:16.15-bookworm`, image ID prefix `sha256:e8a07d2c7579b03b8938cdb`; server version `16.15` |
| Search | Running, image `ghcr.io/searxng/searxng:latest`, image ID prefix `sha256:f1bbc31c7bef7a7d8dd2b105`, image version label `2026.10.30-1cd13d98d`; `latest` remains a mutable tag |
| Course-data API | Running, image `python`, image ID prefix `sha256:b18b261e1b49474bf321451a`; source revision/version label not present |
| n8n runners | Running, image `ghcr.io/n8n-io/runners:2.42.6`, image ID prefix `sha256:b78816286beb0a14`; runner version `2.42.6` |
| API deployment layout | PR36 and UX API projects are both running in parallel |

OCI revision/version labels were empty on the two user API images and Discord bot. The short commit-like image tag suffixes match repository commits, but absent OCI revision labels mean that the image-to-source build provenance is not independently proven. The live runtime tag `pr36-a657890` is an older code baseline than repository `main`/`origin/main` `dd919d7`; record VM tests against the image ID and workflow snapshot rather than attributing them to `dd919d7`. No environment values, credentials, host addresses, or deployment paths were collected into this public record.

## PostgreSQL read-only catalog

The target database `pr36_dual_storage_a657890` reports PostgreSQL `16.15 (Debian 16.15-1.pgdg12+2)`. Catalog checks returned:

| Function | Present |
| --- | --- |
| `dubakwi_service.recovery_finish(jsonb)` | yes |
| `dubakwi_service.recovery_list(jsonb)` | yes |
| `dubakwi_service.recovery_lookup(jsonb)` | yes |
| `dubakwi_service.recovery_control(jsonb)` | no |

The first catalog query used the default database and returned false for all these functions. The corrected query explicitly selected the PR36 database above. This correction is recorded to avoid confusing the service database with the PR36 dual-storage database. No schema or data was changed. `recovery_control` remains the documented gap for the broader operator recovery contract; the read-only lookup was separately exercised in [TC-07 VM lookup evidence](../20261108-101605-vm-tc07-dlq-lookup/report.md).

## n8n publication snapshot

The n8n UI reports 106 workflows total and aggregate instance metrics of 830 production executions, 4 failed executions, a displayed 0.5% failure rate, and 2.83 s average runtime. These are instance-wide UI counters, not PR36-specific scenario results.

| Workflow group | UI state |
| --- | --- |
| `R01 PR36 a657890` support, search, handoff, errors, dlq, state | Published except `index`, which has no Published label |
| `R01 PR36 dual storage` Support, Handoff, State, Dlq | Published |
| `R01 PR36 dual storage Errors` | No Published label |
| `dubakwi-ux-*` errors, handoff, dlq, state, support (five workflows) | Published |
| `dubakwi-recovery-operator` | No Published label; not run in this snapshot |

“No Published label” is the UI observation only. This run did not inspect individual workflow triggers or exercise endpoints. The operator workflow was separately recorded as inactive after its TC-07 read-only execution.

The PR36 index editor URL identifies workflow ID `dubakwiPR36a657Index`; it is a Manual workflow and the editor showed Publish disabled with no Published label. Its Insert chunk node is the n8n Simple Vector Store in-memory node. The VM editor displayed keys `dubakwi-pr36-a657890-public` and `dubakwi-pr36-a657890-restricted`; n8n warns that this store is lost on restart and may be cleared under memory pressure. The workflow Executions tab showed “No executions found.” This confirms the intended namespace/version in the workflow configuration, but not whether vectors are currently loaded or which document/chunk revision is live. The n8n container was running for about 19 hours in the inventory; given the memory-only store, the current vector population must be treated as unverified until a retrieval check is performed or the index is rebuilt as part of testing. Rebuilding writes the vector store and invokes the embedding credential, so it was not done during this version inventory.

## Result and boundaries

This snapshot confirms image IDs (prefixes), application/runtime version strings where available, PR36/UX tags, key database function availability, and relevant workflow publication labels. It does not establish build provenance for tags without OCI revision labels, exact deployed JSON hashes for every workflow, credential bindings, current RAG vector contents/document revision, individual webhook behavior, full 106-workflow publication inventory, TC-15, or full user/incident regression. Mutable `latest` remains present even though its current image ID was captured. No VM, database, workflow, Jira, or Discord state was changed.
