# TC-15 격리 사본 게시 및 실행 차단 관측

- 실행일: 2026-11-07 21:34 KST
- 환경: VM n8n 웹 UI (Edge), TC-15 synthetic webhook 미호출
- 대상: `pr36A657DualState`, `pr36A657DualDlq`, `pr36A657DualHandoff`, `pr36A657DualSupport`
- 결과: 워크플로우 게시 준비 완료, 사례 미실행 (요청 0건)

## 변경과 확인

사용자 승인에 따라 테스트 의존성 State/DLQ를 게시했다. Handoff 복제본은 H14/H17/H19가 복제 State를 참조하며, 알림 노드 H11은 `Code in JavaScript`로 대체되어 synthetic 503을 반환한다. 그 뒤 Handoff 복제본을 게시했고, Support 복제본은 dual Handoff/State/DLQ를 참조하는 점을 확인하고 게시했다.

TC-15 입력은 `cases/team-extended.json` TC15 정의를 확인했다. 단, 실제 요청 전 Edge의 aio-t2 SSH 웹 터미널은 로그인 프롬프트에 머물러 VM 명령 실행이 불가했다. 계정 인증 정보를 입력하거나 우회하지 않았다. n8n UI의 Execute workflow는 webhook으로 JSON을 제출하는 대체 경로가 아니므로 사용하지 않았다. 이에 첫/후속 요청 모두 보내지 않았으며 Jira 티켓, PR36 업무 상태, DLQ 기록, Discord 통지는 이번 시도에서 생성되지 않았다.

미실행이 확인된 즉시 Handoff H01 트리거와 Support B01 트리거를 비활성화했다. UI의 두 트리거에 `Activate`가 표시되어 비활성 상태임을 확인했다. State/DLQ는 webhook 진입점이 아닌 게시된 하위 워크플로우 의존성이므로 상태 기록 및 DLQ 처리 경로가 게시된 채로 남아 있다. 별도 인스턴스/DB로 격리된 것은 아니며, PR36 DB를 공유한다.

## 판정 및 다음 단계

TC-15 종단 검증은 미실행/미판정이다. 기존 TC15의 Jira 이슈 생성·case 상태·DLQ 수량 조건은 어떤 것도 통과로 표시하지 않는다. 기존 TC-15 게시 게이트 보고서(`20261107-212335-vm-tc15-publish-gate`)는 그 시점의 기존 사본 상태를 기록한 과거 증거로 보존한다. 현재 선택된 dual-storage 사본의 의존성 문제는 해결했으나, 요청 실행은 별도 VM 요청 클라이언트 접근이 가능할 때 이어서 진행해야 한다.

VM 접근 경계: Edge n8n UI 사용. 웹 SSH는 `aio-t2 login:`에서 중지. 계정 정보 요청/입력 없음. 운영 Support/Handoff 게시본은 수정하지 않았다.
