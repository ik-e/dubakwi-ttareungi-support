# P18 실제 생성·재사용·save 검증과 P19 반입 준비

2026-11-06 KST · R01 · [구조화 결과](summary.json). 실제 환경 ID·시험 식별자·원시 응답·화면·백업 경로는 Git 제외 자료에 둔다.

기존 n8n main runtime의 비활성 handoff45/state11/DLQ5 노드 Code/SQL을1b83d18과 대조했고, 대상의 다른 실행이 없음을 확인했다. R04 원본을 수정하지 않고 R01 전용 수동 helper로 테스트 Webhook을 호출했다. 실행240은 실제 Header Auth HTTP200을 거쳐 Jira 시험 이슈1개를 생성하고 prepare/bind revision2를 저장했다. 실행245는 반환된 known key로 같은 이슈를 재사용하고 문맥·revision4를 확인했다. label 검색 지연 시 두 번째 이슈를 만들지 않도록 생성 재시도는 하지 않았다.

실행245 후반 R01 helper의 Save request 표현식이 invalid syntax로 실패했다. 원본 업무 코드와 구분하고 첫 실패를 보존했다. 알려진 Jira ID·최신StateRef를 사용한 저장 전용 실행249는 외부 쓰기를 반복하지 않고 save 내부finish로 revision5 completed·가린 응답 저장을 확인했다. 같은 begin은 replay로 저장 응답을 반환했다. Jira는 추가정보 대기용 열린 상태·Resolution 없음이며 문의 종료를 뜻하지 않는다. 별도 GET에서 새 해시label과 검색결과1건을 확인했고 scope행1·DLQ0을 확인했다.

미인증 POST는403으로 거절됐으며 일시 테스트 수신을 닫은 후404를 확인했다. 기존 모든scope의state/DLQ 해시와 보호 workflow5개의nodes/connections/settings/active/versionId는 같았다. 수동/읽기 helper4개는 미게시이고 마지막 대상 진행 실행은0이다. 서비스 DB custom 백업을 저장소 밖에 생성해 SHA256·archive 목록을 확인했지만 이번에 복원하지는 않았다. 005~006 서비스 적용이나 공용P11/P19 변경은 없다.

R02 원본6a963c6에서1b83d18 의존성과 실제 Credential ID를 연결한 P19 사본/manifest를 Git 제외로 준비했다. VM 반입·게시·LLM 호출은 하지 않았다. Windows 기본 인코딩 실패, 식별자 판독 오류는 서비스 반입 전에 탐지하고 UTF-8/ID byte 대조로 수정했다. 원본CRLF 사본을 보존하고 LF로 포장해 producer manifest와 실제바이트 hash가 일치함을 확인했다. R02 업무 원본은 바꾸지 않았다. errors의 미해결 문제를 정상 연결로 오인하지 않도록 Error Workflow는 붙이지 않았다.

R01 기술 검토는 기존 식별 충돌 수정과 제한 실연동에 대한 것이다. R02/R05 검토를 승인으로 간주하지 않으며, 결과 취합 뒤 검토된 main에서 서비스005~006/대응 full state 배포를 진행한다. PR28의 state throw 뒤 DLQ 중단·운영 알림/scope, D06 실제 담당 매핑, 전체시간·case_ref 왕복·권한·Discord·공식 회귀는 남아 있다. 본체의 분류/RAG/LLM/최종 채널까지 통과한 S1로 기록하지 않는다.
