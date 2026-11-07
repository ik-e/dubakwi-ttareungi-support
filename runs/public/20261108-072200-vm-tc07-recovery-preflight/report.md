# TC-07 VM recovery preflight (read-only)

- 실행 시각: 2026-11-08 07:22 KST 전후
- 환경: 기존 VM web SSH, PostgreSQL 16.15 container
- DB: 서비스 DB `dubakwi_service`
- 판정: **recovery migrations 미적용; write/DDL 미수행**

## 관찰

- n8n과 PostgreSQL 기존 서비스 컨테이너가 실행 중인 것을 확인했다.
- PostgreSQL catalog에서 `dubakwi_service`를 확인했다.
- `dubakwi_service` 내 `recovery_%` 함수 조회는 결과가 없었다. 따라서 `recovery_control` operator dispatcher는 설치되어 있지 않다.
- 작업은 조회만 수행했다. SQL 파일을 VM으로 복사하거나 migration을 실행하지 않았고, credential/role/grant, workflow, Jira, DLQ, state는 변경하지 않았다.
- 사후 정적 검사: 문서 링크/앵커 22 files·761 local links·58 anchors·0 errors, 공개 후보 562 files·0 errors.

## 배포 선행 조건

- 현재 recovery SQL·operator workflow는 로컬 `r01/p26-final-closure` 작업 트리에 있고 검토된 기본 브랜치에는 없다.
- VM 배포 안내에 따라 검토된 기본 브랜치 revision, 별도 restore DB의 010~016 migration/contract rehearsal, private backup, operator credential 분리를 먼저 충족해야 한다.
- [migration runbook](../../../infra/db/migrations/README.md)에 010~016 전체 적용 순서, restore rehearsal, runtime 권한 경계, operator workflow 비활성 반입 순서를 추가했다.

외부 업무 효과는 0이며 현재 live DLQ 내용은 조회하지 않았다.
