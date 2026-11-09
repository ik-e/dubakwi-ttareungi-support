# 로컬 1단계 회귀·준비도 실행 결과

- 실행 ID: `20261108-115900-local-phase01-regression` (KST)
- 기준 커밋: `dd919d709649171336f13a29a0306fae4da702f2` (`main`/`origin/main`)
- 환경: 로컬 Python/Node·모의 Code 입력·오프라인 RAG fixture. VM, Jira, Discord, n8n 또는 DB 실호출 없음.
- 결과: 로컬 검사 통과, 실제 통합 시험은 선행조건 차단. 전체 시스템 통과를 뜻하지 않음.

## 실행 결과

| 검사 | 결과 | 범위와 한계 |
|---|---:|---|
| Python unittest | 148 실행: 141 통과, 7 생략, 실패 0 | `DUBAKWI_INTERNAL_KEY`와 로컬 search endpoint 미설정으로 RAG HTTP 7개 생략 |
| Ruff | check/format 통과 | 199 Python 파일 format 확인 |
| Support skeleton | 157/157 | 로컬 Code 사례, 실제 webhook/LLM/Jira/DB 아님 |
| Verifier boundary | 7/7 | mock 입력, 실제 LLM 아님 |
| P12 | 6개 스크립트 통과 | Jira flow 21 시나리오, 반복 handoff 7/7 포함 |
| P18/P19/P20 | DLQ marker 7/7; shared contract begin 3·AUTH 7; error 16건 통과 | mock/fixture 계약 |
| TC-07 로컬 계약 | operator 25, finish capsule 3, handoff capsule 6, lookup workflow 37, parity 8 모두 통과 | 운영자 recovery action VM 실연동 아님 |
| coverage 계획 감사 | 64 requirement ID, 12 package 연결 확인 | 정적 계획 검사이며 runtime 0건 |
| 전체 사례 dry-run | 60개 중 46 요청 준비, 13 차단, 1 미구현 | 실제 요청 0건. 상세 무전송 결과는 `runs/20261108-115900-local-phase01-regression/all-cases-dryrun.log` |
| 오프라인 RAG demo | pending manifest에서 44 chunk (실제 안내 24, 모의 20) | explicit demo fixture·lexical retrieval. 9개 expected document match, SR-WF03 expected-empty가 lexical false positive 1건, exact-document 기대가 없는 candidate 5건, OFF 1건. API/authorization/citation 종단 아님 |

## 감사 하네스 수정 및 재검증

`audit-parallel-contract.js` 최초 실행은 A02/A03 두 gap을 보였으나, 실제 workflow B11/B25가 기대하는 `handed_off_followup`을 probe context에 넣지 않은 하네스 오류였다. 모의 입력을 손으로 조립하는 대신 실제 B08 Code node로 문맥을 만들도록 시험 하네스를 수정하고 재실행해 10/10 통과했다. Support/Handoff 업무 workflow JSON은 변경하지 않았다. 최초 로그와 재시험 로그는 비공개 실행 폴더에 각각 보존했다.

## VM 통합 판정

- 브라우저 확장/브로커는 연결 상태였지만 허용 탭 목록은 Gemini 1개뿐이며 `aio-t2 SSH` 탭은 포함되지 않았다. CUA URL 정책기가 VM 페이지 URL을 확인하지 못해 셸 접근을 시도하지 않았다. 이는 로그인·비밀번호 실패 증거가 아니다.
- 기존 VM snapshot은 참고 기준으로 유지하며 이번 실행에서 갱신하지 않았다.
- 현재 knowledge manifest는 `proposed_not_approved`; PR36 memory index의 현재 population/version은 미확인이다. 게시되지 않은 index workflow를 통한 VM 재색인은 하지 않았다.
- 그러므로 VM 검색·Discord/Jira 잔여 UAT·담당자 직접 처리·TC-07 full recovery·TC-15는 이번 실행에서 미실행/차단이며 PASS로 계산하지 않는다.
- 부작용: VM 요청 0, DB 쓰기 0, Jira 쓰기 0, Discord 전송 0.

## 상세 로그

비공개 원시 출력과 케이스 질의는 Git 제외 `runs/20261108-115900-local-phase01-regression/`에 보관한다. 이 요약에는 질의 전문·credential·외부 식별자를 포함하지 않는다.
