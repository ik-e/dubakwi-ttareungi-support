# PR36 VM unauthenticated ingress boundary check · R01 observation

- Run bundle: `20261107-200826-vm-pr36-auth-boundary` (2026-11-07 20:08 KST)
- Access: existing Edge Web SSH session only; no direct SSH client was used.
- Scope: one request to the PR36 support webhook with an empty JSON body and no authorization header. No credential or personal data was supplied.
- Result: HTTP 401 in 0.029859 seconds.

## Evidence and limits

The VM rejected the unauthenticated request at the HTTP boundary. In the selected core support workflow's n8n Executions page, the UI still displayed “No executions found”. Since this workflow has no visible saved execution rows, that page cannot establish whether rejected requests are retained elsewhere or prove the absence of every possible downstream side effect. No ticket, Discord message, or business payload was sent by this check. No service, workflow, database, or Jira state was changed intentionally.

This is a narrow authentication-boundary pass. It does not validate an authenticated citizen request, support logic, RAG, Jira lifecycle, DLQ, or error recovery. The remaining authorized live workflow tests need the test-ticket/notification scope resolved before any request that can create or notify.
