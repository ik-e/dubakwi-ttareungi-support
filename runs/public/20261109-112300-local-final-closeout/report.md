# P27–P31 최종 산출물 마감 기록

- 일시: 2026-11-09 KST. 실행묶음 ID는 마감 착수 시각 11:23 기준이다.
- 담당: R01 통합. 사용자의 기존 전체 마감 위임 및 이번 최종 제출 공간 정리 지시에 따라 진행했다. 타 역할의 미수신 승인을 기록하지 않는다.
- 소스 기준: 업무 코드 `main dd919d709649171336f13a29a0306fae4da702f2`. 마감은 문서·발표·검증 도구의 기존 수정 취합이며 서비스/VM 배포 변경은 없다.
- 구분: 기존 증거 재사용·로컬 산출물 검사·Jira read-only 관찰. 신규 시민 요청/고장 주입/Jira 쓰기/DB 변경은 0건이다.
- 보존: 로컬 `submission/revisions/20261109-1123-before-final-closeout`에 작업 전 제출 폴더·프로젝트 문서·현재 diff·수신 체크리스트를 백업했다. 팀원 원본·과거 JSON 해시는 변경하지 않는다.

## 1. 마감 범위와 결과

| 범위 | 결과 |
| --- | --- |
| 필수산출물 | 로컬 `submission/final/docs/`의 WORKFLOW-DESIGN·RAG-ARCHITECTURE·EXECUTION-RESULT를 제출용으로 재구성. 공식 8·5·6절과 원 체크리스트 15개 유지 |
| 근거 추적 | [60개 사례·64개 요구 근거표](evidence-matrix.md), [JSON](evidence-matrix.json). 모든 ID에 원 기대·관측·한계·증거 연결. 전체 실행 통과를 뜻하지 않음 |
| 실제 구현 목록 | [8개 JSON의 전체 노드·연결](workflow-map.md), [JSON](workflow-map.json). 로컬 파일 해시 포함, VM 전체 export 동일성 주장 없음 |
| 발표·메모 | 12장·20분 편성, 원본·상호작용 유지, 시연·최종 문서 링크·근거 범위 동기화 |
| 데일리·진입 문서 | README·DAY82·시험 계획·마감 상태·원장에 현행 판정과 확인 범위 반영 |
| 실제 제출 | 파일 정리·검사·Git 반영과 강사 제출·발표 수행을 구분. 외부 제출 수신·피드백은 미관측 |

## 2. Jira All 읽기 전용 확인

사용자가 큐의 범위를 전체로 바꾸고 이름을 All로 변경했다고 알렸다. 이후 열린 Jira 큐 UI에서 `All`, 필터 `project = JBYS ORDER BY "Time to resolution" ASC`, Done·In Progress·To Do 행을 함께 확인했다. 읽은 화면의 큐 수는 188이며 변하는 운영 수치이므로 시험 통과 수나 발표 성과로 사용하지 않는다. 이관·진행 중만 보이는 기존 미해결 큐 조건은 현재 설명에서 제외했다. 큐 설정과 티켓은 수정하지 않았다.

## 3. 사례·요구 판정의 범위

| 사례 분류 | 수 |
| --- | --- |
| PASS_SEARCH_SCOPE | 16 |
| PARTIAL_HISTORICAL_RESPONSE | 38 |
| FAIL_ORIGINAL_TIME_ASSERTION | 1 |
| NOT_IMPLEMENTED_RECOVERY_ACTION | 1 |
| BLOCKED_CURRENT_SPEC | 1 |
| NOT_RUN_FINAL_SCOPE | 3 |

공통 17행에서 WF09 두 행과 WF13 세 행을 각각 한 유형으로 묶어 14유형을 추적한다. 세부 assertion 수·검색16개·업무41개·리허설5개를 합산한 성공률은 만들지 않는다. 원 실패와 재시험 해시를 덮어쓰지 않았다. 요구의 PARTIAL_EVIDENCE는 원 완료 조건 중 확인한 범위만 의미한다.

## 4. 검증

| 실제 검사 | 결과 | 근거·범위 |
| --- | --- | --- |
| `uv run --locked python scripts/test/check_project_docs.py` | 23문서·986링크·66앵커, 오류0 | [결과](docs-final.json). 외부 URL·실행·Mermaid 렌더 제외 |
| `uv run --locked python scripts/test/check_public_files.py` | 당시 공개 후보664개·공개 링크1725개, 오류0 | [결과](public-final.json). 현 작업 파일/허용 목록·제한 비밀 패턴. 이후 검사 증거 파일 추가는 최종 staged 대조에서 확인 |
| `uv run --locked python scripts/dev/check_full_system_coverage.py` | 요구64개 구조 오류0 | [결과](coverage-final.json). 계획/fixture 구조이며 runtime 실행0 |
| `node scripts/dev/audit-parallel-contract.js .` | 10/10·구현 차이0·probe 오류0 | [결과](parallel-audit-final.json). B08 실제 문맥을 거친 모의 Code 입력으로 기존 probe 오류 수정 확인 |
| `node scripts/test/support-skeleton-cases.js` | 157/157·정적 오류0 | [공통 Code 회귀](support-code-regression.json). 외부 API/LLM/Jira/DB는 mock, 서비스 시험 아님 |
| 최종 문서·링크·해시 검사 | 23/23 | [최종 결과](artifacts-2026-11-09T03-07-08-541Z.json). 공식8/5/6절·체크15개·60/64근거·8개 JSON의 LF 정규화 해시·최종 문서/메모 링크 |
| HTML 발표 정적·DOM 검사 | 56/56 | 로컬 `checks/story-check-2026-11-09T03-01-49-343Z.json`. 원본11개·원문15문서 블록·PDF29쪽·R02 9시나리오·메모/이동/재생 보존 |

