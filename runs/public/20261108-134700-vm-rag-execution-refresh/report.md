# VM RAG index execution read-only refresh

- 실행 ID: `20261108-134700-vm-rag-execution-refresh` (KST)
- 실행 시각: 2026-11-08 13:47 KST
- 환경: aio-t2 VM, 기존 Edge 웹 SSH 로그인 셸
- 대상: n8n container `day65-n8n-n8n-1`, `R01 PR36 a657890 index`
- 범위: Docker container 목록 및 n8n SQLite 실행 상태 read-only 조회

## 관측

컨테이너는 실행 중이었다. n8n SQLite를 `OPEN_READONLY`로 열어 `execution_entity`와 `workflow_entity`를 조회했다. PR36 Index 실행 #2167은 `running`, `startedAt=2026-11-08T03:52:15.855Z`, `stoppedAt=null`로 확인됐다. 같은 workflow 이름으로 반환된 최근 8개 행 중 기록은 #2167 한 건이었다.

첫 조회는 기존 메모에 나온 일반 컨테이너 이름 `n8n`을 사용해 `No such container`로 끝났다. `docker ps`에서 실제 컨테이너명을 확인한 뒤 올바른 컨테이너로 조회했고, VM 상태는 변경되지 않았다.

## 판정

- **상태 확인 가능:** 예. 웹 SSH 셸과 로컬 n8n SQLite read-only 조회 경로가 정상 동작했다.
- **복구 완료 확인:** 아니오. 실행 #2167이 여전히 `running`이고 종료 시각이 없다.
- **재시작/재색인:** 실행하지 않음. 현재 PR36 RAG가 메모리 기반 Simple Vector Store에 의존하므로 execution이 열린 상태에서 중단·재시작하면 현재 검색 상태를 잃을 수 있다. 안전한 복구 순서와 기존 execution 종료/효과 확인을 먼저 마련해야 한다.
- **쓰기 효과:** 없음. workflow 실행·정지·재색인·DB 변경을 하지 않았다.

## 한계

이번 조회는 execution metadata만 확인했다. 실행 node data와 vector store의 현재 문서·청크 population은 열람하거나 보장하지 않는다. 따라서 알려진 응답 경로의 RAG 동작 증거는 기존 QR/SR-WF12 실행 결과에 의존하며, restart/reindex recovery는 미검증으로 유지한다.
