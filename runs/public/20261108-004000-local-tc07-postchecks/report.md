# TC-07 operator CAS 재검증

- 실행 시각: 2026-11-08 00:40 KST 전후
- 환경: 일회용 PostgreSQL 16.15-bookworm, published port 없음
- 기준: 현재 worktree migrations 001~012 및 verification scripts
- 판정: **저장 경계 계약 통과; 전체 TC-07 미완료**

## 결과

- 빈 DB에 migrations 001~012 적용 완료.
- `controlled-recovery-claim-release-contract.sql` 통과. owner/input hash mismatch 거부, valid claim, 중복/stale claim 거부, pending release, duplicate release 거부, non-target unknown effect 거부, runtime/operator function privilege 분리를 검증했다.
- `controlled-recovery-contract.sql` 재통과. finish response restore/replay/one-shot CAS 및 unknown alert 효과 거부를 유지했다.
- 권한 결과 순서(runtime claim/release/control, operator claim/release/control): `false/false/false`, `true/true/true`.
- Node: operator workflow 14/14 assertion, finish capsule 3/3, recovery/DLQ parity 8/8 통과.
- 일회용 컨테이너를 종료해 자동 제거했다. VM/Jira/Discord 변경은 0.

동시 claim 2개 중 하나만 성공하고 나머지가 `recovery_conflict`를 받은 실험은 [앞선 실행](../20261108-003500-local-tc07-claim-release/report.md)에 기록했다. 이 재검증은 migration 011의 입력 검증 보강 뒤 수행했다.

## 아직 필요한 구현

Migration 011 claim은 DLQ를 `reprocessing`으로 바꾸지만 request_state를 `processing`으로 CAS 재개하지 않고 새 StateRef를 발급하지 않는다. 실패 action별 Jira/Discord driver와 마지막 response/resolve, crash 후 stale `reprocessing` 처리, migration 011/012 VM 적용 및 real Jira-backed recovery도 남아 있다.
