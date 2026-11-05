# 팀 VM 통합 인계와 적용 조건

- 2026-11-05 KST · v0.1 · P04/P09/P12/P18/P20/P22/P29 · R01 취합.
- 상태: 연결 준비와 검토 요청 진행. 실제 VM 배포·Jira·공식 판정은 미완료.
- 책임은 [팀 헌장](../docs/project/TEAM-CHARTER.md), 상태·결정은 [개발 원장](../docs/DEVELOPMENT-PLAN.md), 공개 업무 계약은 [워크플로우 설계](../docs/project/WORKFLOW-DESIGN.md), 저장 명령은 [저장소 설계](../docs/project/STORAGE-DESIGN.md)를 따른다.

## 1 검토 기준과 병합 판단

| 후보 | 고정 검토 버전 | 판단·다음 조건 |
| --- | --- | --- |
| [PR #23](https://github.com/ik-e/dubakwi-ttareungi-support/pull/23) | 365c419, main95479d5 | 저장 경계 수정 병합. 실제 Jira save·VM 완료와 구분 |
| [PR #25](https://github.com/ik-e/dubakwi-ttareungi-support/pull/25) | 1110a7f | R04의 배포 준비본 6항목 검토와 D01 결정·VM 환경 확인 후 적용 판단 |
| [PR #26](https://github.com/ik-e/dubakwi-ttareungi-support/pull/26) | 44a41f8 | 사용자 API·요청 로그 식별자 가림. R02/R03/R05 검토 요청 후 회신 대기 |
| [PR #27](https://github.com/ik-e/dubakwi-ttareungi-support/pull/27) | e273daa | prepare/fail 골격. 실제 Jira·bind·lookup 구현 완료로 병합/보고하지 않음 |
| [PR #28](https://github.com/ik-e/dubakwi-ttareungi-support/pull/28) | ff19178 | 오류 가림·state/DLQ 연결 준비. R02/R05 검토·실제 오류 경로 확인 필요 |
| [PR #16](https://github.com/ik-e/dubakwi-ttareungi-support/pull/16) | dc6eb8e | save 실패 코드/최신 참조 보완. 실제 하위 기능 연결·시간 계약 전 초안 유지 |
| [PR #13](https://github.com/ik-e/dubakwi-ttareungi-support/pull/13) | 61dd421 | 초기화/고장 해제 실패 후 후속 시험 진행 결함 수정 전 보류 |
| [PR #24](https://github.com/ik-e/dubakwi-ttareungi-support/pull/24) | dfcaff2 | 권한 시험 준비·발표 자료. 실제 인가 시험과 PDF 공개 예외 검토를 구분 |

R01은 위 후보의 검토자를 GitHub에 지정했다. 검토 요청 등록은 검토 완료가 아니다. 소유자의 로컬 통과·CI·GitHub 충돌 없음만으로 영향 역할의 확인을 대체하지 않는다. 새 head가 생기면 변경 범위와 증거를 갱신하고 기존 해시는 보존한다.

## 2 VM 접속과 배포 준비

현재 CLI SSH는 설정된 경로와 관측한 내부 경로 모두 TCP 연결 타임아웃이다. 사용자 재접속 안내 후 기존 설정 재시험도 타임아웃이었다. 연결된 Windows SSH 프로세스는 관측되지 않았다. 인증 실패로 판정하거나 비밀번호를 재발급하지 않는다. 사용자 브라우저 접속은 별도 세션일 수 있으며 실제 경로는 미확인이다.

computer-use는 브라우저 URL 확인 실패로 중단됐다. UI 조작을 재시도하거나 브라우저 안전 장벽을 우회하지 않았다. 접속 경로가 확인되면 다음 순서로 재개한다.

1. 기존 n8n·P11/index/search와 Credential 메타데이터, 현재 이미지/망/볼륨·백업 상태를 읽기 확인한다. 운영 P11은 유지한다.
2. 검토된 main 버전·SQL/워크플로우 해시·변경 전 백업을 기록한다. PR #25의 기존 준비본 검토와 D01 결정이 미완료면 DB를 기동하지 않는다.
3. 사용자 API와 PostgreSQL은 각각 독립 Compose 서비스로 적용한다. 기존 n8n Compose 교체·DB 초기화·볼륨 삭제를 섞지 않는다.
4. 사용자 API는 UID10001 실행이다. 저장소 밖 mode600 비밀파일의 소유권을 실제 실행 UID가 읽을 수 있게 준비하고 컨테이너에서 내용 출력 없이 읽기 가능 여부를 확인한다. 비밀파일과 상위 경로를 공개 권한으로 풀지 않는다.
5. 사용자 API의 Python 원본 이미지·빌드된 이미지 ID/digest를 기록한다. 이번 로컬 빌드는 원본 python:3.12.12-slim-bookworm metadata 조회 중 Docker Registry DNS 실패로 중단됐다. 다른 태그로 바꾼 빌드를 통과로 대신하지 않는다.
6. n8n 내부망에서 API health·올바른/잘못된 인증·등록/미등록·본인/타인·가림을 확인한다. PostgreSQL은 runtime TCP/SCRAM 허용·거절·최소 권한·함수·별도 시험 DB 복원을 확인한다. 로컬 trust fixture 결과를 VM 인증 증거로 쓰지 않는다.

## 3 역할별 다음 인계

| 인계 | 필요한 결과 | 관측·완료 조건 |
| --- | --- | --- |
| R04 → R01 | PR #25 버전/경로·망/TLS·역할·migration/upgrade·복원·Credential 6항목 회신 | 항목별 동의/수정 필요/미확인과 이유. D01 결정과 VM 실측은 별도 |
| R04 → R02/R01 | 실제 Jira 필드·종료 전환·담당 권한 및 생성/직후 bind·문맥 저장/종료 구현 | Credential만 연결한 상태와 구분. 현재 H15는 prepare 뒤 tickets_down fail로 진행하며 Jira HTTP/bind 호출이 없음 |
| R01 → R02/R04 | 실제 network·PostgreSQL Credential·내부 Header Auth·workflow/Error Workflow 연결 정보 | VM에서 확인한 값을 비공개 manifest로 전달. 공개 보고서에는 확인 여부·버전만 기록 |
| R02 → R01/R05 | B04 팀 API 주소/Header Auth, state/handoff/DLQ 실제 연결 | dc6eb8e의 B04는 과정 data-api 유지. state_revision/revision·Jira 내부ID/key 변환, 시민 ticket_id는 실제 Jira key |
| R03/R04/R05 → R01 | 지식 승인과 서버 사용자→B05→RAG 권한 시험 | 시민 restricted/canary 노출0, 담당자 양성 검색, 미등록/조회 장애 시 검색 미실행 |
| R05 → R01 | runner 사전 초기화·고장 해제 실패 중단 보완 | 실패 후 다음 업무 요청0, 최초 실패와 재시험 증거 분리 |

이 문서의 표는 기존 소유권을 변경하거나 R01에게 기능 대리 편집 권한을 부여하지 않는다. R04/R02 원본은 해당 소유자가 수정한다.

## 4 S1과 후속 시험 게이트

최초 목표는 같은 request_id로 사용자 확인→분류/허용 검색→답변/검증→Jira 생성/직후 bind→문맥 저장/종료→최종 저장→응답을 추적하는 것이다. Jira key·종료 전환 확인·가린 최종 응답·저장 completed를 같은 증거 묶음에 연결한다. 실제 Jira 갱신 없는 state.save 안전 실패를 정상 완료로 판정하지 않는다.

S1 기능 시험 후 완성본에 입력 거절/주입의 LLM·티켓 호출0, 본인/타인, public/restricted, 중복/동시, 생성 응답 유실·bind/finish 실패·DLQ·복원 회귀를 수행한다. 원 실행과 외부 효과가 미확인이면 전체 재실행하지 않는다.

기존 P19 부분 probe10.228초는 WF-11 6초 통과가 아니다. R02/R05가 노드별 시간·재시도와 전체 deadline을 실제 측정하고 결과를 기록한다. Discord는 D07·공통 흐름 통과 후 연결하며 기존 범위에서 임의 제외하지 않는다.

## 5 발표와 일정

헌장 기준 2026-11-06 8교시 발표 후 기능 동결, 개발 계획 기준 2026-11-09 14:50 제출이다. 발표자 F는 아직 미정이며 R01로 자동 지정하지 않는다. [발표 인계 초안](../docs/project/presentation/integration-brief.md)의 근거/미실행 표시를 사용하고, 실제 인원 합의·리허설 뒤 헌장과 P29를 갱신한다.

이번 원장·데일리·발표 초안은 문서 작성 증거다. 서비스 완료·R05 공식 판정·데일리 발표 피드백 수신을 대신하지 않는다.
