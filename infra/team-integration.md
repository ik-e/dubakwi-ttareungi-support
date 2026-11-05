# 팀 VM 통합 인계와 적용 조건

- 2026-11-05 22:58 KST · v0.2 · P04/P09/P12/P18/P20/P22/P29 · R01 취합.
- 상태: VM 부분 적용·Jira 하위 기능 시험 진행. 전체 S1·R05 공식 판정은 미완료.
- 책임은 [팀 헌장](../docs/project/TEAM-CHARTER.md), 상태·결정은 [개발 원장](../docs/DEVELOPMENT-PLAN.md), 공개 업무 계약은 [워크플로우 설계](../docs/project/WORKFLOW-DESIGN.md), 저장 명령은 [저장소 설계](../docs/project/STORAGE-DESIGN.md)를 따른다.

## 현재 적용·검토 기준 — 2026-11-05 22:58 KST

P04/P12/P18/P19/P20의 영향 경로는 이 인계·공통 원장·시스템 개요·발표 인계다. R01이 취합하며 기능 소유권은 헌장을 따른다. 선행은 병합된 main과 각 소유자의 PR 증거다. 이번 작업은 GitHub·저장소 기록 재확인과 문서 정리이며 VM에서 새로 실행한 시험은 없다. 아래 기준이 뒤의 최초 인계 시점 설명보다 우선한다.

