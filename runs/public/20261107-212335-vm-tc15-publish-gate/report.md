# TC-15 게시 게이트 확인

- 실행 시각: 2026-11-07 21:23 KST
- 환경: Edge 웹을 통한 VM n8n UI
- 대상: 시험용 handoff copy `aZRRsFc49PZrhMI6` (`R01 TC15 fault handoff copy`)
- 요청·외부 효과: 없음. Jira/DB/DLQ/Discord 변경 없음.

## 관측

- 복사본의 H11은 `H11 담당 알림 (synthetic 503)` Code 노드로 표시되어 있다. 시험용 대체 노드의 존재는 UI에서 확인했다.
- 상단 `Publish` 버튼이 비활성화되어 있다. 게시 메뉴에서도 `Publish`와 `Unpublish`가 모두 비활성화되어 있다.
- `Production Checklist`에는 `Enable MCP access` 항목과 “Enable instance-level MCP access to allow MCP clients to access workflows” 안내가 표시된다.
- 이 항목은 인스턴스 전체 접근 권한을 여는 보안 설정이다. 이번 시험 복사본 게시 승인은 인스턴스 권한 변경 승인으로 확대하지 않았으므로 설정을 변경하지 않았다.
- 따라서 게시 및 활성 상태는 확인되지 않았고, TC-15 synthetic 요청 2건은 보내지 않았다. Jira·공유 PR36 상태·DLQ에 새 시험 효과가 없으며 Discord 전송도 없었다.

## 판정 및 다음 단계

TC-15는 게시 게이트에서 막혔다. 원인은 UI에 게시 메뉴 비활성 및 인스턴스 MCP 접근 체크 항목으로 관측됐으나, 사용 가능한 UI 범위에서 `Publish`가 왜 해당 항목에 종속되는지 또는 별도의 제한인지 확인되지 않았다. 인스턴스 MCP 접근을 켜지 않고 시험용 복사본을 게시할 수 있는 관리자 경로를 찾아야 한다. 이 설정을 켜는 것은 워크플로우 시험 승인 범위를 넘어서는 보안 권한 변경이다. 게시 가능해지면 먼저 support 사본이 이 synthetic handoff 사본으로만 라우팅되는지 확인한 뒤 승인된 두 요청을 실행하고 곧바로 두 사본을 비활성화한다.
