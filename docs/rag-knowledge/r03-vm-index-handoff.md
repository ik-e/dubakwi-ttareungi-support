# R03 VM 색인·권한 인계

2026-11-05 · 대상 R01/R02/R04/R05. 이 문서는 실행 절차와 인계 조건이며 VM 시험 성공 기록이 아니다.

## 1. 지금 확인한 내용

- PR #10은 `main`에 병합됐다(0e44fdb). 로컬 n8n 1.120.4에서 교육용 지식과 OpenAI `text-embedding-3-large`·Simple Vector Store의 색인·검색을 시험했다. 팀 VM에서 실행한 증거는 아직 없다.
- PR #17 `c0be214`의 모의 사용자는 citizen-a/b/c `public`, support-demo/security-demo `public`+`restricted`다. 팀 형식 사용자 API 서버·VM 주소·인증 및 실제 사용자 조회→B05→RAG는 미완료다. P11은 담당자의 restricted가 선택이므로 public만 온 담당자는 public만 검색한다.
- RAG는 내부 인증된 호출자의 `access_levels`를 받아 public/restricted 저장 공간을 검색 전에 선택한다. 호출자가 값을 서버 확인 결과로 만드는지는 R02/R04가 연결해야 하며 RAG만으로 실제 사용자 인가가 완료되지는 않는다.

## 2. VM에서 수동 색인할 절차 (제안, 미검증)

1. R01이 검토한 `main` 커밋과 VM의 n8n 버전·실행 방식·네트워크, 실행 기록 접근 및 기존 볼륨·백업을 확인한다. 기존 서비스나 데이터를 초기화하지 않는다.
2. `workflows/dubakwi-index.json`, `workflows/dubakwi-search.json`을 팀 VM n8n에 가져온다. 가져오기 경로의 정확한 절차는 VM 버전/강의 도구의 실제 지원 여부를 확인한다.
3. 색인·검색 각각의 `Embeddings` 노드에 팀 환경에서 허용된 OpenAI Credential을 명시적으로 연결한다. Credential은 같은 종류의 다른 값에 자동 연결될 수 있으므로 이름뿐 아니라 선택된 실제 항목을 확인한다. 키를 Git·공개 기록·채팅에 적지 않는다. 개인 키를 팀 VM에 복사한다고 가정하지 않는다.
4. 검색 Webhook에 팀 내부 전용 Header Auth `X-Internal-Key`를 연결하고, 시민 입구 `X-Team-Key`와 구분한다. R02 B14의 검색 주소는 팀 n8n 내부 네트워크에 맞게 확인한다.
5. n8n UI에서 `dubakwi-index`의 Manual Trigger를 수동 실행한다. 전체 노드가 성공하는지와 실행 기록을 확인한다. 실제 지식은 승인 대기이므로 해당 파일의 교육용 demo 스냅샷만 사용한다. 실행은 실제 임베딩 API 비용을 발생시킨다.
6. 같은 n8n 프로세스의 검색 워크플로우에 인증된 내부 요청을 보내 준비 상태와 공개 검색 결과·권한을 확인한다. 시민은 restricted 문서 ID·본문·sources·canary 비노출, 담당자는 제한 문서 양성 검색을 확인한다. 테스트에 실제 개인정보를 넣지 않는다.
7. n8n 재시작 후 검색이 `index_not_ready`인지, 다시 색인한 뒤 정상 검색이 복구되는지 확인한다. 시작·종료 시각, 커밋/JSON 해시, n8n/모델 버전, 실행 결과와 실패를 가려 기록한다. 공개 결과에 비밀·원문 실행 로그를 넣지 않는다.

**중요:** 저장소의 Manual Trigger를 UI에서 실행한 결과가 서비스 Webhook 검색과 같은 메모리를 공유하는지 지금까지 확인하지 못했다. CLI `n8n execute` 별도 프로세스 결과를 공유 성공으로 취급하지 않는다. VM 실행 방식이 멀티 프로세스/queue라면 Simple Vector Store 공유 보장이 없으므로 동작 확인 전 연결하지 않는다. 색인과 검색이 겹치거나 색인 동시 실행되지 않도록 운영한다.

## 3. 확인해야 할 권한 사례

| 사례 | 요청 주체/조건 | 기대 결과 | 현재 상태 |
| --- | --- | --- | --- |
| 시민 | citizen-a, 서버가 public으로 확인 | 공개 자료만 검색, 제한 ID·본문·출처·canary 0 | 내부 모의 요청 확인; 서버→B05→RAG 미실행 |
| 허용 담당자 | support/security, 서버가 public+restricted 부여 | 공개·제한 범위 검색 가능 | 내부 모의 요청 확인; 서버 종단 미실행 |
| 권한 일부 | 담당자에게 public만 전달 | 공개 자료만 검색 | 구현 조건 확인; 팀 사용자 종단 미실행 |
| 미등록 | unregistered-zz | B05에서 unknown_user/400, 제한 검색 없음 | P09 fixture 제안; 팀 API 종단 미실행 |
| 조회 장애 | 사용자 조회 5xx·응답 오류 | B05 user_lookup_error/503, 제한 검색 없음 | 팀 환경 미실행 |
| 문의 소유권 | 다른 시민 소유 티켓 | 문서 검색 권한과 별도로 본인 조회를 거절 | R04/R02/R05 종단 미실행 |

## 4. PostgreSQL 경계

사용자 계획은 향후 Docker 기반 PostgreSQL에 RAG 데이터를 저장하는 것이다. PR #18은 request_state·dead_letters 준비이며 RAG 벡터 저장 구현이 아니다. pgvector·3,072차원 인덱스·권한 필터·볼륨·백업/복구는 별도 설계·환경 검증이 필요하다. 현재 이 절차는 Simple Vector Store 교육용 시연 기준이다.

## 5. R01·R05의 VM 준비 및 부분 시험 공유

- R01의 PR #12는 기존 VM을 보존하면서 P11을 게시한 준비·관측 기록이다. R05가 공유한 검토에서는 내부 HTTP·외부 HTTPS의 입력·인증 부분 시험 10건과 저장된 실행 6건, B04/M01 미실행, B35 메타 기록 실패 6건을 구분했다. 이는 RAG 검색·임베딩 또는 전체 서비스의 성공 근거가 아니다.
- R05는 data-api 연결 후 WF-08·WF-13a·WF-13c를 별도 실행하고, 미등록 사용자 WF-13b도 실행할 계획이라고 밝혔다. 시험 이름과 응답 시간 해석에 관한 두 정리 의견은 PR #12 담당 범위다.
- R01과 VM Credential 준비 후 Manual Trigger 색인과 Webhook 검색의 메모리 공유를 먼저 확인하고, 재시작·재색인은 시점을 맞춰 검증한다. RAG PostgreSQL 벡터 전환은 R04의 상태·DLQ DB 작업과 별도로 진행한다.
