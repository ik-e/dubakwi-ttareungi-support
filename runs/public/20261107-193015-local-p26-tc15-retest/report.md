# P26 TC-15 계약 분리·로컬 재검증 · R01 관측

- 실행 묶음: `20261107-193015-local-p26-tc15-retest` (KST)
- 기준 코드: `6f9561bae48ad5da44b726f95c18d29024ba0d0d`, 브랜치 `r01/p26-final-closure`
- 변경한 판정 원본: [team-extended.json](../../../cases/team-extended.json), SHA-256 `d8ced89f01e6203e02fc627419401585411162a09602b54e9e7356e5afdda6c1`
- 선행 기준: [저장소 3.2~3.3](../../../docs/project/STORAGE-DESIGN.md)·[워크플로우 7.6](../../../docs/project/WORKFLOW-DESIGN.md)
- 상세 요약: [summary.json](summary.json)

## TC-15 기대값 정리

기존 TC-15는 알림 결과가 불명인 첫 요청 뒤, 같은 문의의 새 요청도 `200 partial_effect`로 처리하고 같은 단계에서 `alert_marker`를 갱신하도록 기대했다. 하지만 저장 계약은 이전 문의의 요청이 `unknown`이면 같은 문의를 `409 case_busy`로 차단해 새 처리권과 외부 변경을 만들지 않도록 한다. 기존 기대는 이 안전 경계와 모순된다.

이 사례는 이제 두 경계를 확인한다.

1. 첫 요청: 알림 효과 미확인, `unknown/partial_effect`, known Jira ID와 alert 복구 자료 보존, 자동 재알림 0.
2. 같은 `case_ref` 후속: `409 case_busy`, LLM/Jira/Discord/state write 0, 성공·완료를 약속하지 않음.

`alert_marker`의 같은 case DLQ dedup은 후속 요청이 begin에서 차단되므로 [별도 모듈 시험](../../../scripts/test/p18-dlq-marker-cases.js)에서 분리 판정한다. 기존 VM의 HTTP 200 기대 불일치와 최초 실패는 [PR36 VM 보고서](../20261107-170503-vm-pr36-integration/report.md)에 그대로 남겼다. 이번 변경은 사례 기대값만 정리했으며 workflow/API/DB 동작은 바꾸지 않았다.

## 로컬 시험 결과

| 시험 | 결과 |
| --- | --- |
| Python 전 회귀 | 148개, 141 통과·7 생략·실패 0. 생략 7개는 `DUBAKWI_INTERNAL_KEY`가 필요한 live/local RAG HTTP 시험이다. 상세 로그는 Git 제외 경로 `runs/20261107-193015-local-p26-tc15-retest/python-unittest.log`에 있다. |
| `p18-dlq-marker-cases.js` | 7/7 통과 |
| P12 case_ref·begin 409 문구 | 전부 통과 |
| P12 Jira handoff 흐름 | 21개 시나리오와 deadline/config gate 통과 |
| 반복 이관·알림 억제 | 7/7 통과 |
| R04 recovery/DLQ parity | 8/8 action 대응 |
| P20 state/DLQ safety | 16개 사례와 운영 알림 ack 확인 통과 |
| team-extended JSON | 파싱 통과 |
| TC15 runner dry-run | `blocked` 예상. 고장 주입 준비가 필요하며 요청은 전송하지 않았다. |

이 시험은 사례 형식과 로컬 모듈 계약만 확인했다. 실제 TC-15 고장 주입·Jira/DB/DLQ 재조회, 기존 경로의 Discord 알림 확인 및 `case_busy` 응답 계약 실검증은 수행하지 않았고 R01의 핵심 마감 항목이다. R02 담당은 새 UX 개선에 한정된다. 기존 P26 로컬 회귀 [실행 결과](../20261107-192148-local-p26-closeout/report.md)는 별도 실행으로 보존한다.



## 담당 범위 정정 · 2026-11-07

사용자 정정에 따라 R02의 범위는 새 UX 화면·문구·상호작용 개선으로 한정한다. 기존 문의 처리 로직과 Jira/Discord/DB 연동, 새 UX 사본의 backend 연결 및 통합 효과 검증은 R01 핵심 마감이다. 이 보고서에서 미실행으로 적은 기존 경로의 case_busy/Discord/Jira/DLQ 확인은 R02 대기가 아니라 R01의 잔여 작업이다. UX 표면의 사용성 평가는 별도 R02 증거로 구분한다.
