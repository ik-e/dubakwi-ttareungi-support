# R03 로컬 RAG 인계 메시지 초안

## R01에게

```text
R03 로컬 RAG 색인·검색과 복구 시험을 진행했습니다. OpenAI 임베딩과 n8n 메모리 저장소로 교육용 문서를 검색했고, n8n을 재시작하면 재색인 전까지 검색을 막도록 했습니다. 팀 VM 배포와 실제 기관 자료 승인은 아직 하지 않았습니다.

P11의 첫 WF08·WF13 입구 시험은 RAG를 기다리지 않아도 됩니다. P11은 RAG를 호출하지 않는 mock 골격이며 P19는 P11 배포 대상이 아닙니다. VM 연결 전에는 최종 P11 커밋·파일을 다시 확인하고 n8n 버전과 같은 프로세스에서 색인·검색이 실행되는지, 내부 검색 주소와 별도의 X-Internal-Key Credential을 확인해야 합니다. 현재 메모리 저장소는 프로세스를 나누면 공유되지 않을 수 있습니다. 설정과 시험 방법은 docs/rag-knowledge/local-n8n-runbook.md에 정리했습니다.
```

## R02에게

```text
R03 검색 API를 로컬에서 시험했습니다. POST /webhook/dubakwi-search에 내부 인증 X-Internal-Key를 사용하고, request_id와 ok/empty/skipped/error 및 근거 필드를 반환합니다. 검색 결과의 본문에는 [실제 안내] 또는 [가상 설정]이 들어갑니다.

P11은 RAG를 호출하지 않는 mock이며, P19는 P11 배포 대상이 아닌 것으로 이해했습니다. r02/p19-support-flow의 B14 노드만 분리해서 연결해 봤습니다. 제 로컬 환경에서는 localhost가 IPv6(::1)로 연결돼 실패했고 127.0.0.1로 바꾸자 HTTP 200과 동일 request_id, 검색 근거가 반환됐습니다. 팀 환경에서는 실제 n8n 주소로 설정 부탁드립니다. B14만 시험한 것으로 전체 상담 흐름의 통합 성공은 아닙니다.
```

## R04에게

```text
R03은 검색 전에 public과 restricted를 분리했습니다. 로컬 모의 시험에서 시민 public만, 담당자 public+restricted가 검색됐고 시민 응답에서 제한 문서 표시 문자열은 보이지 않았습니다.

현재 검색은 인증된 내부 호출자가 전달한 access_levels를 신뢰합니다. 실제로는 R04의 서버 사용자 조회 결과를 R02가 전달해야 합니다. 질문에 적은 역할이나 Discord 표시 이름으로 권한을 주지 않는 연결을 함께 확인 부탁드립니다. P09의 시민 public, 담당자 public+restricted 기준을 반영했습니다. citizen-a의 T-DEMO-01·case-a-closed와 citizen-b의 T-DEMO-02·case-b-open은 문의 소유권 시험이고 문서 검색 권한과는 별개로 확인해야 합니다. 부서(dept)만으로 restricted를 임의 부여하지 않고 서버 허용 매핑을 확인하는 방식을 제안합니다. 아직 실제 data-api 사용자 조회와 연결 시험은 하지 않았습니다.
```

## R05에게

```text
R03 로컬 검색 API에서 QR·반납·환불·보안 질문과 WF03 해외 이용 질문을 시험했습니다. WF03은 현재 empty입니다. 시민 검색에서 제한 canary는 발견되지 않았고, 담당자 모의 검색에서는 restricted 문서를 확인했습니다.

R02 B14 노드 단독 연결은 확인했으나 R02 전체 흐름, R04 사용자 조회 및 공식 시험은 아직입니다. R04가 공유한 citizen-a/T-DEMO-01·case-a-closed, citizen-b/T-DEMO-02·case-b-open의 소유권과 최종 사례 기대값도 확인 부탁드립니다. 검색 점수 0.30은 이 사례들에 맞춘 임시값이므로 추가 사례로 함께 확인하고 싶습니다. 실행 방법은 docs/rag-knowledge/local-n8n-runbook.md입니다.
```
