# 실행 기록 정정

`summary.json`은 원본 보존을 위해 수정하지 않는다.

`scope`의 "search는 mock"과 `not_executed`의 "실제 지식 검색"은 도구에 고정된 문구로 이 실행과 맞지 않다.
로컬 n8n 실행 기록상 이 실행의 검색은 R03 `dubakwi-search`(`25a178a`)였다.

- 범위: R05 `5ffe05e` 사례 27개 중 19개, 사례별 3회
- 제외: WF-04·09·10·11, TC03a·b·c (고장 주입 또는 실제 저장 필요)
- 구성: state·handoff·dlq는 mock, 사용자는 과정 data-api 직원으로 대체, 색인은 Webhook 트리거 사본
- 공식 WF 판정이 아니다.

같은 날 `20261104-162058-local-n8n-p19-r03-search-first`와 `-second`의 scope도 같은 오류가 있다.
`20261104-161956-local-n8n-p19-r03-regression`은 시험용 mock 검색이 맞다.
도구는 이후 `--search-source`를 필수로 받아 기록한다.
