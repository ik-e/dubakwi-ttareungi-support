# PR36 전용 RAG 전체 검색 matrix

- 실행 ID: `20261108-142200-vm-pr36-rag-full-matrix` (KST)
- 실행 시각: 2026-11-08 14:22 KST
- 환경: aio-t2 VM, Edge Web SSH의 user-api 컨테이너 → PR36 search webhook
- 입력/기대값 원본: `cases/search.json` 16개 사례
- 대상: `R01 PR36 a657890 search` (`/webhook/dubakwi-search-pr36-a657890`)

## 결과

| 사례 | 응답 상태 | 확인한 기대 결과 | 판정 |
|---|---|---|---|
| SR-WF01 | `ok` | public rental-guide QR 절 | 통과 |
| SR-WF02 | `ok` | public return-guide 반납 미완료 절 | 통과 |
| SR-WF03 | `empty` | 근거 0건 | 통과 |
| SR-WF04 | `ok` | fees-refund-guide | 통과 |
| SR-WF12 | `ok` | privacy-security-guide의 계정 침해 공개 초동 안내 | 통과 |
| SR-TC04 | `ok` | fees-refund-guide 환불 근거 | 통과 |
| SR-TC09a | `ok` | return-guide 반납 안내 | 통과 |
| SR-TC09b | `ok` | privacy-security-guide 로그인/계정 찾기 | 통과 |
| SR-WF05 | `ok` | 시민 내부 정책 요청에도 public 근거만 반환 | 통과 |
| SR-R01 | `ok` | 이관 정책 질문에 public 근거만 반환 | 통과 |
| SR-R02 | `ok` | 티켓 lifecycle 질문에 public 근거만 반환 | 통과 |
| SR-R03 | `ok` | 시민 자기소개로 staff 권한 승격 없음; public 근거만 반환 | 통과 |
| SR-R04 | `error` | `invalid_request`, evidence 0건, 제한 canary 미노출 | 통과 |
| SR-STAFF01 | `ok` | 허용된 staff 권한으로 restricted handoff-policy 반환 | 통과 |
| SR-STAFF02 | `ok` | 허용된 staff 권한으로 restricted ticket-lifecycle 반환 | 통과 |
| SR-OFF | `skipped` | 검색 비활성, evidence 0건 | 통과 |

**집계: 16/16 통과.** 모든 요청은 검색 전용이었다. 시민 권한 사례에서 restricted 근거가 반환되지 않았고, 제한 자료 양성 대조는 staff 권한에서만 해당 자료를 반환했다. 직전 PR36 표적 7건 시험의 결과와 일치한다. 13:14 legacy search의 SR-WF12 raw query 실패는 PR36 전용 경로 결과와 분리한다.

## 실행 기록 대조

검색 UI의 Executions 화면은 `No executions found`다. 읽기 전용 SQLite 조회에서는 이 배치에 대응하는 PR36 search webhook 실행 16개(ID #2228–#2243)가 모두 `running`, `stoppedAt=null`로 남았다. 각 webhook은 HTTP 200 응답을 돌려줬다. PR36 index 수동 실행 #2211도 같은 DB 상태다. 과거 #2167은 이번 조회에 나타나지 않았다.

PR36 workflow DB settings는 `saveDataSuccessExecution=none`, `saveManualExecutions=false`, `saveExecutionProgress=false`다. 따라서 UI에 완료 이력이 없는 것은 저장 설정으로 설명된다. 다만 실제 SQLite row가 성공 응답 뒤에도 `running`인 이유는 설정만으로 확정되지 않는다. execution row를 직접 수정/삭제하지 않았다. index execution #2211의 종료시각이 없어 색인 시간은 계산할 수 없다.

## 한계 및 부수 효과

- 검색 기준의 결과/권한 assertion은 통과했지만 개별 응답 latency는 기록되지 않았다.
- 색인 처리 시간은 미측정이다. 단순 계측을 위해 인메모리 Simple Vector Store에 같은 44 chunks를 다시 쌓지 않았다.
- Jira, Discord, support state, DLQ는 호출하지 않았다. n8n execution metadata 행 16개는 관측한 실제 저장 효과다.
- SQLite read-only 조회와 workflow setting read만 수행했다. 저장 설정·workflow를 변경하지 않았다.
