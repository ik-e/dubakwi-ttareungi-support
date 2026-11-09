# 로컬 전체 회귀 및 문서·공개 후보 검사

- 실행 ID: `20261108-123600-local-final-regression` (KST)
- 실행 시각: 2026-11-08 12:36–12:38 KST
- 기준 코드: main `dd919d7`; 현재 작업 트리의 문서/감사 도구 변경 포함
- 환경: 로컬 Windows, 잠금 uv 환경, Node.js
- 범위: scripts/test 전체 unittest, Ruff, 문서 링크, 공개 후보 검사
- VM·Discord·Jira 요청: 0. Discord에서 시작한 미지원 문의는 필수 입력란 오류로 제출하지 않아 실행에 포함하지 않음.

## 결과

| 검사 | 결과 | 범위/한계 |
|---|---:|---|
| Python unittest | 148 실행, 141 통과, 7 생략, 실패 0 | 내부 RAG key/endpoint가 필요한 HTTP 실연동 7개 생략 |
| Ruff lint | 통과 | Python lint |
| Ruff format | 통과, 203 파일 | 포맷 검사 |
| 문서 검사 | 통과, 23개 문서·841 링크·58 앵커·오류 0 | 외부 링크·Mermaid·의미 검증 제외 |
| 공개 후보 검사 | 통과, 후보 599·tracked 580·ignored tracked 0·공개 링크 1227·오류 0 | Git 이력·원격·모든 개인정보 유형·라이선스 보장은 아님 |
| Node 지원/상태/DLQ/error 계약 | support skeleton 157/157, P12 6개 스크립트, P12 Jira 흐름 21 시나리오, 반복 handoff 7/7, P18 7/7, P20 16건, R04 parity 8/8, TC-07 계약 25+3+6+37건 통과 | 실제 Jira/Discord/DB 상태 변경이나 전체 VM 고장 복구는 아님 |
| 로컬 P19 contract/AUTH fixture | Begin fixture 3개, AUTH fixture 7/7 통과 | 실제 API/RAG 권한 종단 아님 |
| Verifier boundary | 7/7 통과 | mock Code 입력, 실제 LLM 아님 |

로컬 전체 자동 회귀와 정적 문서 검사는 통과했다. VM 통합·전체 사용자 시나리오 통과를 뜻하지 않는다. 7개 RAG HTTP 실연동, 16개 live search matrix, 담당자 직접 열람/수신, TC-07 recovery action, TC-15 VM 종단은 별도 상태로 남는다. 재색인·workflow 게시·DB/Jira 변경은 하지 않았다.

결과 문서 동기화 뒤 최종 정적 재검사: 문서 23개·로컬 링크 844·앵커 58·오류 0, 공개 후보 600개·tracked 580·ignored tracked 0·로컬 링크 1230·오류 0. `git diff --check` 통과(CRLF 정규화 경고만 표시).

기존 VM 근거는 [PR36 통합](../20261107-170503-vm-pr36-integration/report.md), [TC-07 조회](../20261108-101605-vm-tc07-dlq-lookup/report.md), [Discord UAT](../20261108-121900-vm-discord-uat-followup/report.md), [RAG 대조](../20261108-122400-vm-rag-readiness/report.md)를 참조하며 이번 실행 통과 수에 더하지 않는다.
