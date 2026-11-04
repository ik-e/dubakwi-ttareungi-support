# 로컬 n8n RAG 실행 및 인계

작성: 2026-11-04 · R03 · 교육용 자료와 로컬 시험 기준. 운영 배포나 실제 기관의 승인으로 해석하지 않는다.

## 준비와 실행

1. n8n 1.120.4에서 `workflows/dubakwi-index.json`과 `workflows/dubakwi-search.json`을 가져온다. 두 파일은 기본적으로 비활성이고 Credential ID가 없다.
2. 두 워크플로우의 Embeddings에 로컬 OpenAI Credential을 연결한다. 모델은 `text-embedding-3-large`다. 검색 Webhook에는 별도의 Header Auth Credential을 지정하고 헤더 이름을 `X-Internal-Key`로 설정한다. 키 값은 저장소나 공개 문서에 넣지 않는다.
3. 지식 문서나 manifest가 바뀐 경우 `python scripts/dev/refresh_demo_index.py`로 명시적인 교육용 스냅샷을 갱신하고 색인 워크플로우를 다시 가져온다. 이 명령은 해시와 권한을 확인하지만 승인 대기 문서를 승인하지 않는다.
4. 검색과 색인은 **같은 n8n 실행 프로세스**에서 돌린다. 색인 워크플로우를 실행해 끝까지 성공시킨 후 검색을 사용한다. 로컬에서는 같은 서버의 별도 시험용 Webhook으로 색인했다. 저장소의 수동 트리거를 UI에서 실행했을 때도 같은 메모리를 쓰는지는 아직 확인하지 않았다. 서버와 별도로 실행한 `n8n execute` CLI의 Simple Vector Store는 서버에서 공유되지 않는다. 프로세스가 여러 개인 queue/worker 구성에서도 공유 여부가 검증되지 않았다.
5. 검색 워크플로우 활성화 후 내부 호출자가 `POST /webhook/dubakwi-search`로 요청한다. 시민 입구의 `X-Team-Key`와 구분한다. 검색이 꺼졌으면 `skipped`, 근거가 없으면 `empty`, 색인 준비 전이나 오류가 있으면 `error`를 반환한다.
6. 로컬에서 `DUBAKWI_INTERNAL_KEY` 환경변수에 시험 키를 넣고 `python scripts/test/test_n8n_rag_http.py`를 실행한다. 실제 OpenAI 임베딩 호출이 발생한다. 출력·문서에 키를 넣지 않는다. 키가 없으면 시험은 건너뛴다.

## 준비 상태와 복구

색인을 시작하면 준비 상태를 building으로 바꾸고, 모든 청크가 삽입된 후 같은 세대의 ready로 바꾼다. 검색 전후 상태와 세대를 확인하므로, 색인이 시작됐거나 중간에 실패했거나 검색 중 세대가 바뀌면 `index_not_ready`로 처리한다. 재시작 후 메모리는 사라지며 재색인 전에는 `index_not_ready`가 반환된다. 재색인에 성공하면 검색을 다시 사용할 수 있다.

동시에 여러 색인 작업을 실행하지 않는다. 동시 색인 간 잠금, 다중 프로세스·다중 서버에서의 상태 공유, 실제 장애 주입과 VM 복구는 검증되지 않았다. Simple Vector Store에는 실제 민감 정보를 넣지 않는다.

## 실제 로컬 시험과 한계

- Header Auth 누락은 HTTP 403, 검색 비활성은 `skipped`, 잘못된 권한 입력과 만료된 요청은 `error`였다.
- 색인 전·재시작 후에는 `index_not_ready`; 색인 중 동시 요청도 이 오류를 반환했다. 완료 뒤 검색이 다시 가능했다.
- 시민 QR 질문에서 `rental-guide`, 환불에서 `fees-refund-guide`, 반납에서 `return-guide`, 보안에서 `privacy-security-guide`가 우선 검색됐다. 해외 이용 WF03은 `empty`였다. 시험용 점수 기준 0.30은 이 사례들에 맞춘 임시값이므로 더 많은 사례로 평가해야 한다.
- 시민 요청에는 public만, 담당자 모의 요청에는 public과 restricted가 반환됐고 시민 응답에서 제한 canary는 발견되지 않았다. 이는 내부 인증키가 있는 시험 호출 결과이지 R04의 실제 사용자 조회·Discord 인증 결과가 아니다.
- R02 `r02/p19-support-flow`의 B14 노드를 분리해 로컬 검색 API에 연결했으며 HTTP 200, 동일 request_id, `ok`와 근거 5건을 확인했다. 이 시험에서 R02 노드의 `localhost`가 IPv6 `::1`로 해석됐고, 로컬 서버는 `127.0.0.1`에서만 들어서 연결이 거절됐다. 시험용 노드의 주소를 `127.0.0.1`로 바꾸자 성공했다. 팀 VM에서는 실제 배포망 주소를 확인해야 한다. R02 전체 흐름, R04 data-api와 R05의 공식 판정, VM은 미실행이다.
- 제한 문서 검색 전에 권한 수준을 선택하지만 access_levels 자체는 인증된 내부 호출자를 신뢰한다. 사용자에게 직접 이 내부 키를 제공하거나 질문에 적은 역할을 신뢰해서는 안 된다.

로컬 전용 색인 Webhook 시험본에서 준비 상태를 `building`으로 바꾼 직후 강제로 오류를 발생시켰다. n8n 실행 기록은 실패였고 검색은 `index_not_ready`를 반환했다. 이후 정상 재색인하고 HTTP 시험 6건이 다시 통과했다. 이 시험은 OpenAI 장애나 디스크 장애의 실제 주입 시험을 대체하지 않는다.

주의: 이 로컬 전용 색인 Webhook 시험본은 강제 실패 시에도 HTTP 상태 200을 반환했다. HTTP 상태만으로 색인 성공을 판정하지 말고 성공 본문 `{"status":"indexed"}`과 n8n 실행 성공 상태를 함께 확인해야 한다. 저장소의 색인 워크플로우는 수동 트리거이며 이 Webhook 시험본과 다르다.
