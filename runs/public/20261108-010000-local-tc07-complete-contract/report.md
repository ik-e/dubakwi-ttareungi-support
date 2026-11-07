# TC-07 action completion and DLQ resolution contract

- 실행 시각: 2026-11-08 01:00 KST 전후
- 환경: 일회용 PostgreSQL 16.15-bookworm, host port 미게시
- 적용: migrations 001~016
- 판정: **저장 경계의 claim→resume→verified complete/release 통과; 실제 외부 Jira action은 미실행**

## 확인

- 빈 DB에 migrations 001~016 적용.
- finish response 복원 contract 통과.
- Jira 참조만 있고 action payload가 없는 Jira-ref capsule은 claim 전에 `recovery_not_supported`로 거절되고 DLQ는 pending으로 유지됨.
- claim은 원 execution/operator를 캡슐에 바인딩하고, resume은 새 StateRef를 발급함.
- 실패 경로: 재개 작업을 failed 처리한 뒤 확인 attestation과 CAS로 요청을 failed, DLQ를 pending으로 되돌림.
- 성공 경로: action 효과가 confirmed이고 모든 비대상 효과가 기존 confirmed/none과 일치하며 가린 Response가 유효할 때 request_state completed와 DLQ resolved를 한 트랜잭션으로 저장함.
- target effect unknown이면 complete를 거부하고 state/DLQ 모두 processing/reprocessing으로 보존함. 동일 complete 재전송은 `recovery_conflict`로 거부됨.
- runtime 역할의 recovery 권한 없음/operator 역할 허용 확인.
- workflow JSON 파싱, `node scripts/test/tc07-operator-workflow-contract.js`: 19/19 통과, `tc07-finish-capsule-contract.js`: 3/3 통과.
- `git diff --check` 통과. `uv run --locked python scripts/test/check_project_docs.py`: 22개 문서, 링크 751개, 앵커 58개, 오류 0.
- 최초 SQL assertion 실행은 검증 fixture의 `to_jsonb('unknown')` 타입 지정 누락으로 중단됐다. `unknown::text`로 수정해 새 disposable DB에서 전체 계약을 재실행했고 통과했다.
- 컨테이너는 종료 후 자동 제거. VM/Jira/Discord 효과 0.

## 한계

`recovery_complete`는 운영자가 Jira/Discord에서 실패 단계를 실제 수행하고 결과를 확인했다는 attestation을 저장 경계에서 검증한다. 함수 자체와 operator workflow는 Jira/Discord를 호출하지 않는다. 현재 workflow 생산자의 jira_ref/args-null 캡슐 대부분은 재실행 자료가 없어서 안전하게 claim 거절된다. 생산자 payload 보강, 실제 Jira 변경 대조, VM migration/실행과 stale claim 운영 절차는 추가 작업이다.
