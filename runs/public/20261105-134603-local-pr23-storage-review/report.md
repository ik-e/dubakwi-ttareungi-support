# PR #23 R01 저장 계약 검토

- 검토일: 2026-11-05 KST. 원본 `a2d8fcab5373a8b1b95e4905cbadf40baaa278bf`, R01 P18/P12.
- 판정: **수정 요청, 현재 버전 병합·VM 적용 보류**. R04 SQL·워크플로우 원본은 수정하지 않았다.
- 이 기록은 R01의 추가 로컬 실측이며 R04가 보고한 검사나 R05 공식 판정을 덮어쓰지 않는다. [가린 결과](summary.json).

## 확인한 진전

state_apply/dlq_apply 함수와 n8n Postgres 호출이 실제로 추가됐다. 공개 ID와 이름, 고정 SQL `$1::jsonb`, runtime EXECUTE 권한, 실패 코드와 Jira 내부 ID/표시 키 보존 준비를 확인했다. 기존 Python38통과/HTTP7생략은 새 SQL 함수 실행 검증이 아니므로 별도 PostgreSQL 시험을 했다.

기존 로컬 postgres:16 이미지의 실제 서버16.15를 외부 네트워크·공개 포트 없이 실행했다. 새 시험 DB와 별도 non-superuser owner/runtime 역할에서 원본001~004를 순서대로 적용했다. 제공 constraint-contract와 function-contract, runtime-role-contract가 통과했고 runtime의 service schema CREATE·DELETE·TRUNCATE·ALTER·DROP은 각각 거절됐다. 같은 function-contract를 runtime 로그인으로도 통과했다.

이 기본 통과와 별개로 다음 세 경계가 실패했다.

## 수정 요청 1 — null StateRef 실패 처리를 저장소에서 확인

원본 `workflows/dubakwi-state.json` S02는 op=fail,state_ref=null이면 scope/execution_id에 실제 소유한 processing 행이 있어도 DB 조회 없이 ok=true/skipped=true를 반환한다. S03은 backend_unconfigured가 아니므로 Postgres로 보내지 않는다. 처리 중인 요청이 영구 processing으로 남을 수 있다.

SQL003의178행 `ref_value IS NULL`도 JSON의 명시적 null을 SQL NULL로 인식하지 않는다. 유효한 fail을 직접 SQL에 보내면 소유 행 유무와 관계없이 invalid_state_request였다. 반면 state_ref 키를 아예 생략하면 무소유 경우 정상 skipped였다.

재현 PR23-FAIL-NULL-01: 신규 begin으로 processing/revision0 생성 → 같은 scope/execution_id와 state_ref:null로 unknown 실패 입력 → 원본 S02는 skipped, SQL 직접 호출은 invalid_state_request, DB 행은 processing/revision0 유지. 저장소6.1의 원 실행/처리권 확인 경로와 다르다. 무소유·완료 건만 skipped로 반환하고 소유 행은 조건부 failed/unknown 갱신해야 한다.

## 수정 요청 2 — 중복 DLQ put이 실행 중 처리권을 해제하지 않도록 보존

SQL003의 중복 put 갱신(약386~402행)은 현재 replay_status와 무관하게 pending·last_execution_id를 원 실행으로 덮는다. 재현 PR23-DLQ-CLAIM-01: put(revision0) → 운영자A claim(reprocessing/revision1) → 같은 failure_key의 중복 put(pending/revision2) → 운영자B claim이 다시 ok=true였다.

A의 복구가 끝나기 전에 B가 같은 외부 효과를 재실행할 수 있는 상태다. 중복 기록과 신규 실패 재개를 구분하고, reprocessing 중에는 기존 처리권/복구 execution을 보존하거나 조건부 충돌을 반환해야 한다. 이번에는 순차 호출로 금지돼야 할 두 번째 claim을 재현했으며 실제 Jira 복구는 하지 않았다.

## 수정 요청 3 — Jira 문맥 확인 없는 save를 성공으로 반환하지 않기

SQL003의279~294행 save는 facts·attempt·expected_case_version을 실제 Jira에 확인/저장하지 않고 DB response 저장과 completed 전환만 수행한다. 전체 state 워크플로우에도 Postgres 외의 Jira 문맥 조회/갱신 단계가 없다.

재현 PR23-SAVE-GATE-01: begin → 합성 known Jira ID/key bind → attempt7·expected_case_version999·갱신 facts를 포함한 전체 save 봉투 → Jira 호출0인데 ok=true·completed/revision2 반환. 워크플로우 설계 B32와 저장소6.1은 Jira 문맥/버전 갱신 확인 뒤 finish를 요구한다. R02는 save의 성공을 최종 저장 완료로 소비하므로 이 구현으로 보완 횟수/문맥 저장이 빠져도 성공할 수 있다. Jira 단계가 준비되기 전에는 명시적 미준비/실패와 복구 자료를 반환하고 finish하지 않아야 한다.

## 배포 조건과 역할별 후속

- R04: 세 경계를 수정하고 제공 function-contract에 회귀 사례를 보강. SQL/n8n 양쪽 의미를 맞춘다.
- R02: case_verification_required를 안전 실패로 소비하는 것과 실제 보완(case_ref) 지원 완료를 구분. save의 Jira 문맥 갱신·시간 계약을 R04와 확인한다.
- R05: null-ref의 소유/무소유/완료, DLQ 중복 put과 활성 claim, 미준비 Jira save의 비완료를 공식 시험 범위에 추가한다. 그 뒤 runtime 권한·재시작·백업/복원·동시성 시험을 진행한다.
- R01: 수정 검토 후 DB 채택/VM 자원·고정 이미지·내부망·별도 영속 볼륨·owner/runtime·001~004 적용·복원 검증과 실제 Credential ID 연결 순서를 확정한다. 현재 PR 병합/배포는 보류한다.
- R03: PR #23은 사용자 API나 access_levels 전달을 구현하지 않는다. 현 VM 과정 사용자 citizen/public과 향후 팀 API의 support/security 권한 공급을 구분해 B05→RAG 종단을 시험한다.

기존 DB에 이미001이 적용된 경우 error_code를 추가하는 별도 upgrade 절차도 확인해야 한다. 이번 시험은 수정001을 새 DB에 적용한 것이며 기존 DB upgrade 검증이 아니다.

로컬 공통 검사45건 중38통과/HTTP7생략, Ruff check/format40파일, 문서/공개 후보/JSON/diff를 확인했다. 전문 tscan/Gitleaks는 없고 공개 후보 검사는 부분 대체다. VM·운영 n8n·Jira·Credential은 변경하지 않았다. 검토용 컨테이너는 종료/자동 제거했고 존재하지 않음을 확인했다. 복원·VM 재시작·실제 동시 복구·live n8n Postgres 호출은 이번 범위 밖이다.
