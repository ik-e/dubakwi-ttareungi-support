# TC-07 operator recovery final local audit

- 실행 시각: 2026-11-08 01:04 KST 전후
- 환경: 일회용 PostgreSQL 16.15-bookworm, host port 미게시
- 적용: migrations 001~016
- 판정: **local 저장 경계 계약 통과; 실 Jira/VM 적용은 미실행**

## 검증 범위와 결과

- 빈 DB에 migrations 001~016 순서 적용.
- finish response 복원 contract 통과.
- Jira-ref/args-null recovery capsule은 `recovery_not_supported`로 거절하고 DLQ pending을 보존함.
- claim에서 원 execution/operator를 capsule에 고정하고 `resume`이 fresh StateRef를 발급함.
- 실패/중단된 재개 execution은 확인 후 request failed + DLQ pending으로 되돌림.
- target effect가 failed 또는 confirmed 상태 요건에 맞지 않거나 unknown이면 거절. 비대상 effect는 기존 snapshot과 상태가 같아야 함.
- verified complete는 Response, Jira linkage, 원 execution/operator, revisions를 검사하고 state completed + DLQ resolved를 원자 저장함. 동일 complete 재전송은 거절됨.
- operator/runtime 권한 분리 통과.
- `tc07-operator-workflow-contract.js`: 19/19; `tc07-finish-capsule-contract.js`: 3/3; JSON 파싱; `git diff --check` 통과.
- 문서 검사: 22 files, 751 local links, 58 anchor links, 0 errors.
- 이전 test harness 실패는 `to_jsonb('unknown')`의 PostgreSQL 타입 추론 오류였고 `unknown::text` 수정 후 disposable 재실행 통과했다. 애플리케이션 migration/계약 오류는 아니었다.
- disposable 컨테이너 종료·제거. VM/Jira/Discord effects 0.

## 미완료 및 경계

SQL complete는 운영자가 Jira/Discord action을 실제 수행·확인했다는 attestation을 검증하고 저장하는 함수이며, 외부 API를 호출하지 않는다. 현재 Handoff가 생성하는 대부분의 jira_ref/args-null capsule은 실행 인자가 부족해 안전하게 claim 거절된다. action별 capsule producer에 payload 보강, 실제 Jira 효과 대조, VM migrations 011~016 반입과 operator workflow 실행, stale claim live 운영절차는 별도 미완료다.
