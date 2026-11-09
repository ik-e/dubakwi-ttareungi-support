# VM Support RAG user-path check

- 실행일: 2026-11-08 13:23 KST
- 환경: aio-t2 VM, Edge web SSH, active `dubakwi-support` webhook
- 입력: synthetic QR rental question; `request_id=rag-e2e-qr-20261108-1400`; user fixture `박서연`
- 인증: existing bot container team-key mount and `X-Team-Key`; key value not displayed or persisted
- 외부 효과: Jira ticket `null`; response explicitly states ticket creation/handoff did not occur. No Discord send was part of the returned route.

## Result

The legacy `/webhook/dubakwi-support` webhook accepted the request (HTTP 200), but returned `route=담당자 이관`, `reason=skeleton_mock`, `ticket=null`, empty `sources`, and the answer `골격 시험 응답입니다. 실제 문의 접수·티켓 생성·담당자 이관은 이루어지지 않았습니다.` The active PR36 webhook is a separate route, `/webhook/dubakwi-support-pr36-a657890`, tested independently in [the PR36 RAG E2E report](../20261108-132500-vm-pr36-rag-e2e/report.md).

This is not a user-facing RAG answer and does not prove RAG search was invoked. The API key mismatch from the earlier attempt is resolved. This endpoint is the legacy P11 skeleton path; do not use it to judge the active PR36 Support workflow or count it as a RAG pass. The 16-case direct-search result remains 15 pass / 1 relevance failure (SR-WF12), while B13-style query diagnostics find the expected security section.

## n8n active execution

Read-only inspection still reports execution `2167` (`dubakwiPR36a657Index`) as `running`, started at `2026-11-08 03:52:15.855 UTC` (12:52 KST), with no `stoppedAt`. n8n does not retain runData for this execution, and the UI cannot show its details. No stop or restart was attempted; interrupting it could disrupt the service or index state. Restart/reindex recovery remains unverified.

## Conclusion

The active PR36 Support→RAG→answer path is verified for one QR question in the linked 13:25 report. The legacy P11 `/dubakwi-support` endpoint is a separate skeleton and is not the PR36 test route. Full RAG closeout still requires SR-WF12 relevance and restart/reindex recovery. n8n execution 2167 remains unresolved; do not stop/restart blindly.
