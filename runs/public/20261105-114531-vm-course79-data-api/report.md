# GitLab79 도구 재사용과 data-api 연결

- 실행일: 2026-11-05 KST. R01 P04/P09/P13. 팀 P11 main0e44fdb 유지.
- 제공 원본: GitLab aio-01d4-stu 고정커밋eb6937f, Last3Mon/79/data-api와 tools/flow.py.
- 80/data-api 경로 미제공을 전체 재사용 원본 부재로 확대했던 판단을 정정한다. 79일차에 실제 실행 가능한 서버와 과정 도구가 있었고 이를 검토·배포했다. 과거 관측/해시는 보존한다.

## 적용과 실제 결과

| 항목 | 확인 |
| --- | --- |
| 원본 확보 | data-api24파일과 flow.py1파일. Git blob/해시 확인, 서버·데이터·도구 미수정 |
| VM 배포 | 원본 Compose 보존, VM용 설정만 이미지 다이제스트 고정·기존망 별칭data-api·호스트loopback8800·읽기전용 마운트·healthcheck로 파생 |
| 상태 | 컨테이너healthy, 호스트health ok, n8n→data-api200, 모의 직원6명 |
| 실제 P11 시험 | LN01~LN11을 내부/HTTPS에서 각각 실행,22/22 통과 |
| 메타 로그 | 예상18건 모두 API에 저장, 신규18실행의B35 stored=1·오류0 |
| 사용자 조회 | B04 실행12건, 정상 M01 mock8건. 프로젝트 시민/직원 fixture 연동과 구분 |
| 기존 RAG | 검색ok·rental-guide 근거, n8n200. n8n 재시작 없음 |

이전 B35 타임아웃은 이번 실행에서 해소됐다. 최초 실패6건·후속 실패 기록을 덮어쓰지 않는다. 현재 API는 수업용 메모리 서비스이며 Jira나 영속 상태/DLQ 성공을 뜻하지 않는다. 직원{name,dept}는 현재 P11 B05에서 최소권한 citizen/public으로 정규화된다. R04의 시민/지원/보안 fixture와 records 연결은 후속이다.

## 원본 flow.py 사용 결과

- ops: exit0, fault all ok, live logs18 확인. reset 없이 읽기 조회했다.
- doctor: data-api·n8n 연결은 통과, 전체exit1. 수업 OpenAI Credential ID openAiCourse0001 검사1건이 남았다. 사용자가 등록한 프로젝트 Credential을 유지했다.
- check P11 source: exit1·오류1. 원본 검사는 수업 OpenAI ID만 허용해 팀 Header Auth 참조를 거절한다. 잘못된 ID를 붙이거나 인증을 해제해 통과시키지 않았다.
- push는 기존 n8n 재시작을 포함하고 검사 제한이 있어 실행하지 않았다. call/test의 원본HTTP 함수는 팀 인증 헤더 인자가 없어 현재 팀 endpoint 시험에 쓰지 않았다. 원본 도구를 몰래 수정하지 않고 Header Auth를 지원하는 기존 P11 시험 도구로 실제22건을 검증했다. 고장/초기화/LLM키 변경은 수행하지 않았다.

## 재현과 후속

VM 운영 배포 묶음의 course-source/Last3Mon/79에 고정 원본과 source-manifest.json, 상위 compose.vm.json과 이미지 다이제스트/마운트/네트워크 매니페스트를 보존했다. 새 서비스만 해당 Compose의data-api로 관리하며 기존 n8n Compose를 교체하지 않는다. 8800은 외부 전체 인터페이스에 공개하지 않았다. 소스/비밀·서버/환경 식별자는 Git에 넣지 않는다.

다음은 R04 팀 사용자/소유권 fixture와 실제 Jira/저장 연동, R02 P19 실제 모듈 연결, R05 공식 사례 판정이다. 원본 과정 도구의 ID/인증 제한은 해당 검사 호환 검토 대상으로 남긴다. R02 제공 자료 목록·R04 상세와 R05 기대값에는 이번 원본/실행 증거를 역할별로 반영해야 한다. [가린 상세 결과](summary.json)를 참조한다.
