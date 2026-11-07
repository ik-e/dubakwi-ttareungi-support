# TC-07 recovery resume / release contract

- 실행 시각: 2026-11-08 00:50 KST 전후
- 환경: 일회용 PostgreSQL 16.15-bookworm, host port 미게시
- 적용: migrations 001~014
- 판정: **요청 상태 CAS 재개·fresh StateRef·실패 pending 복귀 통과**

## 검증

- 빈 DB에 migrations 001~014 적용.
- `controlled-recovery-contract.sql`: finish response 복원/replay/one-shot CAS와 unknown alert effect 거부 통과.
- `controlled-recovery-claim-release-contract.sql`: 입력 hash mismatch 거부, 중복/stale claim 거부, 안전 release, unknown non-target effect 거부, clean claim 뒤 request_state failed→processing CAS 및 새 execution/revision StateRef 발급, recovery driver 실패 후 새 실행ID 유지 상태로 request_state failed 및 DLQ pending 복귀, operator/runtime 권한 경계 통과.
- workflow contract [18/18 통과](../20261108-004500-local-tc07-operator-input/report.md).
- disposable 컨테이너는 시험 후 중지해 제거.

## 아직 미완료

SQL resume는 저장 처리권만 재개한다. action-specific Jira/Discord driver를 실행하지 않으며, 성공한 target effect 확인 후 response 생성·request completed·DLQ resolved로 닫는 경로가 없다. stale `reprocessing` lease 복구와 VM migration/실 Jira 종단도 미완료다. VM/Jira/Discord 효과 0건.