첫 공개 후보 검사에서 로컬 전용 발표·가이드로 향한 공개 Markdown 링크6개가 발견돼 경로 안내/공개 안내문으로 정정했다([최초 결과](public-first.json)). 당시 파일 내용은 작업 시작 백업에 보존했다. 문서 최종 검사 도구의 첫 두 실행은 원 가이드의 `#### 6.` 예시를 `## 6.` 체크리스트로 잘못 선택했고, workflow 해시의 CRLF→LF 정규화 규칙을 빠뜨렸다. 도구의 구간 선택/비교 규칙을 고친 뒤23/23을 확인했으며 원 문서·원 workflow·과거 해시를 바꾸지 않았다. [첫 결과](artifacts-2026-11-09T02-55-34-997Z.json), [두 번째 결과](artifacts-2026-11-09T02-56-11-130Z.json), [첫 통과](artifacts-2026-11-09T02-56-47-857Z.json).

`tscan`·`gitleaks` 실행 파일은 PATH에 없었다. 설치/실행한 것으로 쓰지 않고 공개 후보·기본 토큰 패턴 검사·staged diff를 대체 근거로 사용한다. 원본 PDF의 가린 실행 페이지13·14를 직접 읽고 제출용 이미지로 복사했으며 픽셀은 변경하지 않았다. 기존 후보 목록의 실행 PNG17개는 현재 원 경로에 없으므로 존재한다고 유지하지 않고 실제 보존 PDF 페이지2개로 출처를 명시했다.

발표의 원본 내용 블록은 그대로 두고, 읽기 화면에서 원 작성 위치가 바뀐 참조7개를 실제 canonical 자료로 연결했다. 보존 원본 자체의 상대 링크를 수정하지 않았으며 묶음에서 원본·날짜별 자료임을 구분한다. R02 원본 열기 경로에는 동일 바이트의 별칭 사본을 제공했다.

staged 후보 재검사는 668파일·1735공개 링크·오류0, 추적 제외 파일의 강제 추가0이었다. `git diff --name-only`가 비어 작업 파일과 index의 변경 누락이 없음을 확인했다. `git diff --cached --check`의 남은 두 경고는 기존 11/08 13:06·13:14 원 보고서 끝의 빈 줄뿐이다. 원 보고서 바이트/해시 보존을 위해 해당 두 파일을 수정하지 않았으며 그 두 경로를 제외한 diff 검사는 오류0이다. 새 워크플로우/업무 Python 변경은 없고 공개 후보는 문서·가린 증거·기존 audit probe 수정이다.

근거표는 최초 로컬 바이트의 SHA-256을 보존하고 별도 `sha256_lf`를 추가해 Git의 CRLF→LF 변환 뒤에도 대조할 수 있도록 했다. 기존 날짜별 증거에 들어 있는 해시를 현재 파일에 맞춰 덮어쓰지 않았다.

## 5. 남은 한계

- D10/TC15는 격리 환경 미준비 BLOCKED / NOT RUN, TC07 복구 action은 이번 범위 밖이다.
- 전체 VM export/소스 동일성·최신 노드별 시간·색인 처리시간/비용은 미확인이다.
- 기능 리허설은 11/09 별도 run의 3흐름·5요청이다. 연속 5분/20분 리허설과 현장 렌더링은 이번 마감 검사가 아니다.
- Browser Use 정책이 로컬 file URL 관찰을 거부한 상태이므로 DOM 검사를 실제 최대화·스크롤·이중 창의 시각 검수로 표시하지 않는다.
- `tscan` 도구 미제공 시 공개 후보 검사와 비밀 패턴 대조로 대신하고, 모든 과거 서버 기록/Git 이력의 비밀 무노출을 보증하지 않는다.

## 6. 산출물 위치·버전 관리

최종 로컬 위치는 `submission/final/`, 내부 전달 ZIP은 `submission/share/` 아래에 둔다. Git에는 공개 정책의 Markdown/JSON·검증 도구만 반영하고 팀원 원문 첨부·이미지·바이너리·ZIP·원시 실행 자료는 강제 추가하지 않는다. 구체적인 최종 ZIP 이름·해시·commit/PR 결과는 완료 후 별도 manifest와 후속 기록으로 남긴다.
