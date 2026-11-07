# TC-07 finish 복구 slice 재검증

- 실행 시각: 2026-11-08 00:25 KST 전후
- 환경: 로컬 Docker `postgres:16.15-bookworm`, 외부 포트 게시 없는 일회용 DB
- 기준: 현재 worktree의 migration 001~010 및 복구 계약
- 판정: **finish 복원 slice 계약 통과, TC-07 전체는 부분 완료**

## 결과

- 빈 일회용 DB에 migration 001~010을 순서 적용했다. 최초 시도에서는 테스트용 `dubakwi_runtime` 역할이 사전에 없어 migration 002가 중단됐다. DB를 비우거나 결과를 덮지 않고, 테스트 환경에만 runtime/operator 역할을 준비한 뒤 migration 002~010을 다시 적용해 통과했다.
- `infra/db/verification/controlled-recovery-contract.sql`이 synthetic finish response 복원, 동일 요청 replay, one-shot CAS, 외부 알림 효과 `unknown` 거부를 수행하고 transaction rollback까지 완료했다.
- PostgreSQL 권한 확인: 일반 runtime login의 `recovery_finish(jsonb)` 실행 권한은 false, `dubakwi_recovery_operator` 역할은 true였다.
- Node 검사: finish capsule 3/3, operator workflow 8/8, R04 recovery/DLQ action parity 8/8 통과.
- 시험 뒤 일회용 컨테이너를 중지해 자동 제거했다. 저장소 파일·VM DB·Jira에는 변경이 없다.

## 판정 한계

이 시험은 실패한 effect unknown을 안전하게 거부하고, 이미 확인된 외부 효과 뒤의 최종 응답만 복원하는 migration 010 slice의 계약 결과다. 실제 Jira ticket을 대조한 VM finish, claim 후 작업 실패 시 pending 복귀, action별 Jira/Discord 재실행, 동시 운영자 경합 및 중단 복귀는 포함하지 않는다.
