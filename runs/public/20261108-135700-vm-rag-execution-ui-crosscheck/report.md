# PR36 RAG index execution UI/DB 대조

- 실행 ID: `20261108-135700-vm-rag-execution-ui-crosscheck` (KST)
- 실행 시각: 2026-11-08 13:57 KST
- 환경: Edge n8n UI 및 기존 Edge 웹 SSH read-only 관측
- 범위: SQLite에 남은 PR36 index execution #2167과 n8n 실행 UI의 일치 여부, 과거 성공 표본 비교

## 관측

앞선 [VM SQLite read-only 결과](../20261108-134700-vm-rag-execution-refresh/report.md)는 `R01 PR36 a657890 index` execution #2167을 `running`, `stoppedAt=null`로 보였다. 이번 n8n UI 확인에서는 `/workflow/dubakwiPR36a657Index/executions/2167` 화면이 `Could not find execution` / `No executions found`를 표시했다. 전체 실행 목록을 `Status=Running`으로 필터해도 `No executions`로 나타났다. 따라서 UI에는 #2167을 선택해 중지하거나 노드 진행 상태를 확인할 실행 항목이 없다.

전체 실행 목록에는 별도 `dubakwi-index` execution #2170이 `Success`, 10.699초로 표시됐다. 이는 legacy workflow/key namespace이며 PR36 index #2167의 실행시간으로 사용할 수 없다. #2168은 `dubakwi-search` 성공 1.704초다.

기존 11/7 PR36 통합 결과는 n8n 재시작 후 44청크 재색인과 근거 포함 사용자 응답을 기록했지만, 색인 소요 시간은 남기지 않았다. 11/8 13:25 QR 및 13:30 SR-WF12 PR36 종단도 근거 검색을 통과했다.

## 판정과 조치

- **색인 시간이 보통 55분 걸린다는 증거는 없음.** 확인된 legacy 색인 실행은 10.699초였지만 비교 workflow가 다르며, PR36 색인의 정상 실행시간 기준은 미측정이다.
- **RAG 사용자 경로 고장으로 볼 증거는 없음.** 해당 시각의 PR36 QR·SR-WF12 요청은 각 기대 근거를 반환했다.
- **실행 상태 기록에는 불일치가 있음.** SQLite는 #2167을 running이라 하지만 n8n UI와 전체 Running 목록에는 보이지 않아, 실제 active process인지 저장/표시가 누락된 stale row인지 확정하지 못한다.
- n8n UI에 중지 대상이 없으므로 #2167을 강제 종료하지 않았고, n8n 컨테이너 전체를 중지하거나 별도 색인을 병행하지 않았다. 이는 모든 workflow와 volatile vector store를 함께 끊을 수 있다.
- 필요 시 사용할 성공 기준은 이전 44청크 PR36 VM 절차다. legacy `dubakwi-index` 결과를 PR36 key의 대체 성공으로 사용하지 않는다. 실행 #2167이 active인지 안전하게 배제하거나 종료한 뒤, 동일 PR36 index workflow의 전체 완료·ready·대표 검색을 확인해야 복구 완료로 판정할 수 있다.

## 한계

n8n process 내부 실행 registry와 #2167 node-level progress/runData는 이번 UI에서 열리지 않았다. 따라서 stale metadata 여부, 부분 색인 범위, 정확한 실패 지점은 미확정이다. 이번 대조는 UI 조회만 했고 workflow·DB·vector store에 쓰지 않았다.
