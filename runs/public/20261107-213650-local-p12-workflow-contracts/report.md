# PR36 Jira·저장 워크플로우 Code 계약 표적 회귀

- 실행일: 2026-11-07 21:36 KST
- 환경: 현재 worktree의 workflow JSON Code 직접 실행·Node 로컬 harness
- 기준: HEAD `6f9561b`, dirty worktree

## 결과

| 스크립트 | 결과 | 검증 경계 |
|---|---:|---|
| `p12-begin-message-cases.js` | 통과 | begin 409 시민 안내 계약 |
| `p12-case-cases.js` | 통과 | state case_ref 검증 계약 |
| `p12-handoff-cases.js` | 통과 | 이관 상태 게이트·조회 계약 |
| `p12-jira-flow-cases.js` | 21 시나리오 + 기한/설정 gate 통과 | Jira handoff Code 흐름/분기 계약 |
| `p12-repeat-handoff-cases.js` | 7/7 통과 | 반복 배정·알림 억제·DLQ handoff 계약 |
| `p12-save-cases.js` | 통과 | Jira 재조회 포함 최종 상태 저장/amendment 계약 |

## 판정

이 결과는 현재 로컬 workflow JSON의 Code 노드 계약과 분기 회귀다. 실제 n8n 스케줄링·HTTP/Credential·Jira API·PostgreSQL 권한/트랜잭션·담당자 행위·Discord 전달을 실행하지 않는다. 따라서 VM의 문의 결과/업무 효과 검증을 대체하지 않으며 기존 live 확인 항목은 계속 미완료다.
