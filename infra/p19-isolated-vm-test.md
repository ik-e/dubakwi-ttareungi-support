# P19 격리 VM 시험 인계와 R01 배포 준비

- 버전: v0.1 / 2026-11-05 KST / R01 준비, R02 사본 인계 대기.
- 작업: P04/P19. 업무 JSON 소유 R02, 배포/환경 연결 R01, 기대값/공식 판정 R05. 실제 저장/Jira 계약은 R04 소유다.
- 기준: main `eb37e0f9ca4c348fe43c2b8a469db4df23992e92`, PR #16 `329778c0de476bc950ad2da866833ce5244f4b07`.
- 이 문서는 후속 실행 절차다. 이번 준비에서는 새 VM 접속·반입·Credential 변경·게시·시험을 하지 않았다.

## 1 현재 확인 범위

[data-api 실행 기록](../runs/public/20261105-114531-vm-course79-data-api/report.md)은 수업용 직원 조회·로그 연결과 P11 22/22, 로그18/18을 확인했다. [P19 부분 연결 기록](../runs/public/20261105-121200-vm-p19-connection/report.md)은 원본 B14 검색과 L01~L03을 fixture 문맥으로 시험했다. 내부 검색 주소는 `http://127.0.0.1:5678/webhook/dubakwi-search`로 실제200/ok였다. 해당 시험 사본은 종료 후 비활성화했다. 이 결과를 B07을 포함한 전체 흐름 성공으로 확대하지 않는다.

새 시험은 B04 실제 수업용 사용자 조회 → mock B07 → 실제 분류·검색·작성·검증 → mock handoff/저장/실패 처리의 연결을 확인한다. 실제 state/DLQ/Jira 성공·전체 공식 판정·보완/동시성 보장으로 기록하지 않는다. 팀 사용자 fixture와 수업 직원은 다르며 본 시험의 citizen/public 권한은 B05 실제 출력에서 확인한다.

## 2 R02 패키지 반입 조건

R02가 소유 개발본에서 내보낸 support·mock state·mock handoff·mock dlq JSON, 기준 커밋/해시, 모든 참조의 ID·경로 대응표, 시험 입력·기대값을 받아 하나의 버전으로 고정한다. 업무 Code나 mock 응답 계약의 수정은 R02가 수행한다. 미전달 상태에서는 기존 로컬 mock을 대체 반입하지 않는다.

| 검사 | 반입 조건 |
| --- | --- |
| support | `/webhook/dubakwi-support-p19`, 별도 workflow ID/name/webhookId. P11 운영 경로와 기존 p19-staged/connection-probe와도 실제 VM 목록 대조 |
| mock state | 사본 전용 ID. B07/B37/B32/X06 등 모든 Execute Sub-workflow 참조를 동일 ID로 연결. 실제 `dubakwiState01` 참조0 |
| mock DLQ | 사본 전용 ID. X03 등 모든 참조 연결. 실제 `dubakwiDlq0001` 참조0 |
| mock handoff | 사본 전용 ID·`dubakwi-p19-mock-handoff` 같은 별도 경로·고유 webhookId. B15/B27 모두 해당 경로. 실제 `dubakwi-handoff` 호출0 |
| handoff 인증 | Webhook 수신 Header Auth·내부 키 연결. 무인증 또는 잘못된 키403을 확인하기 전 정상 시험 진행 금지 |
| 실제 검색 | B14만 기존 `/webhook/dubakwi-search`와 내부 키 사용. mock-search로 교체하지 않음 |
| Code/HTTP/설정 | Jira·DB·실제 R04 호출·동적 외부 대상·Error Workflow 참조를 모두 검토. mock Code와 임베디드 URL까지 포함 |
| 부수 호출 | B35 `/logs`, X04 `/alerts`의 실제 data-api 호출 여부를 대응표에 명시. 오류 시험의 알림도 모의 API 효과로 기록하고 실제 담당 알림 성공으로 표현하지 않음 |
| 원본/데이터 | pinData·실제 개인정보·키 값·기존 환경 Credential ID 유입 검사. 모의 입력만 사용. 원본/배포 사본 해시를 구분 |

기존 PR #16 로컬 mock은 state/DLQ가 실제 R04 ID와 같고 handoff가 실제 경로를 사용하며 인증이 없다. 이 세 파일은 위 조건을 충족하지 않는다. 이름에 mock이 있어도 격리됐다고 간주하지 않는다.

## 3 R01 Credential·반입 순서

