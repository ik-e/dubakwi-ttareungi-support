# RAG·권한 로컬 계약 표적 검증

- 실행묶음 ID: `20261107-204523-local-rag-contract` (2026-11-07 KST)
- 환경: 로컬 Windows, uv 잠금 Python 환경, Node.js
- 목적: VM 호출 없이 현재 저장소의 RAG artifact·지식 경계·지원 workflow Code 권한 경로 검증
- 범위: 로컬 자동 시험만 실행. 실제 VM n8n·벡터 저장소·OpenAI 호출 없음

## 결과

| 검증 | 결과 | 확인 범위 |
| --- | --- | --- |
| `test_n8n_rag_artifacts.py` | 4/4 PASS | 비활성·credential-free RAG demo workflow, public/restricted partition, 검색 내부 인증, 인덱스 building/ready 마커와 generation 확인 |
| `test_prepare_rag_chunks.py` | 7/7 PASS | manifest/hash 검증, 승인/데모 경계, public→restricted 경로 거부, 실제 corpus의 security guidance/canary 접근 수준 |
| `test_rag_local_evaluation.py` | 2/2 PASS | 오프라인 lexical fixture에서 citizen restricted 차단, support 접근, 잘못된 role/query 거부 |
| `p19-shared-contract-cases.js` | 10/10 fixture PASS | 동일 producer/consumer fixture 3개, 실제 support B05→B13→RAG Validate Code를 읽어 실행한 AUTH-01~07 fixture |

## 판정과 한계

총 23개의 표적 로컬 검사/fixture가 통과했다. 이 결과는 구현된 공개 계약과 fixture에서의 역할 필터·권한 전달을 뒷받침한다. 실제 user identity API, n8n 배포 workflow, 벡터 저장소 반환 근거, 실제 restricted canary 차단, 답변 인용 일치, 검색 지연/고장 종단은 이번 시험에서 호출하지 않았으므로 미검증이다. Support HTTP harness는 mock server response를 사용하며 API key/실사용자 인증을 검증하지 않는다.

7개의 로컬 RAG HTTP integration test는 이 실행에 포함하지 않았다. 해당 시험은 실행 중인 search webhook, `DUBAKWI_INTERNAL_KEY`, OpenAI API credit을 사용한다고 시험 모듈에 명시돼 있다. 비밀을 주입하거나 유료 외부 호출을 발생시키지 않았다. 기존 148개 Python 시험 집계에서 이 7개가 생략된 상태도 바꾸지 않는다.

## 재현

```powershell
uv run --locked python -m unittest discover -s scripts/test -p test_n8n_rag_artifacts.py -v
uv run --locked python -m unittest discover -s scripts/test -p test_prepare_rag_chunks.py -v
uv run --locked python -m unittest discover -s scripts/test -p test_rag_local_evaluation.py -v
node scripts/test/p19-shared-contract-cases.js
```
