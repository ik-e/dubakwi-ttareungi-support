# VM PostgreSQL·사용자 API·비활성 연결 결과

2026-11-05 KST · R01 · P04/P09/P12/P18/P20. [구조화 결과](summary.json).

## 결과

사용자가 전달한 R04의 PR #25 여섯 항목 조건부 동의를 postgres-deployment v0.2와 원장에 기록하고 CI 후 PR #25를 main0a6f19d에 병합했다. PR #26은 R01 공급/배포 준비 범위 리뷰 후 최신 main과 .env.example 충돌에서 양쪽 설정을 보존했다. 업무 원본은 바꾸지 않았고 CI 후 main895c2bb에 병합했다. 다른 역할의 정식 승인·서비스 전체 통과로 확대하지 않는다.

기존 Edge 웹 SSH와 사용자가 직접 인증한 sudo로 작업했다. 실제 Docker bridge와 alias 충돌·전용 볼륨을 확인하고, n8n SQLite 온라인 백업의 integrity_check=ok와 설정/구성 사본을 확인했다. n8n 전체 볼륨 복원 시험은 아니다. PostgreSQL 고정 이미지와 main Compose/SQL 해시를 확인한 뒤 새 서비스만 추가했다. 비밀은 서버 밖으로 내보내지 않았고 mode700 경로·mode600 파일·각 컨테이너 읽기 UID를 적용했다.

## 실제 확인

| 항목 | 결과 |
| --- | --- |
| PostgreSQL 적용 | 새 서비스 DB와 별도 시험 DB에001~004 적용 |
| 계약/권한 | constraint/function/runtime-role 계약, 시험 DB runtime 거절9건 통과 |
| TCP/SCRAM | n8n 내부망의 owner/app 접속 성공, 잘못된 비밀번호28P01 거절 |
| 복원 | 합성 unknown·Jira ID/key·revision·reprocessing DLQ fixture를 다른 DB에 복원,002/004 재적용, schema/table/function owner·제약·색인·전체 행 일치, 복원 runtime 거절5건 |
| 재시작 | PostgreSQL 컨테이너만 재시작. fixture snapshot과 TCP 보존. 실제 서비스 상태 행0 유지 |
| 사용자 API | 원본 이미지 빌드·내부망 배포. health200, 인증 없음/오류401, 시민/담당200, 미등록404, 본인 가림200, 타인403의8건 통과 |
| 내부 키 | 같은 서버 키로 기존 검색의 disabled 요청200. Header Auth 일치 확인 |
| Credential | dubakwi-postgres 등록. 등록 직전 기존5개 Credential 행의 해시와11개 workflow 행 보존 |
| 복제본 | state/DLQ/main과 handoff/errors 고정 후보를 환경 ID만 연결해4개 반입. Code/SQL/연결선 동일, 모두active=false·activeVersionId=null·등록Webhook0 |
| 최종 상태 | 기존P11/P19 원본 불변, n8n 재시작0, healthz200. DB/API 공개포트0 |

실제 네트워크·Credential ID·workflow ID·이미지 ID와 원시 결과는 제한된 VM manifest와 Git 제외 인계 파일에만 기록했다. 기존 Jira Credential의 이름·종류·Domain을 UI에서 읽기 확인했으며 비밀 필드는 열거나 변경하지 않았다. 실제 Jira API는 호출하지 않았다.

## 최초 실패와 재시험

직접 SSH 경로 타임아웃 뒤 사용자가 지정한 기존 웹 SSH로 접속했다. 처음 Docker 소켓 권한은 거절됐으나 사용자가 sudo 인증을 수행한 뒤 허용 범위를 확인했다. 계정/그룹 권한은 바꾸지 않았다.

초기 Python 명령은 터미널 입력의 줄바꿈 제거로 문법 오류가 났다. 실행 문자열을 이스케이프해 수정했으며 이 실패에서는 변경이 없었다. PostgreSQL TCP 도구는 n8n 패키지 symlink 경로의 모듈 해석 오류를 realpath로 보정해 재시험했다. API는 기능8건 통과 후 이미지 metadata 단계가 실패했으며, BuildKit 캐시의 base provenance로 기록을 보완했다. 첫 실패 상태/log와 재시험은 VM에 별도로 보존했다. SQL/업무 코드를 고쳐 통과한 것은 아니다.

## 후속과 한계

- errors의 DUBAKWI_SCOPE는 기존 n8n 환경에 없다. n8n 재시작·전역 보안 설정 변경 없이 비활성으로만 반입했다. handoff 복제본의 Error Workflow 참조는 오류 복제본에 연결했으며 공용P11/P19는 바꾸지 않았다.
- state/DLQ는 Execute Workflow다. 원래 /webhook/dubakwi-state의404를 배포 실패로 판정하지 않는다. handoff 복제본도 비활성이라 운영Webhook을 열지 않았다.
- R04는 실제 Jira 필드/전환/배정 권한·생성/bind/문맥/종료·case_ref·save 성공을 구현/시험해야 한다. R01의 인프라 준비가 Jira 성공이나 공식WF 판정을 뜻하지 않는다.
- TLS는 같은 VM bridge·무공개포트·SCRAM·합성 데이터의 초기안이다. 인증서/TLS를 배포했다고 기록하지 않는다. 보존기간·RPO/RTO와 운영 복구 정책도 후속이다.
- 실제 n8n Postgres 노드 실행·Error Workflow·R05 공식 회귀, 서버 권한을 포함한 전체 서비스는 미검증이다. n8n 내 pg client의 TCP 검증과 구분한다.

R05 runner 수정은 후속 main에 별도로 병합됐다. 본 실행에서 그 공식 회귀를 대신 수행하지 않았다. 이전 보고서와 증거 해시는 변경하지 않았다.
