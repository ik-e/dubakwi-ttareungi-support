# PR36 핵심 로컬 회귀 재실행

- 실행: 2026-11-07 KST
- 기준 브랜치: `r01/p26-final-closure`
- 기준 커밋: `6f9561b` (worktree에는 문서/사례 등 미커밋 작업 존재)
- 결과 범위: 로컬 코드·mock·fixture. VM 통합 PASS로 합산하지 않음.

## 실행 결과

| 검사 | 결과 | 범위/제한 |
|---|---:|---|
| `uv run --locked python -m unittest discover -s scripts/test -p "test_*.py"` | 148 통과, 7 생략 | RAG HTTP 등 환경 의존 7건 생략 |
| `node scripts/test/support-skeleton-cases.js` | 157/157 | 현행 Support Code 사례 하네스. 실제 webhook/DB/LLM 아님 |
| P12 begin/case/handoff/Jira-flow/repeat-handoff/save 스크립트 6종 | 6종 통과, Jira flow 21 시나리오, repeat handoff 7/7 | Code/fixture 계약 |
| P18 DLQ marker | 7/7 | 로컬 계약 |
| P19 shared contract | 3 producer/consumer fixture + AUTH-01..07 통과 | mock API 반환값을 실제 B05→B13→RAG Validate Code에 적용. 실제 API/RAG 아님 |
| P20 error cases | 16 사례 + 운영 알림 ack 검사 통과 | 로컬 오류/DLQ 계약 |
| R04 recovery parity | 8/8 | 로컬 계약 |
| Support verifier boundary | 7/7 | mocked Code 사례, 실제 LLM 미실행 |
| `check_project_docs.py` | 22 문서, 링크 700·앵커 57, 오류 0 | 로컬 링크/앵커 범위 |
| `check_public_files.py` | 후보 516, 추적 476, 무시 추적 0, 공개 링크 1050, 오류 0 | 현재 worktree 공개 참조 범위 |
| `git diff --check` | 오류 0 | CRLF 변환 경고만 출력 |

TC-15 live 시험은 이 실행에 포함되지 않았다. Edge VM 인증 사전점검에서 `dubakwi-team-key`를 이용할 안전한 호출 경로가 확인되지 않아 실제 POST를 보내지 않았으며, 새 Jira/DB/DLQ/Discord 효과도 없다. 상세 블로커는 [인증 사전점검](../20261107-214634-vm-tc15-auth-check/report.md)에 기록했다.

## 잔여 판정

실제 VM RAG 권한·인용·오류, TC-15 unknown/DLQ 및 후속 409, 담당자의 직접 처리/사람 알림 수신, WF-11 반복 시간, 전체 manifest 종단은 미확인이다. 로컬 회귀는 이 조건들을 대신하지 않는다.
