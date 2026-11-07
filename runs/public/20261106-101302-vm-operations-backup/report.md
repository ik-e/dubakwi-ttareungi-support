# VM 운영 점검·새 백업·별도 DB 복원 검증

2026-11-06 KST · R01 · P04. [상세 결과](summary.json).

## 완료한 실제 작업

기존 웹 SSH로 VM 자원·서비스·DB 상태를 확인했다. 루트 디스크24% 사용/44GB 여유, 가용메모리 약1557MB, n8n health200, PostgreSQL/팀 사용자API/과정API healthy였다. 팀API health200·무인증 사용자조회401, DB/API host공개포트0을 확인했다. owner/runtime/app의 superuser·createdb·createrole·bypassrls는 모두false다.

서버의 새 권한700 디렉터리에 서비스DB custom dump, n8n SQLite 온라인백업과 config를 파일권한600으로 저장했다. archive목록검사·SQLite integrity_check=ok·SHA-256 재대조가 통과했고 이미지/파일정보는 비공개 manifest에 보존했다. 같은디스크 백업이며 외부장애 대비 별도사본을 만들었다고 주장하지 않는다.

존재하지 않는 별도복원DB를 확인 후 owner로 생성하고 PUBLIC접근을 제한했다. no-owner/no-acl·single-transaction으로 복원하고 main002/004와 같은 schema/table/function 권한을 복원DB에만 재적용했다. 요청/ DLQ 데이터의 정렬된행 해시가 원본과 일치했다. runtime SELECT/INSERT/UPDATE·함수EXECUTE 허용과 DELETE/TRUNCATE 거절을 권한조회로 확인했고 SET ROLE 후 실제DELETE는 permission denied였다. 이번 검증은 실제runtime 비밀번호/TCP로그인 시험을 대신하지 않는다. 별도DB는 확인용으로 남겼다.

## 보존·중단 조건

원본DB에는 completed3·processing2·pending DLQ2가 있었다. 자동재처리·삭제·완료처리하지 않았다. 서비스DB의 전후 데이터해시와 n8n 전체workflow/Credential행 해시가 불변이었고 workflow는inactive45/active2, 최종health200·서비스healthy였다. 재시작·운영workflow변경·서비스마이그레이션·Jira호출은0이다.

case함수는 서비스DB에 없으며 DUBAKWI_SCOPE도 미주입이다. SQL005~007/최신workflow 적용·S1·errors실행은 이 작업의 완료범위가 아니다. n8n전체볼륨 복원·off-host사본·보존기간정책·기존processing/DLQ 원실행/외부효과 확인은 후속이다.

## 실패와 재시험

첫 Python 실행은 웹터미널이 줄바꿈을 제거해 SyntaxError로 종료했고 실행 전 파싱 실패라 변경은 없었다. 한줄 이스케이프 실행으로 수정한 후 백업·별도복원·전후보존 검사가 통과했다. 비밀·실제ID·원시로그·백업파일은 서버/ Git제외 인계에만 보존한다.
