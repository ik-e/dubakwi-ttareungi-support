# TC-15 H11 synthetic 대체 구성

- 실행 시각: 2026-11-07 21:05 KST
- 환경: Edge 웹을 통한 VM n8n UI
- 대상: `R01 TC15 fault handoff copy` (`aZRRsFc49PZrhMI6`)
- 시험 실행: 미실행. Jira/DB/DLQ/Discord 효과 없음.

## 관측

- H11 HTTP Request 노드를 n8n의 `Code in JavaScript`로 **교체**했다. 교체 후 원래 H11 노드는 그래프에서 사라지고 upstream ID `901d1a42-dabd-4e0e-81f6-1c88609b9bf0`에서 새 Code node ID `ca4be259-1e6b-4935-9027-3d86c1f9ecbc`로 연결되며, 그 노드에서 downstream H49 ID `0880bd72-4c21-4271-b571-41f0b30da615`로 이어지는 것이 보였다.
- Code 내용은 `return [{json:{statusCode:503,body:{error:'synthetic_fault'}}}];`이다. 이를 통해 Jira 티켓 흐름은 유지하면서 H11에서 외부 Discord 요청을 하지 않도록 의도한 사본 설정이다.
- 노드 표시명을 `H11 담당 알림 (synthetic 503)`으로 바꿨다.
- UI 상단 `Publish` 버튼은 disabled 상태였다. Production Checklist에는 선택적 MCP access 안내만 보였다. 비활성 이유는 확인되지 않았다.
- `Execute workflow`도 실행하지 않았고 production webhook URL도 호출하지 않았다.

## 판정

알림 노드 대체와 배선은 시험 사본 편집 화면에서 확인했지만, 게시 가능 여부 및 저장된 활성 구성의 효력은 아직 검증되지 않았다. TC-15 시험 요청 2건, Jira 생성, DB unknown/DLQ 기록, 동일 case의 `409 case_busy`, 외부 호출 0회는 전부 미실행이다. 다음 단계는 이 사본을 안전하게 게시할 수 있도록 disabled Publish의 구체적 원인을 확인하고 support 사본을 handoff copy의 synthetic webhook URL에 연결하는 것이다.