1. 패키지 수령 후 현재 VM의 workflow ID/name·Webhook path·게시 버전·Credential 참조를 읽어 충돌 여부를 확인한다. 기존 P11/index/search와 Credential 상태를 비교할 기준을 비공개 매니페스트에 기록한다.
2. 기존 절차의 온라인 SQLite 백업과 config/설정 사본을 만들고 integrity/checksum을 확인한다. 복원 실험을 하지 않았다면 복원 검증 완료로 쓰지 않는다. n8n 재시작·기존 볼륨/Compose 변경은 이 시험에 포함하지 않는다.
3. 업무 JSON은 보존하고 배포 사본에만 환경 ID/versionId/webhookId·명시적 Credential ID를 연결한다. 기존 키와 Credential을 재생성하지 않는다. 비밀/실제 ID와 결합된 파일은 VM 제한 경로에 둔다.
4. 모든 워크플로우를 비활성으로 가져와 DB 또는 UI의 실제 저장본을 원본·승인된 환경 치환 내역과 대조한다. 기존 ID에 덮어쓴 경우 시험을 중단한다.
5. Execute Sub-workflow 호출 가능한 버전과 입력 passthrough를 확인한 뒤 mock handoff → support 순서로 시험용 HTTP 경로를 게시한다. state/DLQ의 게시 필요 여부는 설치된 n8n 동작으로 확인한다.

| 노드 | Credential 종류 | 환경에서 명시적으로 연결할 기존 항목 |
| --- | --- | --- |
| support B01 | httpHeaderAuth | dubakwi-team-key / X-Team-Key |
| support B14/B15/B27 | httpHeaderAuth | dubakwi-internal-key / X-Internal-Key |
| mock handoff Webhook | httpHeaderAuth | dubakwi-internal-key / X-Internal-Key |
| support L01/L02/L03 | openAiApi | dubakwi-openai |

위 이름은 선택 기준이다. 실제 ID와 Credential 유형·헤더를 조회해 연결하고 반입본에서 재확인한다. `openAiCourse0001`을 VM ID로 가정하거나 Header Auth 이름만으로 자동 선택하지 않는다.

## 4 시험과 증거

R02 입력/기대값과 R05 판정을 대조한 뒤 다음 최소 연결 시험을 수행한다. 초기화·고장 주입·tickets-reset 같은 운영 데이터 변경 hook은 실행하지 않는다. 사본에 고유 request_id 접두사를 사용하고 수업 모의 사용자 ID는 VM에서 읽어 선택한다.

| 사례 ID | 확인 |
| --- | --- |
| P19-ISO-AUTH-01 | support 키 없음/틀림403, B04·LLM·하위 기능 미실행 |
| P19-ISO-MOCK-AUTH-01 | mock handoff 내부 키 없음/틀림403 |
| P19-ISO-USER-01 | 미등록 모의 사용자400 unknown_user, B07·LLM 미실행 |
| P19-ISO-QR-01 | 등록 수업 사용자 B04/B05 통과, mock B07 실행, 실제 B14 200/ok·공개 근거, L01~L03 실행, mock B27/B32와 최종 응답 |
| P19-ISO-CLEANUP-01 | 종료 후 support/mock HTTP 경로404와 모든 시험 사본 비활성. 기존 P11/index/search 내용·게시 버전·Credential 보존 |

정상 입력이 deadline·분류·검증에 의해 다른 분기로 흐르면 최초 결과와 실제 노드 경로를 보존한다. 기대 노드를 실행하지 않았는데 HTTP200만으로 통과 처리하지 않는다. 수정은 소유자에게 근거와 기대 결과를 전달하고 새 버전으로 재시험한다.

실제 모델/검색·사용자 조회와 mock state/handoff/DLQ의 판정을 별도 기록한다. mock이 반환한 confirmed/state_saved/티켓 ID는 합성값이다. 전체 소요시간은 이번 사본의 측정값으로 남기며 WF-11 6초 통과로 확대하지 않는다. 오류 경로 시험은 R02의 고장 설정/해제 방법이 전달된 뒤 별도 실행한다.

## 5 종료와 후속

성공/실패와 무관하게 시험 support·mock Webhook을 unpublish하고 실행 종료·HTTP404·하위 사본 비활성을 확인한다. 기존 P11/index/search의 내용/게시 버전과 Credential 전후 일치, health를 확인한다. 삭제 대신 비활성 상태로 사본/실패 증거를 보존한다. n8n 재시작으로 메모리 RAG를 지우지 않는다.

실행 시점 KST 실행묶음의 `runs/public/`에 날짜·환경·원본/설정 버전·사례별 결과·실행 노드·미실행·가린 상세 참조를 남긴다. 원시 요청/답변/키/실제 환경 ID는 Git 제외 경로에 보존한다. 개발 원장의 P19는 실제 R04 저장·Jira·전체 시험 완료 전까지 진행을 유지한다.

## 6 변경 기록

| 날짜 | 버전 | 내용 |
| --- | --- | --- |
| 2026-11-05 | v0.1 | R02 격리 패키지 인계 대기, 기존 mock 충돌·인증 미설정 확인, R01 Credential/반입·최소 시험·종료 기준 준비 |
