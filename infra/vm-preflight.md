# 기존 VM 배포 전 점검과 인계

- 작성: 2026-11-04 KST / v0.1 / R01 환경 준비, 실제 업무 배포 전
- 책임: [팀 헌장](../docs/project/TEAM-CHARTER.md). 원장: [P04/P13](../docs/DEVELOPMENT-PLAN.md#5-작업-원장). 운영 기준: [infra 안내](README.md).

## 1 확인한 범위와 현행 구성

2026-11-04 웹 SSH에서 기존 n8n 이미지 태그 2.42.6, 관련 컨테이너5개 실행, Docker Compose v5.6.1, n8n 데이터 named volume, 기존 Docker 네트워크를 확인했다. 이 관측은 설치 시각이나 최대 처리량을 증명하지 않는다. HTTPS healthz는 HTTP200을 확인했다. 현재 관측한 Docker 컨텍스트의 전체 컨테이너 목록에는 과정 data-api가 없다. 다른 사용자/경로/호스트의 설치 부재까지 확정하지 않는다.

실제 주소·계정 경로·컨테이너/볼륨/네트워크 식별자는 비공개 관측 기록에 보존하며 공개 문서에 복제하지 않는다. 기존 Compose·볼륨·Credential은 유지한다. 신규 n8n 인스턴스·서비스 DB를 추가하지 않았다. 저장소의 infra/compose.yaml은 여전히 미작성이며 기존 VM Compose를 대체하는 실행 원본으로 사용하지 않는다.

## 2 운영 경로와 기록

VM의 로그인 사용자 홈 아래 `dubakwi/`와 `deploy/`·`backups/`·`evidence/`를 소유자 전용 권한700으로 준비했다. 이 경로는 Git 저장소 밖의 운영 자료 위치다. 기존 설치 경로·데이터 볼륨을 이동하지 않는다.

| 경로 | 용도 | 현재 상태 |
| --- | --- | --- |
| deploy/ | 검토된 기본 브랜치 커밋·JSON 체크섬·이미지 ID·설정 버전·가져오기 연결 목록 | 디렉터리 준비, 실제 배포본 미반입 |
| backups/ | 승인된 구성·비밀·일관된 DB/볼륨 백업의 접근 제한 보관 | 디렉터리 준비, 백업/복원 미실행 |
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

이번 작업에서는 백업 디렉터리와 절차만 준비했고 DB 백업·복원·정지·재시작은 하지 않았다.

## 5 첫 WF08/WF13 시험의 인계 조건

| 담당 | 이미 정해진 기준 | 실제 받아 확인할 것 |
| --- | --- | --- |
| R02 | workflows/dubakwi-support.json, 입력/주입/오류 계약 | 검토된 P11 배포 커밋·필요 Credential·사용자 조회 설정 위치·가져오기 확인 |
| R04 | 서버 사용자 조회·미등록/장애 구분 | data-api 원본/버전·실행 구성·인증·네트워크·등록/미등록 시험 사용자 |
| R05 | cases/common.json WF08/WF13, run_cases.py | 사례와 배포본 대응, LLM/티켓 호출0의 실행 증거 확인 방법 |
| R01 | 기존 n8n 유지·환경별 연결·배포 기록 | 백업 준비·실제 URL·Credential 연결·배포 버전 취합 |

Webhook은 POST /webhook/dubakwi-support, Header Auth X-Team-Key다. 실제 비밀은 n8n Credential과 호출 환경에서만 연결한다. 환경별 Credential ID·하위 워크플로우 ID는 별도 확인하며 개인 개발 환경의 ID를 VM에 그대로 신뢰하지 않는다.

루트 [.env.example](../.env.example)은 이미 구현된 R05 도구가 읽는 DUBAKWI_WEBHOOK_TOKEN 이름과 빈 값을 제공한다. 기존 VM Compose 설정을 생성/교체하는 파일이 아니다. run_cases.py 자체는 .env를 읽지 않으며 uv의 --env-file 또는 셸 환경 주입이 필요하다. 실제 키가 준비되기 전에 예시값으로 Credential을 생성하지 않는다.

검토된 배포본과 R04 인계 전에는 data-api 설치·네트워크 연결·JSON 가져오기·Credential 신규 생성·실제 시험을 완료로 기록하지 않는다. 전체 시스템의 Jira·RAG·Discord 완료를 첫 입구 시험의 선행 조건으로 두지는 않는다.

## 6 변경 기록

| 날짜 | 버전 | 내용 |
| --- | --- | --- |
| 2026-11-04 | v0.1 | 기존 VM 관측·운영 경로 준비·읽기 점검·백업 전 조건·첫 시험 인계 정리 |
