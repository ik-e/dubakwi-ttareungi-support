# PostgreSQL 배포 준비와 R04 검토 요청

- 2026-11-05 KST · v0.1 · P04/P18 · R01 준비, R04 저장/권한 검토, R05 검증.
- 상태: **검토용 준비본, VM 미적용**. 기존 n8n·P11·Credential은 유지한다.
- 원본: [전용 Compose](postgres-compose.yaml), [설정 이름](../.env.example), [R04 저장소 설계](../docs/project/STORAGE-DESIGN.md), [마이그레이션 안내](db/migrations/README.md).
- PR #23 수정본365c419는 null-ref fail·활성 DLQ claim·Jira 미확인save 안전 차단의 실제 DB 재시험 후 main95479d5에 병합했다. [재시험 증거](../runs/public/20261105-143415-local-pr23-storage-retest/report.md)를 따른다. 실제 Jira save/S1은 미완료다. 이 준비본의 R04 검토·D01 물리 DB 채택·실제 VM 적용 조건 확인 전에는 up·마이그레이션·Credential 등록을 하지 않는다.

## 1 구성과 경계

| 항목 | 준비한 값·방법 | 적용 전 확인 |
| --- | --- | --- |
| 이미지 | 공식 postgres16.15-bookworm, OCI index `sha256:e8a07d2c7579b038938cdba6c539e580e5001caf9ea203d397b5cc83e76bd938` 고정 | VM 아키텍처와 선택된 실제 manifest/image ID 기록 |
| 네트워크 | 확인한 기존 n8n Docker 네트워크를 external로 참조, 별칭dubakwi-postgres | 별칭 충돌·허용 peer·방화벽·호스트 노출 여부 |
| 포트 | ports와 host network 없음. n8n에서5432로 접근 | Docker host의 방화벽까지 실제 확인. 모든 peer 허용을 사용자 인가로 취급하지 않음 |
| 저장 | n8n과 별개 external named volume, `/var/lib/postgresql/data` | 새 전용 볼륨·용량·권한/소유자·백업 경로. 기존 n8n 볼륨 재사용 금지 |
| 초기 계정 | postgres bootstrap, 앱 계정으로 사용하지 않음 | DB/owner/runtime 분리 후 사용 범위 확인 |
| 비밀 | bootstrap/owner/runtime 서로 다른 파일3개, Compose secrets | 실제 파일은 저장소 밖, 상위700·파일600, 출력/공개 로그 제외 |
| 인증 | TCP host SCRAM, password_encryption SCRAM | 실제 TCP runtime 접속 성공과 잘못된 비밀 거절 |
| 마이그레이션 | 자동 initdb 마운트 없음. 검토된001~004만 명시 실행 | PR #23 수정·수정본 hash/적용 순서·fresh DB/upgrade 구분 |
| healthcheck | pg_isready | 프로세스 readiness일 뿐 계정·함수·업무 저장 통과가 아님 |
| 자원/운영 | 로그10m×3, 종료 유예60초. statement/오류 SQL 원문·bind 값 로그 억제 | 실제 메모리·디스크·보존기간·관측성·백업 주기·RPO/RTO 확인 |

Compose의 external 네트워크는 기존 Docker bridge 참조다. `internal:true` 전용망을 새로 만든 것이 아니며 기존망 peer와의 격리 수준을 R04가 검토한다. 별도 전용망이 필요하면 기존 n8n의 영속 네트워크 설정까지 함께 검토한 다음 변경한다. 내부 bridge에서 SSL 미사용을 초기 검토안으로 두며 조직 요구나 실제 연결 경계가 TLS를 요구하면 인증서·n8n SSL 검증 설정까지 준비한 뒤 적용한다. 기존 보안 설정을 끄는 절차는 포함하지 않는다.

이미지 index는 registry 조회로 고정했고 linux/amd64 manifest는 `sha256:cf5d353f55240ecc2f811827a15c7d1f2d562f08019b49dca12b5a59f4ab5962`, linux/arm64/v8은 `sha256:c7d8cf162cb365b478761fa957ff4e58c2cd0ee748c6084056955de0dda9abf4`다. VM의 실제 아키텍처는 이번 작업에서 재조회하지 않았으므로 적용 성공으로 쓰지 않는다.

## 2 R04에게 요청할 검토

다음 항목별로 **동의/수정 필요/미확인**과 수정 이유를 회신받는다. 파일별 책임은 [팀 헌장](../docs/project/TEAM-CHARTER.md)을 따른다.

