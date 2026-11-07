# P19 W02 본체 수정 (PR #36) 로컬 Code 시험

2026-11-07 KST, R02. R01 PR #36(`1a2d8e0`)의 W02 지시 중 support 본체 4개 차이(B08·B11·B24·B25)와 D02 소비를 반영했다. 기준은 `infra/parallel-integration-contract-v1.md` 2·3·4·5절, `infra/full-system-closure-plan.md` 4절, 예제 `infra/contracts/parallel-contract-v1.examples.json`이다. [검사 요약](summary.json) · [흐름 154건](flow-cases.json).

## 바뀐 노드

| 노드 | 변경 | 대응 예제 |
| --- | --- | --- |
| B08 | handed_off 후속은 저장 횟수 유지(요청 attempt 무시). 검증된 assignee_role·priority가 없으면 state_error | CV03, CV05 |
| B11 | handed_off 후속은 사실 추출만 하고 항상 handoff/needs_human. 같은 key 다른 진술은 최신값+불일치 기록, confirmed와 다르면 덮지 않고 필수 항목이면 다시 확인. urgency=high면 새 위험 기록 | CV02, CV03, CV19, CV25, D02 |
| B23 | 후속 안내 "기존 문의에 추가 내용을 전달했습니다", 새 위험 안내 "새로운 위험 내용은 담당자 확인이 필요합니다" | CV03, D02 |
| B24 | 조회 record.status=closed → "처리 종료" | CV18 |
| B25 | handed_off 후속은 같은 ticket_id·action=handoff에 저장된 역할·우선순위 | CV03, CV04 |

## 결과

| 시험 | main `eb747df` | W02 |
| --- | --- | --- |
| 전체 | 146/154 | 154/154 |
| FL95 CV03 이관 후속 횟수·역할·우선순위 유지 | 실패(attempt_limit, attempt 99) | 통과 |
| FL96 이관 후속은 보완 질문 회귀 없음 | 실패(attempt 4) | 통과 |
| FL97 CV04 security·high 유지 | 실패(priority normal) | 통과 |
| FL98 D02 새 위험은 기록만 | 실패(새 urgent·high·검색) | 통과 |
| FL99 CV05 역할 미검증은 state_error | 실패(그대로 이관 처리) | 통과 |
| FL100 CV02 아는 항목 재질문 없음 | 통과(기존 동작) | 통과 |
| FL101 CV19 진술 불일치 기록 | 실패 | 통과 |
| FL102 CV25 확인값 충돌 재확인 | 실패(자동 답변) | 통과 |
| FL103 CV18 처리 종료 표시 | 실패("확인 중") | 통과 |

FL99는 기존 state_error 경로대로 실패 기록(failed)·DLQ 1건·알림 1건을 남기고 Jira 처리 0이다.

## 미실행

- 이관 후속 문장에 대한 실제 LLM 분류(사실 추출 품질)
- R04 state/handoff 생산자(J03, assignee_role·priority 복원)와의 결합 실행
- 로컬 n8n 가져오기, VM, 실제 Jira·DB
- R05 공식 판정(AC-J02, AC-B07)
