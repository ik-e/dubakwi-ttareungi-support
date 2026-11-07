# 지원 시나리오 전체 dry-run 준비도 점검

- 실행: 2026-11-07 KST
- 환경: 로컬 Windows worktree, `scripts/test/run_cases.py` dry-run
- 입력 명세: `cases/common.json`, `cases/team.json`, `cases/team-extended.json`
- 외부 요청/fixture hook: 없음
- 판정: 명세 41건 발견. 27건 요청 준비 dry-run, 13건 준비 전 차단, TC-07 미구현

## 결과

| 그룹 | 건수 | 의미 |
|---|---:|---|
| 요청 준비 dry-run | 27 | 요청 payload/다단계 placeholder 준비 가능. 서비스 실행 또는 기대 동작 통과 아님 |
| 조건 준비 필요 | 13 | 수동 장애 전환, 사전 사용자/ticket/state 준비, 시험 사본 게시·고정 등이 필요 |
| 미구현 | 1 | TC-07 상태 재개/복구가 미구현으로 표기됨 |

`--dry-run`은 POST나 before/after hook을 호출하지 않는다. 따라서 이 결과는 시험 실행이 아니라 실행 명세 해석/준비도다. dry-run에서 multi-step 응답값을 만들 수 없어서 TC-01, TC-01b, TC-14의 `{step1.case_ref}`가 미해결로 표시된다. 이는 실제 연속 실행에서 unresolved라는 뜻이 아니다. TC-15도 준비 요구에 의해 차단되며 별도 VM 인증 사전점검에서 시험 credential 호출 경로가 없음을 확인했다.

## 준비 필요 사례

- 수동 fault 전환: WF-10
- 다단계 `case_ref` 동적 참조(이 dry-run에서만 미해결): TC-01, TC-01b, TC-14
- 선행 사용자/기록/티켓 상태 준비: TC-02, TC-05, TC-06, TC-10, TC-16, TC-18
- 게시 시험 사본 및 해시 고정: TC-08, TC-17
- TC-15의 승인된 fault/alert 표식 시험과 사전 확인
- 기능 상태: TC-07 미구현

## 판정 한계

이 dry-run은 실제 workflow, RAG/LLM, Jira, PostgreSQL, DLQ, Discord를 실행하지 않는다. 27건은 PASS가 아니며, 13건의 준비를 사용자/담당자 확인 없이 자동 충족된 것으로 간주하지 않는다. 전체 시나리오 마감에는 준비가 완료된 대상의 실제 종단 실행과 외부 효과 대조가 남아 있다.
