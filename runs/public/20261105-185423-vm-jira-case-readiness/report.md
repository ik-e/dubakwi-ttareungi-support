# P18 Jira 종료 준비와 VM case 함수 검증

2026-11-05 KST · R01 · P12/P18 · [구조화 결과](summary.json).

기존 n8n Jira Credential을 참조하는 별도 미게시 helper로 실제 Jira API를 호출했다. Resolution 목록이 비어 있고 Resolved 전환의 Resolution이 필수이며 허용값도 없음을 확인했다. 동일 Credential의 Jira 관리 권한을 확인한 뒤 Resolution 생성 API가 201을 반환했다. 재조회에서 생성된 완료 값이 해당 전환의 허용값에 포함됐다. 기존 시험 이슈는 Pending으로 유지했고 신규 이슈 생성·배정·종료는 수행하지 않았다. 전역 기본값 변경 API나 workflow/scheme 수정 API는 호출하지 않았다. 등록 helper의 POST 노드는 후속 재실행에 대비해 disabled로 바꾸고 미게시 상태를 확인했다. 일반 연동에 관리자 브라우저 로그인은 필요하지 않았다.

VM PostgreSQL에서도 서비스 DB와 다른 새 시험 DB에 검토 대상 60f8886의 001~006을 적용했다. runtime 로그인으로 constraint-contract·function-contract·case-contract·runtime-role-contract가 통과했다. 서비스 DB state_apply 함수 정의 해시는 전후 같았다. 서비스 DB에 005~006을 적용한 것은 아니다. 같은 버전의 [로컬 격리 검증](../20261105-184250-local-case-review/report.md)에서는 추가 동시 요청 및 권한 거절도 확인했다.

검토 시작 시 내보낸 기존 workflow와 종료 시 원본의 nodes·connections·settings·active·versionId를 비교해 보호 대상 다섯 개가 같음을 확인했다. 환경 ID·원시 응답·서버 경로·상세 SQL 로그·화면은 Git 제외 인계 자료에만 둔다. n8n execute --file 최초 시도는 id 필수 안내로 API가 호출되지 않았고, 새 미게시 helper를 id로 실행한 재시험을 별도 보존했다. 서버의 naive 시각이 로컬 KST보다 약 한 시간 빠른 것도 구분했으며 성능 측정에 섞지 않는다.

R04는 기존 시험 이슈로 종료 → save 내부 finish → Jira/DB 최종 재조회를 이어가야 한다. 시험 processing 행이나 DLQ는 외부 효과·원 실행·최신 revision 확인 전에 삭제하거나 임의 완료 처리하지 않는다. 역할별 담당 매핑·알림 body·전체 기한·R05 공식 판정과 검토된 main 기준 서비스 DB/20노드 배포는 남아 있다. 이번 검증을 S1 전체 성공으로 집계하지 않는다.

[Atlassian Resolution API](https://developer.atlassian.com/cloud/jira/platform/rest/v3/api-group-issue-resolutions/)를 API 방식과 관리 권한의 기준으로 확인했다.
