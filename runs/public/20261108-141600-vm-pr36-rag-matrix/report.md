# PR36 전용 RAG 검색 경계 matrix

- 실행 ID: `20261108-141600-vm-pr36-rag-matrix` (KST)
- 실행 시각: 2026-11-08 14:14–14:16 KST
- 환경: aio-t2 VM, Edge 웹 SSH를 통한 PR36 user-api → PR36 search webhook
- 대상: `R01 PR36 a657890 search`, `/webhook/dubakwi-search-pr36-a657890`
- 요청: 7개 synthetic direct-search 사례. X-Internal-Key는 secret mount에서 요청에만 사용하고 출력하지 않았다.

## 결과

| 사례 | HTTP / 상태 | 근거·권한 판정 | 결과 |
|---|---|---|---|
| 공개 QR | 200 / `ok` | public `rental-guide` QR 절 포함 | 통과 |
| 근거 없음 | 200 / `empty` | evidence 0건 | 통과 |
| restricted-only 잘못된 권한 | 200 / `error` | `invalid_request`, evidence 0건 | 통과 |
| 검색 비활성 | 200 / `skipped` | evidence 0건 | 통과 |
| 시민 canary | 200 / `ok` | 반환 근거가 모두 public, restricted 문서·canary 없음 | 통과 |
| 담당자 restricted | 200 / `ok` | 허용된 staff 요청에서 `ticket-lifecycle` restricted 근거 포함 | 통과 |
| 혼합 보안 질문 SR-WF12 | 200 / `ok` | `privacy-security-guide`의 계정 침해/보호 public 근거 포함, restricted 누출 없음 | 통과 |

**집계: 7/7 표적 assertion 통과.** 이 결과는 PR36 전용 search 경로의 표적 표본이며 `cases/search.json` 전체 16개를 재실행한 결과는 아니다. 13:14의 15/16 실패는 legacy `dubakwi-search` 경로 결과다. 이번 SR-WF12는 PR36 경로에서 실제 설정된 query transform을 통과했다.

## 실행 lifecycle·성능

PR36 index UI에서 44 items 성공과 Mark ready 완료 표시를 앞선 14:01 재시험에서 확인했다. 다만 n8n workflow Executions 화면은 `No executions found`였고, read-only SQLite에는 #2211만 `running`, `stoppedAt=null`로 남았다. #2167은 이번 동일 조회의 결과 집합에 나타나지 않았다. 따라서 UI 성공/RAG 동작은 재확인했으나 실행 메타데이터 정합성 문제는 남는다. 완료 시각이 저장되지 않아 색인 소요시간을 신뢰성 있게 산출할 수 없다. 인메모리 벡터에 중복 삽입할 수 있어 측정만을 위한 색인 재실행은 하지 않았다.

## 부수 효과와 한계

이 사례들은 search-only webhook이었다. Jira/Discord 요청은 하지 않았다. Support state/DLQ 변화는 이 시험 범위가 아니며 별도 DB 대조를 수행하지 않았다. 요청별 응답 시간은 측정하지 않았고 전체 16개 direct-search 사례 및 전체 문의 답변 matrix를 대신하지 않는다.
