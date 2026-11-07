# PR36 전체 사례 실행기 재점검

- 실행 시각: 2026-11-07 21:17 KST
- 환경: local, 실행 옵션 경로 `mock`
- 사례: common 17, team 11, team-extended 13, search 16, p11-entry 3 (총 60)
- 코드: Git HEAD `6f9561bae48ad5da44b726f95c18d29024ba0d0d`, dirty worktree

## 결과

`scripts/test/run_cases.py`가 전체 60개 사례 명세를 로드했다. common 파일의 선행 초기화 `/tickets-reset`가 `http://localhost:8800`에서 응답을 받지 못해 파일 단위 before hook이 실패했다. 이에 파일 내 시나리오와 이어지는 전체 사례가 `blocked`로 기록됐다. 집계는 normal 43, failure_handling 16, recovery 1 전부 blocked이며 workflow 요청 응답·업무 동작은 실행되지 않았다.

이번 실행은 mock 종단 PASS도 실제 workflow 회귀도 아니다. `path: mock`은 실행기에 전달한 티켓 경로 라벨이며 서비스 연결을 증명하지 않는다. 가린 원 실행기 출력은 [summary.json](summary.json)에 보존했다. 초기화 API와 workflow webhook이 준비된 격리 시험 환경에서 재실행해야 한다.

## 부작용

초기화 실패 뒤 사례 요청은 전송하지 않았다. Jira, Discord, n8n workflow, 업무 DB/DLQ에 신규 변경을 만들지 않았다. 이전 사례 기대값과 실행 결과는 수정하지 않았다.
