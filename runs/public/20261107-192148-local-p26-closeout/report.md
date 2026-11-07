# P26 마감 검증 로컬 실행 · R01 관측

- 실행 묶음: `20261107-192148-local-p26-closeout` (KST)
- 환경: 로컬 Windows, Python 3.12.10, Node.js v24.22.1
- 소스 기준: 브랜치 `r01/p26-final-closure`, HEAD `6f9561bae48ad5da44b726f95c18d29024ba0d0d`
- manifest: [기준 코드·업무 산출물 해시](baseline-manifest.json) · [workflow/SQL/지식/시험 도구 SHA-256](artifact-hashes.json)
- 권한 범위: R01 로컬 실행 관측. 팀 역할의 최종 검토나 공식 전체 PASS를 뜻하지 않는다.

## 실행 결과

| 검사 | 결과 | 범위·한계 |
| --- | --- | --- |
| Support Code 흐름 회귀 | **157/157 통과**, 정적 실패 0 | [사례별 결과](support-skeleton.json). n8n 게시본·RAG·state/DLQ·Jira 실연동이 아닌 JS Code 노드 및 대체값 경로 |
| Python 단위/통합 도구 | **148개 실행, 성공, 7개 생략** | 생략 7개는 모두 `DUBAKWI_INTERNAL_KEY`가 필요한 로컬 RAG HTTP 시험. 비밀/실제 endpoint를 제공하지 않아 실행하지 않음. 상세 로그는 저장소 제외 경로 `runs/20261107-192148-local-p26-closeout/python-unittest.log` |
| Ruff lint | 통과 | 저장소 전체 `uv run --locked ruff check .` |
| Ruff format | 151개 파일 형식 통과 | `uv run --locked ruff format --check .` |
| 문서 링크/앵커 | 통과 | 22개 문서·633 로컬 링크·57 앵커, 오류 0 |
| 공개 파일/링크 경계 | 통과 | 482 후보·965 공개 링크, 오류 0. 검사 범위 밖의 과거 Git 이력·모든 개인정보 형태까지 보증하지 않음 |
| Diff 공백 검사 | 통과 | `git diff --check` |

## 기준선·의존성 관측

- 작업 트리에는 기존 계획/설계 동기화와 이 증거만 있다. 업무 workflow, Python 서비스, SQL migration, 지식 원본은 수정하지 않았다. 개별 SHA-256은 manifest를 따른다.
- 저장소 기준 코드 `6f9561b`와 직전 VM 통합 보고서가 시험한 업무 코드 `a657890`을 분리해 기록했다. VM 보고서의 업무 회귀는 실제 연결 증거지만, 이 실행에서 VM에 새로 접속해 현 상태·이미지 ID/다이제스트를 재확인하지 않았다.
- PR #49/#50 UX 구성의 VM 배포·실제 UX Jira/Discord 검증은 수행하지 않았다. UX 전체 실행과 결과는 계획상 R02 담당이다.
- 따라서 현재 실행은 로컬 핵심 회귀의 추가 증거다. 실서비스 종단, Jira 담당자의 실제 티켓 처리 후 시민 재조회, WF-11, TC-15, 고장 주입/DLQ 운영 경계의 마감 증거를 대체하지 않는다.

## 판정

로컬 자동 회귀와 저장소 정적 검사는 이번 기준 코드에서 통과했다. 외부 서비스·현재 VM을 실행하지 않았으므로 실연동 마감은 미판정이다. 최초 VM 통합 보고서의 WF-11/TC-15 미충족 및 TC-07 미구현 상태는 유지한다. 이후 실제 수정·재시험은 이 결과를 덮지 않고 별도 실행 ID로 기록한다.
