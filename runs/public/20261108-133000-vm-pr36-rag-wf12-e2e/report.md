# VM PR36 RAG mixed-intent WF12 E2E

- 실행일: 2026-11-08 13:30 KST
- 환경: aio-t2 VM, Edge web SSH, active PR36 Support/RAG/Handoff workflows
- Support: `/webhook/dubakwi-support-pr36-a657890`
- Search pair: `/webhook/dubakwi-search-pr36-a657890`
- Synthetic request: `rag-sr-wf12-pr36-20261108-1330`, fixture user `citizen-b`
- Input: `따릉이 사칭 링크에 정보를 입력했어요. 제 반납 문의 T-DEMO-02도 어떻게 됐나요?`

## Result

The active PR36 workflow returned HTTP 200, `route=담당자 이관`, `reason=urgent`, `ticket=JBYS-172`, priority `high`, and the expected public evidence `privacy-security-guide` / `계정 노출·침해 의심 시 공개 초동 안내` (score 0.544052106790638). The answer combined urgent safe next steps with a statement that the matter was handed to an agent. This confirms the B13 security-intent transform and PR36 RAG retrieval work together for the SR-WF12 scenario. Ticket creation occurred as expected for the approved synthetic urgent handoff test.

The original direct-search SR-WF12 call still misses the security section when sent as a single untransformed mixed-intent query. The B13-style transformed query and this end-to-end request retrieve it. Keep the raw direct-search failure as evidence and classify the operational scenario as passed through the designed intent transformation.

Discord delivery was not independently verified in this run; Jira key and workflow response confirm ticket creation only. No further ticket update or transition was made.

## RAG status

- PR36 QR answer E2E: passed, public `rental-guide` evidence.
- PR36 mixed-intent security WF12 E2E: passed, public `privacy-security-guide` evidence and urgent Jira handoff.
- Direct-search matrix: 15/16 raw inputs pass; SR-WF12 is a known raw-query relevance miss resolved by the Support intent hint in the end-to-end path.
- Restart/reindex recovery: still unverified. n8n execution 2167 remains marked `running` with no saved runData; no stop/restart was attempted.

## Conclusion

All currently applicable user-facing PR36 RAG paths tested here (supported public QR answer and mixed security/ticket follow-up) returned their expected evidence and behavior. Full operational RAG closeout still has one infrastructure item: safely resolving the stale/long-running index execution and verifying the documented restart/reindex recovery. Staff restricted retrieval was covered by the separate direct-search matrix, not by this user-facing case.
