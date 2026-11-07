# PR36 핵심 경로 VM 읽기 재점검 · R01 관측

- 실행 묶음: `20261107-194606-vm-pr36-readonly-recheck` (2026-11-07 19:46 KST)
- 방법: Edge의 기존 Web SSH 페이지와 로그인된 n8n/Jira 페이지에서 읽기만 수행. 워크플로우 실행·수정·게시, 컨테이너 재시작, Jira 변경은 하지 않았다.
- 저장소 기준: local branch `r01/p26-final-closure`, HEAD `6f9561bae48ad5da44b726f95c18d29024ba0d0d` (`origin/main`과 동일). 점검 당시 작업 트리는 문서·TC15 사례 수정이 포함된 dirty 상태였다.

## 관측

| 항목 | 관측 | 한계 |
| --- | --- | --- |
| VM 서비스 | n8n `2.42.6` 계열, PR36 auth-boundary 이미지 `pr36-a657890`; Discord bot `pr36-1328c63`; core user API `pr36-a657890` healthy; 새 UX user API `ux-6f9561b` healthy; PostgreSQL `16.15` healthy | 이미지·시작 시각은 점검 당시 컨테이너 메타데이터. 전체 배포 구성·volume 백업·설정 버전 manifest는 아직 아님 |
| 시민 진입 경로 | 봇의 설정값을 출력하지 않고 URL 경로만 가려 확인: `/webhook/dubakwi-support-pr36-a657890` | 새 사용자 요청은 보내지 않음 |
| n8n core | `R01 PR36 a657890 support`가 Published이고 본체가 `R01 PR36 a657890 search/handoff/state/dlq/errors` 하위 흐름을 참조. B04는 `dubakwi-user-api:8801/employees/...`와 내부 Header Auth credential 사용. support workflow의 B14는 PR36 search 경로를 호출 | 편집기 구조/설정 읽기만 확인. 실제 종단 호출은 미수행 |
| 병렬 UX·mock 경로 | `dubakwi-ux-*` 5개 흐름은 별도 이름으로 Published. 기본 `dubakwi-support`도 별도로 Published이며 편집기에서 B07~B32 대체 mock 노드가 보임. Discord 봇 경로는 PR36 경로를 가리켜 기본 mock webhook과 분리됨 | UX 사용성·실제 알림 전송은 이 실행에서 판정하지 않음 |
| 실행 기록 | n8n 전역 overview: 789 production executions, 실패 4, 0.5%, 평균 2.7초. 선택한 PR36 support workflow의 실행 탭에는 기록이 없음 | overview 수치는 인스턴스 전체 집계이고 PR36 개별 성능/성공률이 아님. 세부 실행 보존 설정/정책은 별도 확인 필요 |
| Jira 보드 | 로그인된 기존 core Jira 보드에서 3개 항목 표시: To Do 1(담당자 지정), Done 2, In Progress/In Review 0 | 읽기만 수행. 이 항목만으로 J01~J03 본인 조회·타인 거절·후속 문맥·담당 처리 뒤 시민 조회를 증명하지 않음 |

## 판정과 다음 작업

봇이 실제 업무용 PR36 webhook을 호출하고, 본체가 RAG·Jira/state 하위 흐름과 새 user API를 연결하는 구조는 현재 UI에서 확인했다. 기본 mock workflow와 UX 사본이 별도 병렬 구성이라는 점도 확인했다. 따라서 mock을 서비스 진입점으로 오인한 이전 우려는 해소됐다.

이번 읽기 점검은 P26 완료가 아니다. 102개 workflow 전체의 환경별 연결/버전, Jira·RAG 실행 효과, 실제 담당자 수신/처리와 시민 후속 조회를 새로 실행하지 않았다. VM 경로에서는 사례 실행 권한과 고장 주입 상태를 먼저 확인한 뒤 TC15, WF11, J01~J03 및 RAG 권한 시험을 별도 실행 묶음으로 수행해야 한다. 기존 Jira 업무 상태는 변경하지 않았다.

이전 VM 시험의 실패·시간·기대 불일치는 [PR36 통합 보고서](../20261107-170503-vm-pr36-integration/report.md)에 보존한다. 관련 로컬 재검증은 [TC15 재검증](../20261107-193015-local-p26-tc15-retest/report.md)과 별도다.
