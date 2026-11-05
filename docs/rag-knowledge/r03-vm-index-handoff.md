# R03 VM 색인·권한 인계

2026-11-05 · 대상 R01/R02/R04/R05. 이 문서는 실행 절차와 인계 조건이다. VM에서 관측한 부분 시험과 아직 확인하지 않은 재시작·인가 시험을 구분한다.

## 1. 지금 확인한 내용

- PR #10은 `main`에 병합됐다(0e44fdb). 로컬 n8n 1.120.4에서 교육용 지식과 OpenAI `text-embedding-3-large`·Simple Vector Store의 색인·검색을 시험했다. 팀 VM에서 R01이 원본 수동 색인과 검색을 확인했다. 자세한 결과와 범위는 6절을 참고한다.
- PR #17 `c0be214`의 모의 사용자는 citizen-a/b/c `public`, support-demo/security-demo `public`+`restricted`다. 팀 형식 사용자 API 서버·VM 주소·인증 및 실제 사용자 조회→B05→RAG는 미완료다. P11은 담당자의 restricted가 선택이므로 public만 온 담당자는 public만 검색한다.
- RAG는 내부 인증된 호출자의 `access_levels`를 받아 public/restricted 저장 공간을 검색 전에 선택한다. 호출자가 값을 서버 확인 결과로 만드는지는 R02/R04가 연결해야 하며 RAG만으로 실제 사용자 인가가 완료되지는 않는다.

## 2. VM에서 수동 색인할 절차 (일부 VM 확인, 재시작 검증 전)

1. R01이 검토한 `main` 커밋과 VM의 n8n 버전·실행 방식·네트워크, 실행 기록 접근 및 기존 볼륨·백업을 확인한다. 기존 서비스나 데이터를 초기화하지 않는다.
2. `workflows/dubakwi-index.json`, `workflows/dubakwi-search.json`을 팀 VM n8n에 가져온다. 가져오기 경로의 정확한 절차는 VM 버전/강의 도구의 실제 지원 여부를 확인한다.
3. 색인·검색 각각의 `Embeddings` 노드에 팀 환경에서 허용된 OpenAI Credential을 명시적으로 연결한다. Credential은 같은 종류의 다른 값에 자동 연결될 수 있으므로 이름뿐 아니라 선택된 실제 항목을 확인한다. 키를 Git·공개 기록·채팅에 적지 않는다. 개인 키를 팀 VM에 복사한다고 가정하지 않는다.
4. 검색 Webhook에 팀 내부 전용 Header Auth `X-Internal-Key`를 연결하고, 시민 입구 `X-Team-Key`와 구분한다. R02 B14의 검색 주소는 팀 n8n 내부 네트워크에 맞게 확인한다.
5. n8n UI에서 `dubakwi-index`의 Manual Trigger를 수동 실행한다. 전체 노드가 성공하는지와 실행 기록을 확인한다. 실제 지식은 승인 대기이므로 해당 파일의 교육용 demo 스냅샷만 사용한다. 실행은 실제 임베딩 API 비용을 발생시킨다.
6. 같은 n8n 프로세스의 검색 워크플로우에 인증된 내부 요청을 보내 준비 상태와 공개 검색 결과·권한을 확인한다. 시민은 restricted 문서 ID·본문·sources·canary 비노출, 담당자는 제한 문서 양성 검색을 확인한다. 테스트에 실제 개인정보를 넣지 않는다.
7. n8n 재시작 후 검색이 `index_not_ready`인지, 다시 색인한 뒤 정상 검색이 복구되는지 확인한다. 시작·종료 시각, 커밋/JSON 해시, n8n/모델 버전, 실행 결과와 실패를 가려 기록한다. 공개 결과에 비밀·원문 실행 로그를 넣지 않는다.

**중요:** R01의 단일 VM 실행에서는 저장소 Manual Trigger 색인과 Webhook 검색 간 메모리 공유가 관측됐다. 이 결과를 재시작 후 또는 다른 실행 구성의 공유 보장으로 확대하지 않는다. CLI `n8n execute` 별도 프로세스 결과를 공유 성공으로 취급하지 않는다. VM 실행 방식이 멀티 프로세스/queue라면 Simple Vector Store 공유 보장이 없으므로 동작 확인 전 연결하지 않는다. 색인과 검색이 겹치거나 색인 동시 실행되지 않도록 운영한다.

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
- R01이 VM에서 Manual Trigger 색인과 Webhook 검색의 메모리 공유를 확인했다. 재시작·재색인은 R01과 시점을 맞춰 검증한다. RAG PostgreSQL 벡터 전환은 R04의 상태·DLQ DB 작업과 별도로 진행한다.


## 6. R01의 VM 실행 결과 (2026-11-05)

