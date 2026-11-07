# PR36 마감 후속 로컬 회귀

- 실행일: 2026-11-07 21:35 KST
- 환경: Windows worktree, 현재 브랜치 `r01/p26-final-closure`, HEAD `6f9561b`; dirty worktree
- 대상: Python 테스트 전체, P18 DLQ marker, P19 공통/권한 fixture, P20 오류 상태, R04 recovery 계약 parity

## 결과

| 검사 | 결과 | 적용 범위 |
|---|---:|---|
| `uv run --locked python -m unittest discover -s scripts/test -p "test_*.py"` | 148 passed, 7 skipped | 로컬 단위·계약·fixture 시험 |
| `node scripts/test/p18-dlq-marker-cases.js` | 7/7 | case scope DLQ marker·중복 방지 Code 계약 |
| `node scripts/test/p19-shared-contract-cases.js` | golden fixture 3종 및 AUTH-01~07 통과 | 실제 Code를 mock producer/API fixture로 실행. 실 HTTP·실제 사용자 조회·RAG 검색/LLM·권한 종단 아님 |
| `node scripts/test/p20-error-cases.js` | 16 사례 및 alert acknowledgement 검사 통과 | 오류/DLQ 계약 fixture |
| `node scripts/test/r04-recovery-contract-parity.js` | 8/8 action | recovery 계약 parity |

7개 skip 중 RAG HTTP 계열은 `DUBAKWI_INTERNAL_KEY` 미설정으로 실행되지 않았다. 이 로컬 묶음은 VM n8n 호출, live RAG, Jira, Discord, PostgreSQL 효과를 검증하지 않는다. TC-15는 [VM 관측 보고서](../20261107-213400-vm-tc15-clone-publish/report.md)의 실행 차단 상태를 유지한다.

## 판정

현재 Python/Node 로컬 계약 회귀 통과. 이는 PR36의 전체 시민 종단, RAG/에이전트 실제 권한·인용, 담당자 알림의 사람 수신, Jira 상태 반영, VM 오류/DLQ 실행 통과를 의미하지 않는다. TC-15 포함 live 결과는 미판정이다.
