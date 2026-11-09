# VM PR36 RAG readiness 및 실행본 대조

- 실행 ID: `20261108-122400-vm-rag-readiness` (KST)
- 실행 시각: 2026-11-08 12:24 KST
- 코드 기준: 로컬/원격 main `dd919d7`; VM runtime image tag는 `pr36-a657890`
- 환경: Edge 기존 웹 SSH 및 n8n UI, aio-t2; 앞선 이번 회차 Discord UAT 응답도 함께 참조
- 범위: 저장소 manifest, VM PR36 index/search workflow 상태, 과거 동일 VM 통합 시험과 현재 UAT 응답 증거 대조
- 변경/외부 효과: workflow 실행·게시·credential 변경·재색인·추가 검색 요청 없음

## 확인된 기능 동작

기존 [2026-11-07 VM 통합 실행](../20261107-170503-vm-pr36-integration/report.md)은 팀 VM에서 시험본 비활성화 및 n8n 재시작 뒤 44개 청크를 재색인하고, 새 QR 문의에서 실제 검색·rental-guide 근거 응답을 확인했다. API→B05→B13→RAG의 AUTH 표적 시험은 7/7 기대를 확인했으며, 이 중 3건은 통제된 API 출력 fixture였다. 이번 2026-11-08 Discord UAT의 D08에서도 고장 안내와 `breakdown-report / 고장 신고` 근거가 실제 비공개 응답에 표시됐다([이번 회차](../20261108-121900-vm-discord-uat-followup/report.md)). 따라서 RAG 기능을 “동작하지 않음”으로 판정하지 않는다.

## 현재 UI 및 문서 상태

| 항목 | 관측 | 해석 |
| --- | --- | --- |
| VM PR36 index | `R01 PR36 a657890 index`, Manual trigger, Publish 버튼 비활성, 이 workflow ID의 Executions 화면은 `No executions found` | 수동 색인 workflow는 게시 Webhook이 아니다. 이 화면만으로 수동 실행·벡터 데이터 부재를 결론내릴 수 없다. 기존 종단 보고서는 별도의 실제 색인 성공 근거다. |
| VM PR36 search | `R01 PR36 a657890 search`, Published | 검색 경로 게시 확인. 정확한 현재 memory population을 뜻하지는 않음 |
| 현 Discord D08 | 실제 안전 답변과 출처 문서/절 표시 | 현재 이용자 경로에서 근거 응답을 보여 준 smoke evidence. 전수 검색·권한 matrix 통과를 대신하지 않음 |
| 저장소 manifest | 8개 모두 `pending_review`, `index_enabled=false`; schema `proposed_not_approved` | 교육/시험용 지식 manifest의 현재 저장소 상태. 11/7 시험 입력·승인 설정과 동일하다고 추정하지 않음 |
| 실행본·population 계보 | VM UI export/hash/credential 및 active Simple Vector Store의 문서별 현재 population은 이번 read-only 점검에서 확인하지 않음 | 새 RAG 실행을 막는 기능 장애라기보다 현재 상태의 세부 재현성/계보 공백 |

## 판정과 다음 시험

**RAG 기능: 실제 VM 종단에서 확인됨. 현재 단계: 통과 증거 재사용 가능, 세부 readiness/계보는 부분 확인.** 이전 답변에서 Manual·미게시 상태와 UI 실행 이력 부재를 근거로 readiness 전체를 차단 처리한 것은 과도했다. Manual trigger의 색인 workflow가 Publish되지 않은 것은 그 자체로 결함이 아니며, 저장 실행 이력이 없다는 사실도 기존 실제 종단 근거를 무효화하지 않는다.

남은 RAG 시험은 기존 44청크 종단을 반복하는 것이 아니라 `cases/search.json`의 public/restricted/no-result/error·citation·verifier·prompt-injection 경계와 실제 현재 배포 경로에서의 효과를 사례별로 대조하는 일이다. 재색인이 필요한 경우에는 manifest 승인 상태, 색인 입력/키, n8n 메모리 휘발성 및 재시작 전후 상태를 별도 기록한다. 검색 검증 중 현재 index를 초기화하거나 workflow를 바꾸지 않는다. 이번 실행에서는 서비스 설정 변경, 색인, DB/Jira/Discord 쓰기 효과가 없었다.
