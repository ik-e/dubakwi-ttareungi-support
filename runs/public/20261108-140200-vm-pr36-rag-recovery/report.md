# PR36 RAG 복구 재시험

- 실행 ID: `20261108-140200-vm-pr36-rag-recovery` (KST)
- 실행 시각: 2026-11-08 14:01–14:03 KST
- 환경: VM n8n UI 및 Edge 웹 SSH; PR36 index workflow와 기존 PR36 Support API
- 범위: 실행 #2167 관련 복구, PR36 index 재실행, 재색인 후 QR 검색 종단

## 조치와 결과

n8n UI에서 #2167은 상세를 찾을 수 없고 전체 Running 목록에도 보이지 않았다. 기존 승인에 따라 실제 VM 컨테이너 `day65-n8n-n8n-1`만 재시작했다. 재기동 후 n8n 연결을 확인하고 PR36 전용 `R01 PR36 a657890 index` workflow를 UI의 Manual 실행으로 시작했다. UI는 `Workflow executed successfully`를 표시했고 처리 항목은 44개였다. 이전 성공 표본과 동일한 PR36 전용 workflow/key를 사용했다.

직후 기존 bot 컨테이너의 secret mount를 요청 내부 인증에만 사용해 PR36 Support QR synthetic 문의 1건을 보냈다. 응답은 HTTP 200, `자동 답변`, ticket null이었고 `rental-guide`의 QR 인식/잠금 해제 및 대여 시작 절이 두 개 반환됐다. 비밀과 case reference는 출력·기록하지 않았다. 신규 Jira 티켓 생성이나 Discord 전송은 발생하지 않았다.

## 실행 메타데이터 주의

읽기 전용 SQLite 조회에서 과거 #2167은 재시작 뒤에도 `running`, `stoppedAt=null`로 남았다. 새 UI 성공 실행 #2211도 SQLite에서 `running`, `stoppedAt=null`로 보였다. 따라서 workflow UI 성공과 실제 RAG 검색은 확인했지만 n8n execution row의 stale `running` 표시는 해소되지 않았다. PR36 색인의 정확한 소요 시간도 실행 화면에서 별도 계측하지 않았다. 이 메타데이터 불일치는 운영 경로 성공과 별도 추적 항목으로 남긴다.

## 판정

- PR36 전용 index workflow 재실행: UI 기준 통과 (44 items)
- 재색인 후 PR36 QR 검색·근거 답변: 통과 (HTTP 200, public `rental-guide` 근거)
- 실행 DB 종료 상태 동기화: 미해결 (#2167 및 #2211 stale `running` 관측)
- Jira/Discord 외부 효과: 0
- RAG 전체 권한·장애·색인 복구 계약: 이 시험만으로 전체 완료 처리하지 않음

## 한계

VM UI 실행 시간은 보고서 캡처 시각만으로 초 단위 산출하지 않았다. SQLite 메타데이터를 직접 수정하지 않았고, 추가 재시작/색인도 반복하지 않았다. 상세 상태와 실행 row 불일치는 별도 원인 분석이 필요하다.
