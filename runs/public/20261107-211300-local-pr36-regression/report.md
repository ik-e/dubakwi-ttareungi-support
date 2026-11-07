# PR36 로컬 회귀·문서 검사

- 실행 시각: 2026-11-07 21:13 KST
- 환경: Windows 저장소 worktree, 로컬 검사
- 기준: 브랜치 `r01/p26-final-closure`, HEAD `6f9561b`; 변경된 문서는 현재 worktree 내용
- 사례 범위: `scripts/test` Python unittest suite, 프로젝트 링크/앵커 검사, 공개 파일 후보 검사

## 결과

| 검사 | 결과 | 범위·한계 |
|---|---:|---|
| `uv run --locked python -m unittest discover -s scripts/test -p "test_*.py"` | 148개 실행, OK; 7개 skip | 로컬 단위·계약·모의 시험. 실제 VM/Jira/Discord 통과 아님 |
| `uv run --locked python -m unittest scripts/test/test_n8n_rag_http.py -v` | 7개 skip | `DUBAKWI_INTERNAL_KEY` 미설정으로 HTTP RAG 시험 미실행 |
| `uv run --locked python scripts/test/check_project_docs.py` | 22 files, 링크 679·앵커 57, 오류 0 | 문서 링크/앵커/표 검사만 수행 |
| `uv run --locked python scripts/test/check_public_files.py` | 504 files, 추적 476·ignored tracked 0, 공개 로컬 링크 1026, 오류 0 | 현재 후보 파일/공개 링크 검사. git history/외부 서비스는 검사하지 않음 |

## 판정

저장소의 로컬 회귀 및 문서 구조 검사는 통과했다. 이 결과는 VM PR36의 60개 사례, RAG HTTP 종단, Jira·담당자·Discord·DLQ 외부 효과를 검증하지 않는다. VM 종단 실행과 미실행 사유는 별도 결과서에 기록한다.