1. PostgreSQL16.15와 `/var/lib/postgresql/data`가 수정된 함수·드라이버·복원 절차에 맞는가? 상태/DLQ와 RAG 벡터 저장은 별도 범위로 유지하는가?
2. 기존망 별칭·무공개포트·전용 볼륨·SCRAM·파일 비밀 주입과 TLS 초기안이 적절한가? VM 자원과 추가 격리 조건이 있는가?
3. bootstrap·migration owner·NOLOGIN runtime role·앱 LOGIN 분리와 CONNECT/USAGE/SELECT/INSERT/UPDATE/EXECUTE 범위가 충분하고 과도하지 않은가?
4. 수정된001~004와 계약 시험의 적용 순서는 무엇인가? 기존001 적용 DB라면 재실행 대신 ALTER 등 별도 upgrade가 필요한가?
5. 백업에 스키마·함수·최소 상태·DLQ가 포함되고, 복원 시 owner 확인·002/004 권한 재적용·허용/거절·데이터 비교가 충분한가? 필요한 스냅샷 항목·보존기간·RPO/RTO는 무엇인가?
6. n8n Credential의 DB/user/SSL·함수 schema·실제 워크플로우 ID와 Error Workflow 연결 조건이 맞는가? R02 save/Jira·case_ref 소비와 합의가 필요한 점은 무엇인가?

이는 VM 적용 승인 요청이 아니라 구체적인 배포 준비본의 저장·권한 검토 요청이다. SQL 결함 수정이나 문서 검토만으로 실제 운영 시험 통과를 선언하지 않는다.

## 3 적용 전 자료와 명령 준비

아래는 검토 후 Linux VM에서 사용할 명령이다. **이번 작업에서 실행하지 않았다.** 경로·환경값은 비공개 운영 파일로 확인하고 다른 프로젝트/볼륨에 명령을 적용하지 않는다. `DUBAKWI_POSTGRES_ENV_FILE`은 실제 비밀 값이 아닌 파일 위치와 external 자원 이름을 담는 별도 private env 파일이다. 셸에 해당 경로를 준비하고 저장소 루트에서 시작한다.

```sh
docker compose --env-file "$DUBAKWI_POSTGRES_ENV_FILE" -f infra/postgres-compose.yaml config --quiet
docker network inspect "$DUBAKWI_POSTGRES_N8N_NETWORK" --format '{{.Name}} {{.Driver}}'
docker volume inspect "$DUBAKWI_POSTGRES_DATA_VOLUME" --format '{{.Name}} {{.Driver}}'
```

env 파일을 Compose가 읽는 것과 셸 환경변수 주입은 별개다. inspect용 비밀 없는 두 자원 이름도 운영자가 셸에 명시한다. 실제 secrets 파일 존재/소유/600·부모700, 이미지/아키텍처, 기존망 alias 중복, 전용 볼륨 빈 상태/소유권을 R01이 확인한다. 신규 볼륨 생성은 대상 이름을 검토한 뒤 초기 준비에서만 한다. 위 inspect 실패를 임의 create로 덮지 않는다.

PR #23 수정 재시험은 통과했다. 이후 준비본 검토·물리 DB 채택·자원/백업 검토가 끝나면 R01이 새 PostgreSQL 서비스만 기동한다. n8n Compose 교체·n8n 재시작·P19 게시를 섞지 않는다.

```sh
docker compose --env-file "$DUBAKWI_POSTGRES_ENV_FILE" -f infra/postgres-compose.yaml up -d postgres
docker compose --env-file "$DUBAKWI_POSTGRES_ENV_FILE" -f infra/postgres-compose.yaml ps
```

## 4 owner/runtime와 마이그레이션

초기화 완료 후 한 번만 수행하는 역할/DB 준비 예시다. 같은 이름이 이미 있으면 중단해 실제 소유자·권한을 확인한다. IF NOT EXISTS나 비밀번호 덮어쓰기로 기존 환경을 변경하지 않는다. 아래 psql은 컨테이너 내부 Unix socket의 bootstrap 접근으로 실행하며, n8n에 이 계정을 연결하지 않는다. 비밀 파일 내용이나 확장 env/SQL 전체를 출력하지 않는다. 실행 전/후 자료는 VM 비공개 증거 경로에 둔다.

