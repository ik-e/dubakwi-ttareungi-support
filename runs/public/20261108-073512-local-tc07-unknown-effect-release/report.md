# TC-07 unknown-effect release safety contract

- 실행 시각: 2026-11-08 07:35–07:42 KST
- 환경: 일회용 PostgreSQL 16.15-bookworm 컨테이너; 포트 비공개; 시험 후 제거
- 코드 기준: worktree `main` 기준 HEAD `6f9561b` + 미커밋 변경
- 범위: migrations 001~016, finish/claim-release/unknown-effect SQL contracts, operator workflow allowlist, Handoff recovery capsule producers
- 판정: **로컬 저장·운영자 입력 계약 통과. VM/Jira/Discord 실연동은 미실행.**

## 결과

- PostgreSQL 16.15 disposable DB에서 migrations 001~016 순서 적용 성공.
- `controlled-recovery-contract.sql`: 통과.
- `controlled-recovery-claim-release-contract.sql`: 통과.
- `controlled-recovery-unknown-effect-contract.sql`: 통과. unknown 대상은 확인 전 claim 거절, 운영자가 미적용 확인 시 failed로 claim 후 새 StateRef 발급, 재개 실행 실패 시 `release`가 대상 effect `unknown` 및 `last_effect_check` 저장, 다음 claim은 Jira에서 이미 적용 확인을 제출해야 통과한다. resume 전 claim release는 종료/효과 재확인 attestation을 요구하며 DLQ의 원 execution ID를 복원해 다음 claim을 허용한다. 이미 적용됨으로 확인되면 action_required=false로 adopt하고 complete; 같은 complete 재전송은 거절.
- `tc07-operator-workflow-contract.js`: 25/25 (초기 출력 카운트 문자열을 24로 정정한 뒤 재실행 확인).
- `tc07-finish-capsule-contract.js`: 3/3.
- `tc07-handoff-recovery-capsule-contract.js`: 6/6.
- Workflow/case JSON parse 성공, `git diff --check` 통과.
- 프로젝트 문서 검사: 결과 report 생성 후 22 files, 762 links, 58 anchors, 0 errors.
- 공개 후보 검사: 결과 report 생성 후 565 files, 1123 public local links, 0 errors.

## 동작 범위와 한계

`recovery_release`는 재개된 외부 action이 실패/미확인/이미 적용됨 중 무엇인지 CAS로 반영한다. 미확인은 자동 재실행 가능 상태로 낮추지 않으며 운영자의 외부 Jira 대조를 요구한다. 확인된 효과는 중복 action 없이 저장 완료할 수 있다. bind는 외부 effect가 없으므로 `none`을 기록한다. Runtime 역할은 operator 함수 권한을 받지 않는다.

SQL은 Jira나 Discord를 호출하지 않는다. 운영자가 외부 효과를 확인·수행하는 절차, 실제 Jira 티켓 재처리, VM migrations 011~016 적용, 비활성 operator workflow 연결/호출, VM 백업·restore rehearsal은 수행하지 않았다. 따라서 TC-07 종단 PASS가 아니라 **로컬 저장 경계 통과 / 실연동 미검증**이다.
