# P09/P13 VM 시민 호환 데이터 공급

- 실행일: 2026-11-05 KST. R01, Edge의 r05tester 웹 SSH와 사용자 인증 후 sudo 사용.
- 기준: 저장소 main `9086cff`, 병합된 PR #17 STORAGE-DESIGN 2.1. 설정 버전 `20261105-164023-vm-p13-citizens`.
- 운영 P11의 기존 게시 버전을 유지했다. 기록된 원본은 `0e44fdb`이며 이번 작업에서 다시 게시하지 않았다.

## 변경과 보존

변경 전 employees.json을 Git 밖 VM 접근 제한 백업에 복사하고 SHA-256 일치를 확인했다. 기존6명 배열을 그대로 보존하고 citizen-a/b/c를 각각 name·dept=시민 형식으로 추가해9명이 됐다. support/security·unregistered-zz는 추가하지 않았다. 변경 대상은 VM 배포 데이터 사본이며 서버 Python과 저장소 사용자 fixture는 수정하지 않았다. 데이터 디렉터리의 컨테이너 읽기 전용 마운트도 유지했다.

서버가 요청마다 파일을 읽으므로 n8n/data-api 재시작이나 Compose 변경이 필요하지 않았다. 전후 workflow/credential 행 해시와 컨테이너 시작 시각이 같고 기존 로그707건이 보존됐음을 확인했다. 외부 공개 포트·인증·권한 설정은 변경하지 않았다.

## 실제 확인

| 확인 | 결과 |
| --- | --- |
| n8n 내부 citizen-a/b/c 조회 | 각각200, 요청 이름 일치·dept=시민 |
| n8n 내부 unregistered-zz 조회 | 404 |
| citizen-a P11 확인 요청 | 200, reason=skeleton_mock, ticket=null, sources=[] |
| 실행166 | success, B04·B05·M01·B35·B36 실행 확인 |
| 메타 로그 | 같은request_id 기록, route/status 일치, 질문 원문 미포함 |
| n8n healthz | 200 |

최초 sudo 실행은 인증 필요로 스크립트가 실행되지 않았다. 사용자가 sudo 인증한 뒤 적용했다. 적용 후 첫 검증 명령은 실행묶음 시각을 잘못 적어 파일 조회에서 중단됐고 HTTP 전송 전이었다. 실제 경로를 확인해 고친 다음 위 검증을 수행했다. 최초 실패를 서비스 실패로 세지 않는다.

## R05 인계

P11-01의 시민 미등록 선행 막힘은 해소됐다. R05는 최신 병합 도구와 사례를 사용해 새 실행묶음으로 공식 P11-01을 수행하고, n8n 실행 경로와 로그를 확인한다. `--workflow-version 0e44fdb --config-version 20261105-164023-vm-p13-citizens`로 배포/설정 근거를 구분한다. 실행 직전에 운영 대상이 여전히 P11인지 확인하고 P19로 변경됐다면 골격 전용 기대값을 사용하지 않는다.

이번 실행166은 R01의 연결 확인이며 R05 공식 판정을 대신하지 않는다. 실제 접수·티켓 생성/이관·Jira/state/DLQ/Discord 성공이나 전체 회귀 완료를 의미하지 않는다. 별도 팀 형식 user-api와 담당자 restricted 공급은 이번 변경 범위 밖이다. [가린 요약](summary.json)을 참조한다. 백업·원시 결과·환경 경로는 VM 제한 묶음에 보존했다.