```sh
docker compose --env-file "$DUBAKWI_POSTGRES_ENV_FILE" -f infra/postgres-compose.yaml exec -T postgres psql -X -U postgres -d postgres -v ON_ERROR_STOP=1 <<'SQL'
\set owner_password `cat /run/secrets/postgres_owner_password`
\set runtime_password `cat /run/secrets/postgres_runtime_password`
CREATE ROLE dubakwi_owner LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS PASSWORD :'owner_password';
CREATE ROLE dubakwi_runtime NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS;
CREATE ROLE dubakwi_app LOGIN INHERIT NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS PASSWORD :'runtime_password';
GRANT dubakwi_runtime TO dubakwi_app;
CREATE DATABASE dubakwi_service OWNER dubakwi_owner;
REVOKE ALL ON DATABASE dubakwi_service FROM PUBLIC;
GRANT CONNECT ON DATABASE dubakwi_service TO dubakwi_app;
\unset owner_password
\unset runtime_password
SQL
```

비밀번호3개는 비어 있지 않고 서로 다른 난수64자리hex로 준비한다. CR/LF·공백을 값에 포함하지 않으며 실제 값은 이 문서의 예시가 아니다. 이번 준비 작업에서는 생성·등록하지 않는다. runtime에는 DB CREATE/TEMP나 service DELETE/TRUNCATE/DDL을 부여하지 않는다. owner 백업 클라이언트와 runtime 클라이언트는 각각 private 비밀을 사용한 TCP 접속을 시험해야 하며 bootstrap socket 성공만으로 인증을 통과 처리하지 않는다.

마이그레이션은 검토된 기본 브랜치의 파일 해시·수정 PR을 기록한 후 owner로 실행한다. main95479d5에는 PR #23 수정본365c419의001~004가 포함돼 있다. 실제 적용 때도 현재 검토 버전과 파일 해시를 다시 확인하고, 이미001이 적용된 DB는 별도 upgrade 절차를 검토한다. 파일 적용 시 `exec -T`의 stdin으로 SQL을 전달하고 런타임 검증과 분리한다.

```sh
docker compose --env-file "$DUBAKWI_POSTGRES_ENV_FILE" -f infra/postgres-compose.yaml exec -T postgres psql -X -U dubakwi_owner -d dubakwi_service -v ON_ERROR_STOP=1 -f - < infra/db/migrations/001-create-service-storage.sql
docker compose --env-file "$DUBAKWI_POSTGRES_ENV_FILE" -f infra/postgres-compose.yaml exec -T postgres psql -X -U dubakwi_owner -d dubakwi_service -v ON_ERROR_STOP=1 -v runtime_role=dubakwi_runtime -f - < infra/db/migrations/002-grant-runtime-access.sql
# 아래003/004도 검토한 실제 main 파일 해시를 기록한 뒤 사용한다.
docker compose --env-file "$DUBAKWI_POSTGRES_ENV_FILE" -f infra/postgres-compose.yaml exec -T postgres psql -X -U dubakwi_owner -d dubakwi_service -v ON_ERROR_STOP=1 -f - < infra/db/migrations/003-create-storage-functions.sql
docker compose --env-file "$DUBAKWI_POSTGRES_ENV_FILE" -f infra/postgres-compose.yaml exec -T postgres psql -X -U dubakwi_owner -d dubakwi_service -v ON_ERROR_STOP=1 -v runtime_role=dubakwi_runtime -f - < infra/db/migrations/004-grant-storage-functions.sql
```

제약/함수 고장 주입은 폐기 가능한 별도 시험 DB에서 한다. R04 검증 SQL의 privilege 검사는 실제 앱 로그인으로 수행하고, source 함수가 존재함·원본 hash·명시적 JSON null fail·활성 claim 보존·미준비 Jira save 차단을 함께 확인한다. 운영 테이블을 시험 초기화하지 않는다.

## 5 백업·복원·재시작의 확인 조건

1. dump는 owner로 `pg_dump --format=custom --no-owner --no-acl`을 실행해 저장소 밖 권한600 파일에 보관한다. 대상 DB·시각(KST)·이미지·SQL/워크플로우 버전·설정 버전·체크섬을 비공개 manifest에 기록한다. dump와 같은 디스크만으로 별도 장애 대비가 된다고 쓰지 않는다.
2. `pg_restore --list`로 archive 구문을 확인한다. 이것만으로 복원 성공이 아니다. bootstrap 역할/비밀과 DB 내용 백업은 구분한다.
3. 다른 이름의 빈 restore-test DB를 owner 소유로 만들고 `pg_restore --no-owner --no-acl --exit-on-error --single-transaction`으로 복원한다. 운영 DB를 대상으로 --clean·DROP·덮어쓰기하지 않는다.
4. DB CONNECT와 schema/table/function 소유자를 확인하고, R04의002와 수정된004를 재적용한다. 별도 시험 앱 연결에서 허용/거절·스키마/함수 존재·행 수·revision·known Jira ID·미해결 DLQ 상태를 백업 전 snapshot과 비교한다. 검증 SQL이002/004의 실제 schema에 맞는지 R04 확인을 받는다.
5. PostgreSQL 서비스만 재시작한 뒤 동일 볼륨·데이터·TCP 앱 인증·함수 호출을 확인한다. n8n/RAG 재시작은 별도 시험이며 섞지 않는다. processing/unknown/reprocessing을 자동 completed/replay로 바꾸지 않는다.
6. 실패 시 n8n Credential을 연결하거나 P19를 게시하지 않고 known ID·원 실행·DB 결과를 보존한다. 일반 배포에 down -v·볼륨 제거·DB 초기화를 넣지 않는다.

