# 기존 VM 배포 전 점검과 인계

- 작성: 2026-11-04 KST / v0.11 / P19 VM Credential·검색·모델 부분 연결 시험 반영
- 책임: [팀 헌장](../docs/project/TEAM-CHARTER.md). 원장: [P04/P13](../docs/DEVELOPMENT-PLAN.md#5-작업-원장). 운영 기준: [infra 안내](README.md).

## 0 현재 인계 상태 (2026-11-05 KST)

현재 support/search 게시와 원본 수동 index를 유지하며,79일차 GitLab 원본 data-api를 기존 내부망에 추가했다. 신규 P11 LN01~LN11×내부/HTTPS는22/22이고 예상 메타 로그18건 모두 저장됐다. 이전 B35 타임아웃은 이번 실행에서 해소됐다. 상세는11절의 새 증거를 따른다. 이전10/10·RAG7/7·수동색인44청크와 최초 실패는 당시 기록으로 보존한다.

후속 P19 연결 시험에서 B14 내부 검색과 L01~L03 실제 OpenAI 호출을 확인했다. P19 전체는 비활성 반입했으며 운영 P11을 유지한다. 시험 사본도 종료 후 비활성화했다. 상세 범위·10.228초 측정의 한계는12절을 따른다.

1~6절은 최초 준비,7~12절은 날짜별 후속이다. 최신 서비스 상태는12절이 우선한다. 80경로가 없다는 사실을 전체 재사용 원본 부재로 확대했던 해석은79원본 확보로 정정한다. 과정 메모리 API와 실제 Jira·영속 저장·팀 권한 fixture·공식 R05 판정은 구분하며 P04/P09/P11/P13/P19 전체 완료로 표시하지 않는다.

## 1 확인한 범위와 현행 구성

2026-11-04 웹 SSH에서 기존 n8n 이미지 태그 2.42.6, 관련 컨테이너5개 실행, Docker Compose v5.6.1, n8n 데이터 named volume, 기존 Docker 네트워크를 확인했다. 이 관측은 설치 시각이나 최대 처리량을 증명하지 않는다. HTTPS healthz는 HTTP200을 확인했다. 현재 관측한 Docker 컨텍스트의 전체 컨테이너 목록에는 과정 data-api가 없다. 다른 사용자/경로/호스트의 설치 부재까지 확정하지 않는다.

실제 주소·계정 경로·컨테이너/볼륨/네트워크 식별자는 비공개 관측 기록에 보존하며 공개 문서에 복제하지 않는다. 기존 Compose·볼륨·Credential은 유지한다. 신규 n8n 인스턴스·서비스 DB를 추가하지 않았다. 저장소의 infra/compose.yaml은 여전히 미작성이며 기존 VM Compose를 대체하는 실행 원본으로 사용하지 않는다.

## 2 운영 경로와 기록

VM의 로그인 사용자 홈 아래 `dubakwi/`와 `deploy/`·`backups/`·`evidence/`를 소유자 전용 권한700으로 준비했다. 이 경로는 Git 저장소 밖의 운영 자료 위치다. 기존 설치 경로·데이터 볼륨을 이동하지 않는다.

| 경로 | 용도 | 현재 상태 |
| --- | --- | --- |
| deploy/ | 검토된 기본 브랜치 커밋·JSON 체크섬·이미지 ID·설정 버전·가져오기 연결 목록 | P11 원본·환경 연결 사본·게시 매니페스트 보관(8~9절) |
| backups/ | 구성·비밀·일관된 DB 백업의 접근 제한 보관 | 2026-11-05 SQLite/설정 기준 백업·무결성/체크섬 확인, 전체 복원 미실행 |
| evidence/ | 비공개 서버 점검·원시 실행·운영 기록 | 디렉터리 준비, 공개 전 가림 필요 |

운영 경로는 팀 로컬 작업 디렉터리 구조를 대체하지 않는다. 검토된 저장소 체크아웃은 별도 경로에 두고 기록에는 commit을 연결한다. 실제 .env·키·볼륨·백업은 Git에 넣지 않는다.

## 3 읽기 전용 점검

아래 명령의 경로/이름은 비공개 관측값으로 치환한다. 전체 inspect·Compose 확장 출력·env·Credential 내용을 보고서에 붙이지 않는다.

```bash
docker compose version
docker compose ls
docker ps -a --format 'table {{.Names}}\t{{.Image}}\t{{.Status}}'
docker inspect <n8n-container> --format '{{range .Mounts}}{{println .Type .Name .Destination}}{{end}}'
docker inspect <n8n-container> --format '{{range $k,$v := .NetworkSettings.Networks}}{{println $k}}{{end}}'
curl -sS --max-time 5 -o /dev/null -w '%{http_code}\n' <confirmed-https-base-url>/healthz
```

HTTP200은 n8n 기본 상태 확인이다. 로그인·Credential·업무 Webhook·Jira·RAG 통과를 의미하지 않는다. 컨테이너 내부 localhost는 호스트나 다른 컨테이너가 아니다. R04 data-api 원본·실행 구성이 인계되면 확인한 네트워크와 서비스 이름으로 연결을 검토하고 임의 IP·공개 포트를 고정하지 않는다.

## 4 변경 전 백업과 복구 조건

1. 기존 Compose 경로·프로젝트·이미지 태그와 ID/다이제스트·볼륨/네트워크·설정 버전을 비공개 기록한다. 현재 image tag 관측만으로 immutable 배포 식별 완료라고 쓰지 않는다.
2. Compose 원본·실제 참조 설정/비밀·TLS 파일·n8n 암호화 키의 보관 위치와 복원 권한을 확인한다. 내용은 화면/공개 로그에 출력하지 않는다. 파일 일부만 복사한 것을 Credential 복구 보장으로 기록하지 않는다.
3. n8n 내부 DB 종류·실행 중 업무를 확인하고 일관된 백업 방식을 정한다. 실행 중인 볼륨의 단순 tar/cp를 DB 일관성 백업으로 간주하지 않는다. 중단이 필요하면 작업 담당자와 시점을 맞추고 정상 중단 절차를 사용한다.
4. 새 백업 묶음에는 KST 실행묶음ID·대상 버전·파일 체크섬·DB 방식·확인 결과를 기록하며 기존 백업을 덮어쓰지 않는다. 비밀/데이터는 VM 제한 경로에 두고 가린 요약만 공유한다.
5. 서비스 DB와 Jira 복구는 R04의 외부 효과/처리권 확인 후 수행한다. 복원 시험을 하기 전에는 복구 가능으로 표시하지 않는다. down -v·볼륨 삭제·DB 초기화를 일반 재배포에 넣지 않는다.

2026-11-04 점검에서는 백업 디렉터리와 절차만 준비했다. 2026-11-05의 중단 없는 SQLite/설정 기준 백업은7절을 따른다. 전체 복원·정지·재시작은 수행하지 않았다.

## 5 첫 WF08/WF13 시험의 인계 조건

| 담당 | 이미 정해진 기준 | 실제 받아 확인할 것 |
| --- | --- | --- |
| R02 | workflows/dubakwi-support.json, 입력/주입/오류 계약 | 검토된 P11 배포 커밋·필요 Credential·사용자 조회 설정 위치·가져오기·활성화(게시) 확인 |
| R04 | 서버 사용자 조회·미등록/장애 구분 | data-api 원본/버전·실행 구성·인증·네트워크·등록/미등록 시험 사용자 |
| R05 | cases/common.json WF08/WF13, run_cases.py | 사례와 배포본 대응, 실행 화면/API 접근·실행 노드 목록으로 호출0 확인 |
| R01 | 기존 n8n 유지·환경별 연결·배포 기록 | 백업 준비·실제 URL·Credential 연결·배포 버전·운영 Webhook 활성화·실행 기록 접근 취합 |

### 5.1 운영 경로와 실행 기록 접근

R02 골격 JSON의 active=false는 내보내기 상태다. 검토된 배포본을 VM에 가져온 뒤 R01이 Credential·이름/경로 중복·활성화(게시)를 확인하고, 운영 /webhook/dubakwi-support 경로가 열렸는지 확인한다. /webhook-test의 일시 수신이나 healthz200으로 운영 경로 활성화를 대신하지 않는다. 최초 점검 당시 활성화·접근권 변경은 미실행이었다. 2026-11-05 실제 게시·실행 화면 접근 결과는 9절을 따른다.

R05는 해당 실행의 실행 화면 또는 기존에 허용된 API에서 실행 ID·배포 버전·실행 노드 목록을 확인할 수 있어야 한다. 실행 데이터 저장 설정과 접근 가능한 경로를 배포 전에 확인한다. 공개 요약은 필요한 실행 식별자·노드 이름·판정만 기록하고, 원문 질문/응답·연락처·헤더·키가 있는 화면은 가린 뒤 공유한다. 기록 확인을 위해 새 계정/키·확대 권한이 필요하면 별도 인계하며 이 문서만으로 권한을 생성하지 않는다.

### 5.2 data-api 준비 전후 시험 범위

| 사례 | data-api 전제 | 골격에서 기대하는 실행 경로 |
| --- | --- | --- |
| WF08 주입 | 사용자 조회 불필요 | B01→B02→B03→B33→B35→B36, B04/M01 미실행 |
| WF13 빈 질문·501자 | 사용자 조회 불필요 | B01→B02→B03→B33→B35→B36, B04/M01 미실행 |
| WF13 미등록 사용자 | 사용자 조회 서비스의 정상 404 판정 필요 | B01~B06→B33→B35→B36, M01 미실행 |

앞의 세 입력은 검토된 골격·인증·활성화·실행 기록 접근이 준비되면 data-api 사용자 조회 인계 전에도 별도 실행 가능하다. 단 B35 /logs는 data-api 부재로 실패할 수 있으며 골격의 응답 유지 동작과 별도로 기록하고 호출0의 증거로 쓰지 않는다. 시험 도구에서 파일 수준 tickets-reset 등 before hook이 실행된다면 data-api 불필요 시험에는 --no-hooks 등으로 해당 부수 호출을 방지할 수 있는지도 확인한다.

현재 골격에는 LLM·티켓 노드가 없으므로 이번 결과는 골격 입력 거절/차단 경로의 증거다. LLM·티켓 기능을 붙인 뒤 같은 사례를 재시험해 해당 노드 실행0·티켓 수 변화0을 확인한다. 이번 결과를 최종 구현의 회귀 통과로 재사용하지 않는다. 현재 실제 VM 시험은 모두 미실행이다.

R05의 새 사례 형식에서는 WF13a(빈 질문)·WF13b(미등록)·WF13c(501자)로 나뉜다. 실제 명령은 main에 반영된 사례/실행 도구 버전에 맞추고, 아직 미병합인 r05/p06-flow-cases와 기존 main의 옵션·ID를 섞지 않는다. r05/p06-flow-format은 사용 종료로 전달받았다.

Webhook은 POST /webhook/dubakwi-support, Header Auth X-Team-Key다. 실제 비밀은 n8n Credential과 호출 환경에서만 연결한다. 환경별 Credential ID·하위 워크플로우 ID는 별도 확인하며 개인 개발 환경의 ID를 VM에 그대로 신뢰하지 않는다.

루트 [.env.example](../.env.example)은 이미 구현된 R05 도구가 읽는 DUBAKWI_WEBHOOK_TOKEN 이름과 빈 값을 제공한다. 기존 VM Compose 설정을 생성/교체하는 파일이 아니다. run_cases.py 자체는 .env를 읽지 않으며 uv의 --env-file 또는 셸 환경 주입이 필요하다. 실제 키가 준비되기 전에 예시값으로 Credential을 생성하지 않는다.

검토된 배포본과 R04 인계 전에는 data-api 설치·네트워크 연결·JSON 가져오기·Credential 신규 생성·실제 시험을 완료로 기록하지 않는다. 전체 시스템의 Jira·RAG·Discord 완료를 첫 입구 시험의 선행 조건으로 두지는 않는다.

## 6 P11 배포 전 재점검 (2026-11-04 KST)

R01이 검토한 P11은 `e48a66f`다. Code 노드 대체값 시험50건·Python 시험34건·Ruff·링크/공개 후보 검사를 통과했다. 실제 VM Webhook·R05 공식 판정은 실행하지 않았다. B01은 이름만 있는 Header Auth 참조이므로 가져오기 후 실제 Credential의 이름·유형·헤더 설정을 확인해야 한다. B04/B35의 `data-api:8800`은 VM에서 별도 연결 확인 대상이며 B05 권한/오류 계약의 관련 역할 검토는 남아 있다.

VM의 기존 n8n2.42.6·Compose5.6.1·named volume을 재확인하고 이미지 ID를 비공개 기록했다. SQLite WAL과 설정 파일 존재/권한600을 확인했으며 비밀 내용은 읽거나 내보내지 않았다. 현재 워크플로우·Credential·실행 기록은 각각0건이다. 로그인 계정에서 Executions 목록을 열 수 있으나 개별 실행/노드 화면·실제 기록 저장은 실행 후 확인해야 한다. 선택한 실행 저장/보존 환경변수는 명시되지 않았으므로 실제 기본값을 이번 점검만으로 확정하지 않는다.

운영 디렉터리 권한700은 유지된다. 이번 배포의 백업 증거는 없으며 백업/복원은 수행하지 않았다. SQLite가 WAL 모드이므로 실행 중 DB 파일만 단순 복사하는 방식은 사용하지 않는다. 기존 구성·암호화 키 복구 위치를 포함한 일관된 백업 방식은 R04 검토 후 적용한다. 현재 Docker 컨텍스트에 data-api가 보이지 않고 컨테이너 내부 이름 조회도 EAI_AGAIN으로 실패했다. 미등록 사용자·정상 문의 시험은 R04 공급/네트워크 인계 후 진행한다.

### 6.1 과정 도구와 가져오기 결정

공식 공개 저장소 main `eb6937f`에서 Last3Mon은79일차까지 있으며 가이드가 지시하는80일차 tools/flow.py는 확인되지 않았다. 78·79일차 공식 도구의 check는 P11 B01에서 `credential must use a course id` 오류1건으로 거절했다. 도구가 허용하는 course ID는 OpenAI용이며 팀 Header Auth를 그 ID로 바꾸면 안 된다.

78·79일차 push 구현에는 동일 Webhook의 기존 워크플로우 게시 해제·가져오기/게시·n8n 재시작이 포함돼 있다. VM에서 push를 실행하지 않았다.80일차 도구/호환 방법 확인 전 해당 도구를 팀 배포 원본으로 확정하지 않는다. UI 수동 가져오기는 검토 후보이며 이번에 실제 가져오기나 게시를 검증하지 않았다. UI를 사용해도 가이드 검사 통과를 대신했다고 기록하지 않는다. 도구 원본을 임의 수정하거나 검사를 우회하지 않는다.

배포 순서는 관련 역할 검토 취합 → 기본 브랜치 병합 → 백업·팀 Header Auth 준비 → 검토된 가져오기 방법으로 비활성 JSON 반입 → B01 실제 Credential 연결 → 게시·중복 경로·실행 기록 확인 → R05 부분 시험 인계다. 현재 부족한 Credential과 백업을 준비 완료로 쓰지 않는다. P19 내부 Credential·주소·RAG 재색인은 후속 연결이며 P11 첫 입력 시험의 선행 조건이 아니다.

새 검증 요약: [P11·도구·VM 점검](../runs/public/20261104-165003-local-p11-vm-preflight/summary.json). 과거 관측과 실패 기록은 보존한다.

## 7 2026-11-05 중단 없는 사전 준비 결과

사용자가 추가 제약 없이 가능한 준비를 지시해 R01이 기존 VM에서 실행했다. 서비스 상태와 기존 Credential을 바꾸지 않고 다음을 준비했다.

| 준비 항목 | 결과 | 완료로 해석하지 않을 것 |
| --- | --- | --- |
| 운영/비밀 경로 | 기존 deploy/backups/evidence 유지, secrets 경로 추가·권한700 | 서비스 DB 배포 |
| 기준 백업 | SQLite online backup과 n8n config·Compose·사용 중 Compose env의 제한 경로 사본 | 전체 볼륨·외부 시스템 백업이나 복원 보장 |
| 백업 검증 | integrity_check=ok, 파일 체크섬 대조 통과, 스냅샷의 업무/인증/실행 건수0 | 복원된 n8n에서의 실제 로그인·Credential 사용 시험 |
| 키 후보 | 입구·내부용으로 서로 다른256비트 난수 생성, VM secrets 파일에만 보관·권한600 | 활성 API 키 발급이나 n8n Credential 등록 |
| 등록 준비 자료 | header-auth.pending.json과 비밀 없는 credential-readiness.json 준비 | Credential ID 배정·워크플로우 연결 |
| 서비스 상태 | 재시작 없음, 작업 후 healthz200 | 실제 업무 Webhook 통과 |

비밀 원본은 VM의 `dubakwi/secrets/team-keys.env`와 `header-auth.pending.json`에만 있다. 공개 문서/PR/채팅·로컬 저장소에 값이나 비밀 파일을 복제하지 않는다. 후보 이름은 기존 `dubakwi-team-key`(X-Team-Key)·`dubakwi-internal-key`(X-Internal-Key)를 따른다. 등록 준비 JSON은 그대로 실사용 성공을 보장하는 배포 원본이 아니며 등록 시 해당 n8n 버전의 import/필드·환경별 ID·소유권을 확인해야 한다. 새 Credential 실제 생성은 실행 직전 필요한 확인과 백업 검토 후 별도 수행한다. 후보 파일은 다시 준비할 때 덮어쓰거나 키를 회전하지 않는다.

이번 백업은 SQLite online backup으로 WAL의 반영 상태를 포함하는 DB 사본을 만들고, 설정/구성은 별도 파일 사본으로 보관했다. DB 스냅샷 확인 중 생긴 WAL/SHM도 백업 목록에 기록했다. 비밀 포함 파일·매니페스트는 제한된 백업 디렉터리에 보존한다. 컨테이너 임시 스냅샷은 권한600으로 유지하며 승인된 정리 시 별도 제거한다. 전체 n8n 복원·서비스 DB·Jira·RAG 메모리의 복구를 시험한 것은 아니다.

OpenAI/Jira/Discord는 계정 공급·실제 등록이 남아 있고 PostgreSQL/data-api 기동·포트/네트워크 변경·업무 JSON 가져오기·게시는 하지 않았다. 서비스 DB 스키마/마이그레이션은 R04 원본을 기다린다. 새 공개 증거는 [사전 준비 요약](../runs/public/20261105-101747-vm-baseline-preparation/summary.json)이다.

## 8 P11 비활성 반입 (2026-11-05 KST)

검토된 main `0e44fdb`의 P11 JSON을 VM 운영 경로에 내려받아 SHA-256 `f826ce1362f5379f8d01ecbc699fd34e5d4b476427e83734867461090388cac3`을 확인했다. 기존 기준 백업의 체크섬을 다시 검증하고 개인 프로젝트가 하나임을 확인했다. 서버 CLI `import:workflow`로 비활성 초안을 반입했다. 최초 원본 반입은 ID 부재로 `workflow_entity.id` NOT NULL 오류가 났고, 환경용 id/versionId만 추가한 사본으로 재시험해 성공했다. 첫 실패/재시험 로그·소스/배포 해시·프로젝트/워크플로우 ID는 VM 제한 경로 매니페스트에 남겼다. 노드·연결·설정은 DB 저장본과 main 원본의 일치를 확인했다.

현재 워크플로우1건·active=false·activeVersionId=null·Credential0건·실행0건, healthz200이다. 기존 서비스 재시작·Compose/네트워크 변경은 없다. 등록 준비 키는 VM에 보존했으며 Credential 등록·연결·게시·WF08/WF13 시험은 아직 하지 않았다. 브라우저 도구의 신규 지속 인증 접근에 대한 실행 시점 확인 조건을 적용한다. 과정 도구 버전은 사용자 결정대로 강사님 지정본을 따르며 이번 서버 CLI 반입을 과정 flow.py 검사 통과로 기록하지 않는다. [n8n 공식 CLI 안내](https://docs.n8n.io/hosting/cli-commands/)와 설치된2.42.6의 help를 확인했다.

[새 반입 검증 증거](../runs/public/20261105-103334-vm-p11-staging/summary.json). 다음 순서는 팀 Header Auth 등록·환경 Credential ID 연결 → 게시 → 운영 경로·실행 기록 → R05 입력/차단 부분 시험이다.

## 9 P11 인증 연결·게시·입력 부분 시험 (2026-11-05 KST)

사용자가 팀 인증 등록·P11 게시·부분 시험 진행을 지시했다. OpenAI Credential 저장/연결 테스트 성공은 UI에서 확인했고, 현재 OpenAI 등록을 포함한 새 SQLite 온라인 백업을 생성해 무결성 ok·파일 체크섬을 확인했다. 기존 팀/내부 키 후보를 다시 생성하지 않고 Header Auth에 등록했다. Credential은 OpenAI/팀/내부3건이며 기존 OpenAI 항목을 보존했다. 환경별 id/versionId와 B01 Credential id만 연결하고 서버 CLI로 게시했다. 서비스 재시작·Compose/포트/네트워크 변경은 없었다.

초기 운영 경로404는 런타임 게시 동기화 후403으로 전환됐다. 기존 HTTPS의5678포트 경로와 VM 내부 경로에서 키 없음/틀린 키403, 빈 질문/501자400, 주입200·차단의5건씩 총10건을 실제 호출해 모두 통과했다. 외부 도메인의 기본 포트502는 n8n의5678 HTTPS 경로와 구분하며 기본 프록시 설정을 바꾸지 않았다.

워크플로우1건·게시 확인·Credential3건·저장 실행6건(ID1~6)·healthz200이다. 실행6건의 B01→B02→B03→B33→B35→B36, B04/M01 호출0을 확인했고 실행 목록/개별 화면 접근도 확인했다. B35는6건 모두 ECONNABORTED 출력으로, 응답 유지와 별개인 메타 로그 실패다. data-api 연결과 재시험이 남아 있다. P11의 입력/차단 부분 시험이며 실제 S1·R05 공식 WF 판정·최종 보안 회귀 완료가 아니다. 완성본에 LLM/티켓을 연결한 뒤 호출0을 재시험한다.

원시 결과·실행 입력/헤더·키·환경 식별자와 매니페스트는 VM 제한 경로에 유지한다. 키 값은 로컬이나 Git으로 복제하지 않았다. 임시 Credential 반입 파일은 권한600으로 유지하며 후속 정리 대상이다. [실행 요약](../runs/public/20261105-110022-vm-p11-publish/summary.json)·[부분 시험 보고서](../runs/public/20261105-110022-vm-p11-publish/report.md)를 따른다. 다음 단계는 R04 사용자 공급/data-api와 RAG·실제 저장/Jira 연결이며 OpenAI 노드 호출은 아직 시험하지 않았다.

R05는 사용자 전달 답변에서 준비·관측 기록 범위 병합에 이견이 없다고 확인했다. LN06은 WF-08과 동일 문장 확인이 아닌 **WF-08 유형 주입 시험**으로 해석한다. 기존 elapsed_ms는 B35 타임아웃이 포함됐을 가능성이 있어 정상 서비스 응답시간 성능·SLA 또는 WF-11 판정 근거로 사용하지 않으며 data-api 연결 뒤 재측정한다. [R05 검토 취합과 해석 보완](pr12-r05-review.md)을 따른다. 기존 실행 증거는 보존하고 R04 영향 검토는 대기한다.


## 10 data-api 진단과 RAG VM 연결 (2026-11-05 KST)

변경 전 백업을 새로 검증하고 main0e44fdb의 RAG JSON을 해시 확인해 가져왔다. 배포 사본의 name/id/versionId·기존 OpenAI/내부 Credential만 연결했으며 원본 수동 트리거·업무 로직은 유지했다. 최초 검색3건은 원본 webhookId 부재로404였다. n8n 등록 경로를 확인한 뒤 환경 webhookId만 추가해 재반입/게시했고 인증 없음403·disabled skipped·색인 전index_not_ready로 재시험됐다.

원본 Manual을 UI로 실행한ID9에서44개 청크·Insert44회·Mark ready 성공을 확인했다. CLI 별도 프로세스나 임시 색인 Webhook을 쓰지 않았다. 이후 같은 서버의 실제 R03 HTTP 시험7메서드 전부 통과·생략0, 기존 HTTPS QR검색200/ok와public 근거·제한canary0을 확인했다. P11 입력 부분 회귀5/5도 통과했다. 최종 workflow3건(support/search 게시·index 수동 미게시), Credential3건, healthz200이며 서비스 재시작·포트/네트워크/Compose 변경은 없다.

현재 Docker 컨텍스트에 data-api 컨테이너/별칭이 없고 컨테이너 내 요청은2500ms TimeoutError다. 홈 최대4단계의 비밀/캐시 제외 검색에서 해당 실행 원본을 찾지 못했다. 강사님 공개main HEAD는 이전80일차 원본 미확인 시점과 같은eb6937f다. R04 p09 후보는 users/records JSON이며 실행 API 공급 인계는 남았다. 새 대체 서버·DB는 만들지 않았다.

R04/강사님 인계물은 고정 버전의 실행 원본/이미지·Compose/실행 방법·인증·모의 사용자 공급이다. 기존 n8n 네트워크에서data-api:8800으로 연결하며 B04 GET /employees/{user}, B35 POST /logs와 설계의 응답/권한 계약을 확인한다. 제공 후 R01 배포·R05 등록/미등록/장애·로그 저장 시험을 진행한다. 내부망/별칭을 임의 주소나 공개 포트로 대체하지 않는다.

교육용 지식 승인·실제 서버 사용자 인가·R05공식 판정·S1/저장/Jira는 미완료다. 메모리 색인은 휘발성이며 VM 재시작·동시색인·다중프로세스 공유는 시험하지 않았다. R03 상세 문서의 VM 미검증/수동 색인 문구는 이번 증거의 검토·반영 인계 대상이다. [실행 요약](../runs/public/20261105-111311-vm-rag-integration/summary.json)·[진단/시험 보고서](../runs/public/20261105-111311-vm-rag-integration/report.md).

## 11 GitLab79 data-api와 flow 도구 적용 (2026-11-05 KST)

사용자가 기존 도구 재사용을 지시했다. 고정커밋eb6937f의79/data-api24파일·tools/flow.py를 확보하고 Git blob/해시를 확인했다. 원본 서버·데이터·도구는 변경하지 않았다. P11 GET /employees/{user}, POST /logs 호환을 검토한 뒤 변경 전 온라인 백업을 검증하고 별도 VM Compose로data-api를 기동했다. 원본 Compose는 보존하고 Python3.12-slim 이미지는 실행 다이제스트로 고정했다. 실제 다이제스트/이미지ID·소스/구성해시는 VM 제한 매니페스트에 기록했다.

VM Compose의 소스/데이터는 읽기전용 마운트이며 기존 n8n 네트워크에data-api 별칭으로 연결한다. 호스트는127.0.0.1:8800에만 바인딩했다. 기존 n8n Compose·Credential·게시 상태를 변경하거나 n8n을 재시작하지 않았다. 서비스healthy, 호스트health ok·n8n 내부접속200·모의 직원6명을 확인했다.

기존 P11 시험 도구의LN01~LN11을 내부/HTTPS 각각 실행해22/22 통과했다. 인증 거절을 제외한18건의 실행이 저장됐고 API에 예상request_id의로그18건이 모두 존재했다. 신규18실행의B35오류0·stored=1, B04조회12회·M01mock8회를 확인했다. 정상mock을 실제 접수 성공으로 표시하지 않는다. 기존 RAG 검색ok·대여 안내 근거와 n8n200도 확인했다.

원본 flow.py ops는exit0으로운영조회했다. doctor는data-api·n8n연결을 통과했으나 수업OpenAI ID검사1건으로exit1이다. check P11 source는수업OpenAI ID만허용하는검사에팀Header Auth가거절돼오류1/exit1이다. 원본변경·잘못된Credential ID연결·인증해제는하지않았다. push는재시작을포함하고검사제한이있어미실행, call/test는팀인증헤더인자가없어실제P11시험을대신하지않았다. 고장·초기화·키변경명령도실행하지않았다.

이전80/data-api 미제공은사실이나79재사용원본이있으므로외부인계를배포선행으로두었던해석은정정한다. 향후팀fixture/실제권한·Jira/영속상태·공식시험연결은R04/R02/R05의소유계약을따른다. 과정API의메모리DLQ/티켓을실제Jira/영속저장완료로간주하지않는다. [신규요약](../runs/public/20261105-114531-vm-course79-data-api/summary.json)·[재사용/시험보고서](../runs/public/20261105-114531-vm-course79-data-api/report.md).

## 12 P19 VM Credential·검색·모델 부분 연결 시험 (2026-11-05 KST)

사용자 지시에 따라 기존 P11 시험을 반복하지 않고 PR #16 고정 커밋329778c의 미실행 연결을 시험했다. 새 온라인 SQLite/config 백업 integrity_check=ok를 확인한 뒤 P19 전체54노드를 환경 메타데이터·명시적 Credential ID만 연결한 비활성 사본으로 반입했다. B01은팀키, B14/B15/B27은내부키, L01~L03은기존OpenAI로7노드 모두 실제 반입 결과를 확인했다. 키·Credential 자체는 변경하지 않았다.

별도14노드 시험 사본에서 공개 시민 fixture와 원본 B10/B13/B14/B19/B20/L01~L03을 연결했다. 인증 없음403, 팀키 요청200, 분류rental·B14 검색HTTP200/ok·공개근거5개·작성JSON/인용·검증grounded/policy_ok=true·issues0을 확인했다. 실행45 success에서 원본 모델3개와 검색 노드 실행을 확인했다. 내부 주소는 `http://127.0.0.1:5678/webhook/dubakwi-search`다. fixture 문맥이며 state·DLQ·handoff·Jira를 호출하지 않았다.

종료 후 시험 사본unpublish·경로404, P19전체비활성, 기존support/index/search 내용·게시버전과Credential전체행 동일·n8nhealth200을 확인했다. n8n재시작은없었다. 이번10.228초는부분연결1건이며WF-11 6초통과가아니다. B15/B27은Credential참조확인뿐이며실제handoff미실행, R04사용자/상태/DLQ/Jira·Error Workflow와P19전체VM/R05시험은후속이다. [신규요약](../runs/public/20261105-121200-vm-p19-connection/summary.json)·[연결시험보고서](../runs/public/20261105-121200-vm-p19-connection/report.md).

## 13 변경 기록

| 날짜 | 버전 | 내용 |
| --- | --- | --- |
| 2026-11-05 | v0.11 | P19 비활성54노드 Credential7개 참조 확인·B14/모델3개 실제 부분 시험·사본 비활성화·P11/기존Credential 보존·시간 기준 미판정 |
| 2026-11-05 | v0.10 | GitLab79 원본25파일·고정 이미지 data-api 기동·P11 22/22·로그18/18·flow ops/doctor/check 실제 결과·이전 인계 선행 해석 정정 |
| 2026-11-05 | v0.9 | data-api 부재/원본 인계 조건·RAG 환경 Webhook ID 보완·원본 Manual44청크와 실제 HTTP7/7·HTTPS검색·P11회귀5/5 기록 |
| 2026-11-05 | v0.8 | 사용자 전달 R05 범위 동의 취합·LN06 유형 구분·elapsed_ms 성능 판정 제외 |
| 2026-11-05 | v0.7 | 현재 인계 요약·과거 미실행 문구의 시점 구분, 실행 증거 정합성 재검토 |
| 2026-11-05 | v0.6 | 기존 키 Header Auth 등록·P11 연결/게시·실제 VM 내부/HTTPS10건 통과·실행6건·B35 타임아웃 분리 기록 |
| 2026-11-05 | v0.5 | main P11 원본/백업 검증·CLI 최초 ID 오류/환경 메타데이터 사본 재시험·비활성 반입과 미실행 경계 기록 |
| 2026-11-05 | v0.4 | SQLite online backup·설정 기준 사본 검증·비공개 키 후보/등록 준비 자료·서비스 보존 기록 |
| 2026-11-04 | v0.3 | P11 R01 코드 검토·공식78/79 도구 거절/80 미확인·VM SQLite/빈 목록·Credential/백업 준비 조건 반영 |
| 2026-11-04 | v0.2 | R05 검토 반영: 운영 경로 활성화·실행 기록 접근·data-api 전후 시험 범위·골격 증거의 한계 |
| 2026-11-04 | v0.1 | 기존 VM 관측·운영 경로 준비·읽기 점검·백업 전 조건·첫 시험 인계 정리 |
