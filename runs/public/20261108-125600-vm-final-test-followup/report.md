# VM 최종 시험 후속 — RAG·TC-15 상태

- 실행일: 2026-11-08 12:56 KST
- 환경: aio-t2 VM, Edge 웹 SSH/n8n UI, PR36 검색 webhook
- 코드 기준: `main` `dd919d7` (VM 컨테이너 실행 기준과 동일하다고 단정하지 않음)
- 관련 계획: [최종 시험 계획 v1.4](../../../docs/project/final-test-plan.md)
- 사전 근거: [RAG readiness](../20261108-122400-vm-rag-readiness/report.md), [Jira 재확인](../20261108-124100-vm-jira-readonly-followup/report.md)

## 실행 결과

| 사례/절차 | 관측 | 판정 |
|---|---|---|
| RAG 수동 색인 workflow | 기존 `R01 PR36 a657890 index` workflow를 편집 없이 실행. 44개 정적 demo chunk(공개 36, 제한 8)가 embedding/loader 경로를 통과하고 readiness 단계까지 완료 표시 | 실행 완료, 검색 준비 상태는 별도 검증 필요 |
| SR-WF01 public 검색, 색인 전 | HTTP 200, `status=error`, `error_code=index_not_ready`, 근거 0 | 실패 |
| SR-WF01 public 검색, 색인 후 | 동일 endpoint에서 HTTP 200, `status=error`, `error_code=index_not_ready`, 근거 0 | 실패. 기존 RAG 성공 보고서와 현재 runtime 응답이 불일치 |
| SR-OFF 비활성 검색 | HTTP 200, `status=skipped`, 근거 0 | 통과 |
| SR-R04 잘못된 접근 레벨 요청 | HTTP 200, `status=error`, `error_code=invalid_request`, 근거 0 | 통과 |
| TC-15 사본 점검 | n8n `R01 TC15 fault support live copy`가 active 표시. Support 사본 내부 B14/B15/B27이 운영 PR36 검색/조회 webhook URL을 참조하는 것을 확인. 정확한 B01 ingress path와 Handoff H11 fault state는 이번 화면에서 확인되지 않음 | 격리·고장 주입 조건 미충족. synthetic 요청 0건; 사본 경로 검증 전 호출 보류 |

## 안전/범위 기록

- 색인 실행은 저장소의 demo corpus만 사용했으며 workflow 편집, publish, 운영 컨테이너 재시작은 하지 않았다. 기존 OpenAI Embeddings 노드를 통해 demo chunk의 임베딩 호출은 발생했다.
- 잘못된 입력/비활성 검색은 내부 검색 endpoint로만 전송했다. Jira·Discord·문의 상태/DLQ 변경은 발생하지 않았다.
- TC-15는 공유 PR36 경로를 사용할 수 있는 정황이 확인되어 실제 고장 시험으로 진행하지 않았다. 먼저 B01 고유 ingress와 내부 호출의 사본 전용 경로, Handoff의 synthetic 503 연결, 두 트리거의 상태를 확인해야 한다. 이번 관측으로 새 Jira 티켓이나 DLQ 레코드는 만들지 않았다.

## 결론

전체 테스트 완료 판정은 불가하다. 공개 RAG 검색이 색인 실행 후에도 `index_not_ready`로 실패하며, SR-OFF/SR-R04만 현재 endpoint에서 통과했다. TC-15는 승인된 synthetic 2회 시험의 범위와 다르게 운영 webhook을 호출할 위험을 배제하지 못해 미실행으로 남겼다. 과거 실행 보고서의 성공/실패를 덮어쓰지 않고 현재 관측을 별도 증거로 보존한다.