백업/복원 명령 예시는 다음과 같다. DUBAKWI_POSTGRES_BACKUP_FILE은 외부 private 파일의 새 절대 경로이고, DUBAKWI_POSTGRES_RESTORE_DB는 사전 확인한 새 시험 DB 이름이다. 비밀 값은 인자로 넘기지 않는다.

```sh
umask 077
docker compose --env-file "$DUBAKWI_POSTGRES_ENV_FILE" -f infra/postgres-compose.yaml exec -T postgres pg_dump -U dubakwi_owner -d dubakwi_service --format=custom --no-owner --no-acl > "$DUBAKWI_POSTGRES_BACKUP_FILE"
# 종료 코드0·파일 존재/크기·checksum을 확인하고 실패 파일은 검증된 백업으로 표시하지 않는다.
docker compose --env-file "$DUBAKWI_POSTGRES_ENV_FILE" -f infra/postgres-compose.yaml exec -T postgres pg_restore --list < "$DUBAKWI_POSTGRES_BACKUP_FILE"
# restore-test DB 생성/대상 확인 뒤에만 아래를 사용한다.
docker compose --env-file "$DUBAKWI_POSTGRES_ENV_FILE" -f infra/postgres-compose.yaml exec -T postgres pg_restore -U dubakwi_owner -d "$DUBAKWI_POSTGRES_RESTORE_DB" --no-owner --no-acl --exit-on-error --single-transaction < "$DUBAKWI_POSTGRES_BACKUP_FILE"
```

## 6 n8n Credential과 연결 순서

| 설정 | 검토 값 |
| --- | --- |
| 이름·종류 | dubakwi-postgres · Postgres |
| Host/Port | dubakwi-postgres /5432, n8n 컨테이너에서 DNS/TCP 확인 |
| Database/User | dubakwi_service /dubakwi_app |
| Password | 검증한 runtime 파일의 실제 값. 공개 env·Git·요약·명령 인자로 복제하지 않음 |
| SSL | 같은 VM Docker bridge의 초기 미사용안, R04 경계 검토 후 확정. TLS 요구 시 인증서 검증까지 준비 |
| 연결 대상 | 검토된 state/DLQ Postgres 노드, 실제 Credential ID 명시 |

DB 자체 검사 → 같은 n8n 네트워크의 TCP 앱 접속/오인증 거절 → R05 저장 계약/권한/복원 검사 → Credential 등록/연결 테스트 → 비활성 state/DLQ 반입·ID/원본diff → 하위 기능 실제 호출 순서다. 환경 ID는 JSON 원본에 고정하지 않고 배포 사본에 기록한다. 원본 `dubakwiState01`·`dubakwiDlq0001`과 실제 VM ID가 다르면 R02 호출값을 같이 맞춘다. Header Auth의 팀/내부 Credential과 Postgres Credential을 혼동하지 않는다.

운영 P11은 이 과정 동안 유지한다. state/DLQ 연결 성공 후에도 Jira/handoff·Error Workflow·S1 생성/종료/최종 저장·시간 기준·R05 공식 판정이 남는다. S1 전 P19 전환은 하지 않는다.

## 7 준비본 검증과 근거

준비본은 Compose 문법·필수값 누락 차단·공개 포트 없음·external 볼륨/네트워크·세 비밀 파일 참조와 이미지 digest를 로컬에서 검사한다. VM 리소스 생성·DB 기동·비밀 생성·Credential 등록·백업/복원은 준비본 검사에 포함하지 않는다. 실제 실행 증거와 문서 제안을 구분한다.

공식 근거: [Compose secrets](https://docs.docker.com/compose/how-tos/use-secrets/), [external volume](https://docs.docker.com/reference/compose-file/volumes/), [PostgreSQL16 backup/restore](https://www.postgresql.org/docs/16/backup-dump.html). Compose secrets는 파일 mount 방식이며 host 파일의 보관/권한까지 자동 암호화하는 기능으로 설명하지 않는다.
