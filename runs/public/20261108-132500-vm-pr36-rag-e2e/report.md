# VM PR36 Support → RAG → answer E2E

- 실행일: 2026-11-08 13:25 KST
- 환경: aio-t2 VM, Edge web SSH, active PR36 Support workflow
- Workflow: `dubakwiPR36a657Support`, webhook `/webhook/dubakwi-support-pr36-a657890`, paired search `/webhook/dubakwi-search-pr36-a657890`
- 입력: synthetic QR rental question; `request_id=rag-e2e-pr36-qr-20261108-1325`; user fixture `citizen-a`
- 인증: existing bot container team-key mount and `X-Team-Key`; key value not displayed or persisted

## Result

PASS for the QR user answer path. HTTP 200 returned `route=자동 답변`, `ticket=null`, a generated case reference, an answer explaining QR scan and bicycle-number rental guidance, and one public RAG source: `rental-guide` / `대여 준비와 시작` (score 0.5397423301953248). The answer cited the source as `[실제 안내]`. No Jira ticket was requested by this normal-answer branch; no Discord send occurred.

This validates the active PR36 Support→paired RAG search→evidence-backed answer flow for one supported public question. It does not prove the multi-intent SR-WF12 security scenario, restricted-staff authorization, Jira/Discord handoff, or restart recovery.

## Related endpoint distinction

The preceding request to `/webhook/dubakwi-support` reached the legacy P11 skeleton (`skeleton_mock`), which is not the active PR36 Support route. Its result is retained separately at [the P11 endpoint check](../20261108-132300-vm-support-rag-e2e/report.md) and is not used to judge PR36 E2E.

## Remaining RAG checks

- Direct search matrix: 15/16 pass; SR-WF12 original mixed-intent query misses its expected security section, while B13-style hint diagnostics recover it.
- n8n execution 2167 (`dubakwiPR36a657Index`) remains reported as `running`, started at 12:52 KST, with no saved runData. No stop/restart was attempted; restart/reindex recovery remains unverified.
- Index refresh/restart, full RAG failure recovery, and operational latency breakdown remain open.

## Conclusion

The active PR36 user-facing RAG answer path is confirmed for a supported public query. Full RAG closeout is not complete because SR-WF12 direct-query relevance and restart/reindex recovery remain unresolved.
