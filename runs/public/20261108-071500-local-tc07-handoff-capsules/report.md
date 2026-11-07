# TC-07 handoff recovery capsule follow-up

- 실행 시각: 2026-11-08 07:15 KST 전후
- 환경: 로컬 Node.js 24.22.1, synthetic node fixtures
- 대상: `workflows/dubakwi-handoff.json`
- 판정: **종료·배정·검증 snapshot 재개 입력 보존 계약 통과; Jira/VM 동작 미실행**

## 확인 결과

- H36 종료 전환 실패는 `close_status`와 전화번호/이메일을 가린 답변을 `payload/close` capsule에 보존한다.
- H42 배정 저장 실패는 H39에서 선택한 Jira account ID와 우선순위를 `payload/assign`에 보존한다.
- H61 문맥 재조회 검증 실패는 정확한 가림 snapshot을 `payload/context_update`로 보존한다. 운영자는 Jira에서 event marker를 확인한 뒤 같은 idempotent event만 이어서 수행한다.
- 신규 focused contract 6/6 통과.
- TC-07 operator workflow contract 19 checks, finish capsule contract 3/3 통과.
- Handoff JSON 파싱 및 `git diff --check` 통과.
- 문서 링크/앵커 검사: 22 files, 759 local links, 58 anchors, 0 errors. 공개 Git 후보 검사: 560 files, 0 errors.
- 해당 fixture 시험은 Jira·Discord·DB·VM 호출을 하지 않았다.

## 제한 및 후속

- PostgreSQL migrations 001~016의 claim/resume/release/complete 저장 경계는 직전 [TC-07 final local audit](../20261108-010400-local-tc07-final-audit/report.md)에서 통과했다. 이번 변경 후 DB 계약은 재실행하지 않았다.
- operator는 Jira에서 실제 티켓과 기존 효과를 확인하고 실패한 종료/배정 동작 또는 H61의 동일 snapshot event만 수행한 뒤 complete를 제출해야 한다. 이 절차는 자동 Jira 드라이버가 아니다.
- `create`, H61 경로가 아닌 `context_update`, `alert`, alert-marker 및 불명확한 capsule은 여전히 안전하게 거절하거나 inspect-only로 남을 수 있다. 특히 Discord 알림 재전송은 멱등 키가 확인되기 전 재개 가능 대상으로 열지 않는다.
- VM migrations 011~016 반입, 실제 Jira 효과 대조, 전체 TC-07 종단은 미실행이다.