[R01 PR #20](https://github.com/ik-e/dubakwi-ttareungi-support/pull/20)의 기록에 따르면 원본 Manual Trigger로 44청크를 색인하고 같은 VM 검색에서 실제 HTTP 7/7 및 HTTPS QR 검색을 확인했다. 이번 실행의 수동 색인→검색 메모리 공유는 관측됐지만, VM 재시작·동시 색인·다중 프로세스와 실제 서버 인가는 미검증이다. 이전 절의 실행 전제·미검증 문구는 당시 계획 기록이다.

최초 검색 404는 저장소 검색 JSON의 `webhookId` 부재로, VM 배포 사본에 환경별 ID를 추가한 뒤 재게시해 해결했다. 환경별 ID·비밀은 공개하지 않는다. data-api 공급과 실제 사용자 조회 연결은 후속 작업이며 PostgreSQL 벡터 저장은 상태·DLQ DB와 별도다. R02의 TC08 unknown_chunk는 답변 검증 실패 이관을 위한 mock 하위 기능 시험이며 RAG 검색·공식 판정 완료를 의미하지 않는다.


## 7. 강사 피드백: 재시작과 수동 복구 기준

- **현재 관측:** R01의 PR #20은 기존 VM을 재시작하지 않고 원본 Manual Trigger로 44개를 색인했으며 검색 HTTP 7개를 확인했다. 입력 10/10 및 RAG 검색 7/7은 해당 부분 시험 결과이며 공통 시나리오 전체 통과가 아니다.
- **재시작 전:** R01이 서비스 이용·시험 일정과 기존 n8n 볼륨·Credential 보존 및 백업 상태를 확인하고 재시작 시점을 조율한다. R03이 임의로 VM을 재시작하거나 색인하지 않는다.
- **재시작 직후:** 메모리 색인은 휘발성이므로 검색을 정상 사용 가능하다고 가정하지 않는다. 내부 인증 요청으로 `index_not_ready` 등 실제 상태를 관측한다. 아직 VM 재시작 시험을 실행하지 않았으므로 해당 결과는 기대값이다.
- **복구:** 승인 상태와 교육용 스냅샷, 선택된 OpenAI Credential을 확인하고 같은 n8n 서버의 `dubakwi-index` Manual Trigger를 한 번 실행한다. 실행 성공·전체 청크 삽입·Mark ready를 확인한 뒤 공개 검색 및 제한 비노출/허용 담당자 검색을 재확인한다. 실행 실패·ready 미확인 시 검색 복구 성공으로 기록하지 않는다. API 사용 비용이 발생할 수 있다.
- **실행 환경:** 최초 검색 404를 해결하기 위해 VM 게시 사본의 환경별 webhookId가 필요했다. 배포 시 내부 인증과 ID 연결을 확인한다. 별도 프로세스 CLI 실행, 여러 worker 또는 동시 색인의 메모리 공유·안전성은 미검증이다.
- **기록:** 실행 시간, 배포 커밋 및 workflow 해시, n8n 버전, 실행·재색인 결과와 검색 probe를 가린 증거로 남긴다. 인증값·환경별 ID·원문 로그는 공개하지 않는다. 재시작과 복구는 아직 미실행이다.
- **연결 선행 조건:** data-api 실행 원본·Compose·네트워크 및 사용자 공급은 R01/R04 준비가 필요하다. 연결 후 실제 사용자→B05→RAG 권한 전달과 R05의 공식 시험을 별도로 확인한다.


## 8. data-api 공급 이후 권한 검토 (2026-11-05)

PR #21이 main에 병합됐으며, R01의 `runs/public/20261105-114531-vm-course79-data-api/summary.json`은 과정 79일차 모의 data-api를 VM에 기동해 P11 입력 22/22, 로그 18건 저장 및 RAG smoke를 확인한 부분 시험을 기록한다. P11은 업무 응답 mock이며 전체 상담·공식 판정 완료가 아니다.

코드 계약 확인: P11/P19 B05는 팀 형식 `{id, role, access_levels}`에서 서버 ID 일치 및 역할별 권한을 검증한다. citizen은 public만, support/security는 public 필수 및 restricted 선택이다. 과정 형식 `{name, dept}`는 dept만으로 승격하지 않고 citizen/public으로 정규화한다. P19 B13은 검증된 `actor.access_levels`를 SearchRequest에 담고 B14가 검색 Webhook으로 전달한다. RAG는 public을 필수로 검사하고 restricted가 있을 때만 제한 저장소를 검색한다. 제한 근거도 반환 전 access_level을 재검사한다. 이는 코드·계약 점검이다.

중요: PR #21의 실제 VM은 과정 모의 data-api이며 증거상 과정 사용자들은 현 B05에서 citizen/public으로 정규화된다. R04의 citizen/support/security fixture와 records는 별도 통합 대기다. 따라서 VM data-api→B05→P19 B14→RAG의 담당자 restricted 경로, 시민 제한 비노출, 실제 사용자 신원 확인 및 소유권 종단 시험은 아직 확인되지 않았다. RAG는 내부 인증 호출자가 전달한 권한을 신뢰하므로 검색 Webhook과 내부 키를 시민에게 직접 노출하지 않는다.

PR #23의 PostgreSQL state·DLQ는 RAG 벡터 저장 구현이 아니며 해당 PR의 DB 연결이나 로컬 정적 검사도 위 인가 종단 시험을 대체하지 않는다.
