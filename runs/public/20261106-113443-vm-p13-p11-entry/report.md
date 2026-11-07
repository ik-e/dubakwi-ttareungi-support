# P13 VM P11-01 등록 사용자 골격 응답 (R05)

- 실행일: 2026-11-06 KST. 실행·판정 R05. 대상은 VM에 게시된 P11 골격이다(main `0e44fdb`의 `workflows/dubakwi-support.json`, n8n 2.42.6). 실행 직전 n8n에서 게시된 support가 `dubakwi-support` 하나(P11)임을 확인했다.
- 설정 버전: `20261105-164023-vm-p13-citizens`. R01이 VM 강의 data-api에 citizen-a/b/c 호환 데이터를 넣은 설정이다(브랜치 `r01/p13-vm-citizens`).
- 시험 도구: `scripts/test/run_cases.py`, 브랜치 `r05/p07-r04-contract-cases` 커밋 `3e49c9a`. VM 안의 별도 사본에서 실행했다. 옵션은 `--no-hooks --check-logs --auth-required --path mock`이다.
- 사례: [cases/p11-entry.json](../../../cases/p11-entry.json)의 P11-01. 파일 해시는 `869c3814…`다.
- 저장: VM 화면의 한 줄 JSON을 옮겨 같은 형식으로 복원했다. 저장 파일 SHA-256 `8a06bca1c277ffd51bf2c4902a7a563149bb38b4f7dc97aadf71d4041cee96df`가 VM 원본 `sha256sum` 값과 같다.

## 1. 결과

| 항목 | 결과 |
| --- | --- |
| 응답 | HTTP 200, route=담당자 이관, reason=skeleton_mock, ticket=null, sources 0건, 1.8초 |
| 자동 판정 | 응답 칸 5개, G01·G02·G03·G06(25초 상한), B35 로그 L01~L03 모두 통과. 자동 결과 `auto_pass_unverified` |
| n8n 실행 #253 (수동) | B01→B02→B03→B04→B05→B06(true)→M01→B33→B35→B36. 사용자 조회(B04)가 등록 사용자를 찾아 골격 mock(M01)까지 진행 |
| LLM·티켓 호출 | 0. P11에 LLM·티켓 노드가 없고 M01은 골격 응답만 만든다 |
| 안내 문구 (수동) | "골격 시험 응답이며 실제 문의 접수·티켓 생성·담당자 이관은 이루어지지 않았다"는 취지. 업무 성공을 주장하지 않음 |

- 자동 결과의 열린 항목 두 개를 닫는다. n8n 실행 경로는 위 실행 #253으로 확인했다. B35 로그는 L01~L03 자동 판정 통과로 확인했다. 따라서 R05 판정은 **P11-01 통과**다.
- 2026-11-05 R05 실행 #51(WF13b 미등록 사용자)은 B06 false로 M01을 건너뛰었다. 이번 실행은 같은 경로에서 등록 사용자일 때 true로 가는 것을 보여 준다.
- 같은 사용자 조회 경로를 R01이 실행 166에서 먼저 확인했다(R01 연결 확인). 이 기록은 그와 별개인 R05 공식 판정이다.

## 2. 범위와 한계

- P11 골격의 입구 시험이다. 실제 접수·Jira·state·DLQ·P19 업무 성공이 아니다. P19 게시 후에는 이 사례를 쓰지 않는다.
- 사용자 공급은 강의 data-api 호환 데이터다. 팀 형식 사용자 API와 담당자 restricted 공급은 범위 밖이다.
- 응답 시간 1.8초는 성능 측정이 아니다.
- 원시 결과(답변 원문 포함)는 VM에만 보존한다. 실행 화면 캡처는 주소·워크플로우 ID를 가려 저장소 밖에 보관한다.