| 구분 | 고정 버전·근거 | 확인 범위와 남은 조건 |
| --- | --- | --- |
| 병합 기준 | main `9086cff4bee7fa42fe6f479ec70a5c653e4dfe75` | #13·#25·#26·#30 병합됨. 사용자 API·SQL001~004 준비 원본과 시험 도구 포함. main 해시를 현재 VM 전체 배포 해시로 간주하지 않음 |
| 운영 입구·검색 | main의 [P11/data-api 기록](../runs/public/20261105-114531-vm-course79-data-api/report.md)·[RAG 부분 기록](../runs/public/20261105-111311-vm-rag-integration/report.md) | P11 게시·과정 data-api/B35 연결·수동44청크 검색 확인. P19 운영 전환·PostgreSQL 벡터 검색·완성본 사용자 인가는 미확인 |
| VM 사용자 API·PostgreSQL | [#32 6fe8532](https://github.com/ik-e/dubakwi-ttareungi-support/tree/6fe853204394a4001baacc0630df2d248685f957) | 실제 배포·인증/권한·별도 DB 복원/재시작 기록. 기록 PR 검토 대기이며 현재 VM을 새로 조회한 결과와 구분 |
| 시민 공급·state 연결 | [#33 403ee43](https://github.com/ik-e/dubakwi-ttareungi-support/tree/403ee43270a641c8a8001262467c379eb300012d)·[#34 53f7c59](https://github.com/ik-e/dubakwi-ttareungi-support/tree/53f7c591fa4684bb519265cc54c8f3d833b9a912) | 시민 호환 공급·실제 Postgres 읽기·처리권 없는 fail의 skipped 확인. 전체 업무 성공은 아님 |
| Jira·저장 하위 기능 | [#27 168c79c](https://github.com/ik-e/dubakwi-ttareungi-support/tree/168c79c160d847115aa00f01e30107a2ebcb617c)·[실제 실행 보고](https://github.com/ik-e/dubakwi-ttareungi-support/blob/168c79c160d847115aa00f01e30107a2ebcb617c/runs/public/20261105-192700-team-n8n-r04-jira-close/report.md) | 생성/bind·종료·save 내부 finish·최종 Jira/DB 재조회 확인. label 충돌/재사용의 문의·소유권 검증 결함으로 변경 요청 유지. 담당 매핑 성공·Webhook 종단은 미실행 |
| case 함수·독립 확인 | [#35 7b1456c](https://github.com/ik-e/dubakwi-ttareungi-support/tree/7b1456c81bae073365882b6e99381b8fba9acc13)·[최신 결함 재현](https://github.com/ik-e/dubakwi-ttareungi-support/blob/7b1456c81bae073365882b6e99381b8fba9acc13/runs/public/20261105-194913-local-p27-168c79c-review/report.md) | 005~006은 격리 DB에서 검증. 서비스 DB 미적용 유지. 기존 Jira/DB 최종 상태를 독립 읽기로 확인했지만 실제 P19 S1을 대신하지 않음 |
| P19 연결 후보 | [#16 6afb94d](https://github.com/ik-e/dubakwi-ttareungi-support/tree/6afb94d7c79a948312cd3c415d15284d202bdee9) | 연결 시험 고정값: support `5e0026c`, R04 하위 기능 `168c79c`/errors `ff19178`. B15 2.5초·B27 15초, H04 1.5초 1회. 전체 WF-11 시간 통과 아님. 보완 한도 후 새 요청의 반복 배정·알림, 답변 검증·실제 S1 남음. 초안 유지 |
| 오류·DLQ | [#28 ff19178](https://github.com/ik-e/dubakwi-ttareungi-support/tree/ff1917860e8a43379301a59a0b751be7cd613083) | E05 하위 실행 throw 후 DLQ 지속/원 문맥 보존 필요. 운영 알림 backend 미구현을 구분. 변경 요청 유지 |
| 지식·권한/발표 | #31 `06e9223`·#24 `dfcaff2` | 역할 검토 대기. 오프라인 비교를 VM 적용/서버 인가로 표시하지 않음. PDF 시각·권리 검토는 이번 작업 미실행 |

보완 횟수 저장·H04 재시도 제거·부모 조회 제한 조정·S13/S19 Credential 참조·매핑 미설정 시 안전 실패는 #27 후속에서 반영됐다. 이미 수정된 항목을 미수정으로 재요청하지 않는다. 반면 `req.a`와 `req/a`의 label 충돌과 검색 첫 결과의 case/owner 확인 누락은 최신 168c79c에서도 재현됐다.

### R01 기록 PR의 취합 방식

#29는 버전·진행·인계의 통합 색인이다. #32 배포, #33 시민 공급, #34 state 연결, #35 case/Jira 확인은 서로 다른 시점의 증거를 보존하는 별도 기록 PR이다. 원본을 복사하거나 과거 해시를 고치지 않는다. #29 병합이 이 네 PR의 승인·병합을 뜻하지 않으며, 각 PR의 영향 검토를 취합한 뒤 중복 문서 변경과 base를 다시 확인한다. 기능 #27/#28의 차단 사유와 기록 PR의 사실 확인을 구분한다.

### 다음 적용·시험 체크리스트

1. R04가 #27의 원 ID/scope 식별·case/owner 확인·다중 검색 안전 실패를 보완하고, 생성/조회/save 계약을 일치시킨다. #28은 state throw 후 원 문맥으로 DLQ가 실행되는 실패 시험을 제공한다. R02·R05 영향 검토 결과를 취합한다.
2. 적용 직전에 R01이 현재 VM 이미지 digest·Compose/설정 버전·워크플로우 JSON 해시/게시 여부·SQL 적용 목록·Credential 연결 여부를 비공개 manifest에 기록한다. 현재 저장소 해시만으로 VM 버전을 채우지 않는다. 비밀값·서버/계정 ID는 공개 기록에서 제외한다.
3. 변경 전 백업과 별도 복원 가능 여부를 확인하고, R04의 migration/권한/복구 절차와 R05 확인 조건을 고정한다. 005~006은 위 차단 해소·검토 전 서비스 DB에 적용하지 않는다. 기존 P11을 유지한다.
4. 검토된 main에서만 적용한다. 외부 효과/처리권 미확인, 저장 게이트 실패, 식별 불일치가 보이면 후속 쓰기·전체 재실행을 멈추고 known ID와 확인 필요를 보존한다. 일반 복구에 DB 초기화·볼륨 삭제를 포함하지 않는다.
5. R02/R04/R05가 같은 request_id의 사용자→허용 검색→답변 검증→Jira 생성/bind→종료→finish→최종 응답을 연결한다. 종료 상태·Resolution·저장 completed/replay까지 같은 묶음에 남긴 뒤 S1을 판단한다.
6. 기능 확인 후 권한/타인·중복/동시·보완 한도 이후 새 요청·생성 응답 유실·bind/finish 실패·DLQ·재시작/복원과 전체 시간 회귀를 수행한다. 최초 실패와 재시험은 별도 보존한다. Discord/D07과 공식 판정은 실제 시험 전 완료로 표기하지 않는다.

## 최초 인계 기록 — 아래 상태는 작성 당시 기준

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


## 2026-11-05 후속 실행과 이번 PR 검토 경계

이 문서의 최초 SSH·이미지 조회 실패와 미배포 상태는 당시 관측이다. 후속 실행 기록은 PR #32(PostgreSQL/사용자 API 배포), #33(시민 호환 공급), #34(실제 Postgres 읽기·무소유 fail), #35(case 함수 격리 DB·Jira 종료 준비)에 보존됐다. 후속 보고를 최초 실패 기록에 덮어쓰지 않는다. 각 PR의 영향 검토와 실제 적용 버전을 확인해야 하며 Jira 종료·save·S1 전체 성공은 아직 미확인이다.

R01은 PR #27 60f8886, #28 ff19178, #31 06e9223, #24 dfcaff2를 로컬에서 재검증했다. 공통 회귀는 각각 78/46/53/46건 중 HTTP7건을 생략하고 나머지 71/39/46/39건 통과, Ruff check/format·문서/공개 후보·diff 검사는 통과했다. 실제 VM·HTTP·LLM·Jira 재실행은 하지 않았다. #24 PDF 내용의 시각/권리 검토는 이번 검사에 포함하지 않았다.

#27은 서로 다른 request_id의 정제된 Jira label 충돌(req.a와 req/a), 역할 매핑 없이 첫 활성 계정 배정을 Code에서 재현했다. R02도 팀 채팅 18:49 답변에서 case_ref 보완 횟수 누락·조회 호출 시간과 부모 제한 충돌을 수정 요청했다. #28의 E05에는 실행 오류 지속 설정이 없어 state 하위 실행이 throw하면 DLQ가 호출되지 않을 수 있으며 설계의 실패 후 기록 지속 조건과 다르다. 각 소유자가 수정하고 관련 회귀를 추가해야 한다.

팀 채팅의 구현 보고·수정 요청·후속 시험 계획을 병합 승인으로 확대하지 않는다. 현재 열린 기록 PR의 R04/R05 영향 검토, #24/#31의 관련 역할 검토를 취합하기 전 병합하지 않는다. #16은 실제 저장/Jira와 답변·시간 계약 검증 전 초안을 유지한다.

검토 중 #27에 6d05ced가 추가돼 역할 매핑 미설정 시 assignee_unmapped로 외부 배정을 막는 수정과 회귀를 확인했다. 앞의 첫 계정 배정 재현은 60f8886 시점 결과이며 최신 코드에서 동일 결함이 남았다는 뜻이 아니다. correlation label 충돌과 R02 보완 횟수/시간 요청은 별도 재검토 대상이다.

### v0.2 변경 기록

2026-11-05 22:58 KST: 최신 main/후보/VM 증거 기준, #32~#35 취합 방식, 수정 완료/잔여 결함과 적용·중단·복구·시험 체크리스트를 추가했다. 아래 과거 기록의 Jira 미확인·미배포·검토 대기는 해당 시점의 상태이며 현황은 상단 표를 따른다.
