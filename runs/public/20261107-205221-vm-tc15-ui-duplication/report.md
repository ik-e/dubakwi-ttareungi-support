# TC-15 VM UI 복제 경로 확인

- 실행 시각: 2026-11-07 20:52 KST
- 환경: Edge를 통한 팀 VM n8n UI
- 목적: 로컬 JSON 다운로드/업로드 없이 기존 게시 워크플로우를 시험용으로 복제할 수 있는지 확인
- 영향 범위: n8n workflow 목록/초안 생성만. Webhook 호출, publish/activate, Jira/Discord/DB/DLQ 요청은 없음.

## 관측 결과

- 게시된 `R01 PR36 a657890 support`에서 `R01 TC15 fault support live copy`를 복제했다. workflow ID는 `HSOugh9SHFGNwp0D`이며, n8n 목록에서 Published 표시가 없고 편집 화면의 `Publish`가 비활성 상태였다.
- 복제본의 B01 Webhook은 운영본과 다른 UUID 경로 `2851abfd-1bbb-41f3-9ef5-c25676cf4178`를 자동 생성했다. 아직 production URL 게시 및 호출은 하지 않았다.
- 게시된 `R01 PR36 a657890 handoff`에서 `R01 TC15 fault handoff copy`도 생성했다. 목록에 Published 표시는 없다. 아직 설정을 편집하거나 활성화하지 않았다.
- 먼저 `R01 PR36 dual storage Support`(목록에서 Published 표시가 없는 초안)에서 `R01 TC15 fault support copy`를 만들었다. 이는 게시 운영본의 시험 사본이 아니므로 TC-15 실행 대상에서 제외한다. 기존/시험 workflow를 삭제하지 않았다.

## 판정 및 제한

이번 장애는 VM/n8n 접근권한이 아니라 Edge 확장이 파일 선택창에 로컬 파일 접근을 허용하지 않은 것이었다. TC-15를 위해 로컬 파일을 다운로드할 필요는 없다. n8n 내부 Duplicate 동작으로 게시 workflow를 직접 복제할 수 있음을 확인했다.

TC-15는 아직 미실행이다. 두 게시본 사본을 격리 편집하고, handoff의 알림 노드를 승인된 synthetic 503 대체로 구성하고, support 사본을 handoff 사본으로 연결한 뒤 사본만 게시/활성화해야 한다. 이후 승인된 요청 2건, Jira/DLQ 효과와 `409 case_busy`를 확인하고 시험 사본을 비활성화한다. 이번 실행에서는 Jira 티켓, Discord 전송, 저장소 상태 변경이 발생하지 않았다.
