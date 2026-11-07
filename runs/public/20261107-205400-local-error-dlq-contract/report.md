# P18/P20 오류·DLQ 로컬 계약 검증

- 실행일: 2026-11-07 KST
- 환경: 로컬 Node.js fixture/계약 검사
- 범위: `alert_marker` 중복 제어, 복구/DLQ 계약 패리티, 오류 상태와 운영 알림 acknowledgement fixture
- 외부 서비스: VM/n8n/Jira/Discord/PostgreSQL 호출 없음

## 결과

| 검사 | 결과 |
| --- | --- |
| `node scripts/test/p18-dlq-marker-cases.js` | 7/7 통과: alert_marker 검증과 scope 제한 dedup |
| `node scripts/test/r04-recovery-contract-parity.js` | 8/8 action 계약 포함 확인 |
| `node scripts/test/p20-error-cases.js` | 16개 state/DLQ 사례 및 운영 알림 acknowledgement 검사 통과 |

## 한계

이는 로컬 fixture/계약 검사다. 실제 VM 장애 주입, PostgreSQL DLQ 레코드 생성·중복 억제, Jira 외부 효과 미확인, 운영자 알림 수신이나 수동 복구는 검증하지 않았다. TC-15 live 시험으로 계산하지 않는다.
