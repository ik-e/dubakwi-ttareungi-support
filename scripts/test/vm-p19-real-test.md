# VM P19 실제 연결 시험

R02가 준비하고 R01이 환경 값을 연결해 게시하는 시험이다. 첫 목표는 실제 사용자 조회 → 분류·검색·답변 검증 → Jira 생성·종료 → 최종 저장 → 응답의 S1 한 건이다. mock 시험은 [VM P19 mock 시험](vm-p19-mock-test.md)에 따로 둔다.

**현재 상태:** R04는 팀 n8n에서 하위 기능의 실제 Jira 생성·종료·이관을 통과했다고 보고했다(PR #27 `fdd0be1`, 최신 기준 `168c79c`). support를 포함한 실제 S1은 아직이다. support 연결은 로컬 가짜 Jira로 확인했다. 남은 것은 R01의 담당 매핑, `005`~`006` 적용, 시험 사본 게시다.

## 다음 시험 고정 기준

PR #27(`46b1b43`)·#28(`8c53cf7`)이 main에 병합됐다(2026-11-06, main `c6dd178`). R01 요청대로 병합된 main을 이 브랜치에 반영하고 의존 기준을 main으로 맞췄다. 이전 확정값(`1b83d18`·`ff19178`)과 그 사이 커밋 확인은 기록으로 남긴다.

| 대상 | 기준 | SHA-256(앞 12자) |
| --- | --- | --- |
| support | PR #16 이 커밋(병합 전) | 사본 `2d8d7ecf6c1f`(`--scope dubakwi-p19-real`, 환경 ID 없이) |
| state·DLQ | main `c6dd178`(= `86d78e7`) | `917230d49e63`·`823aa2605958` |
| handoff | main `c6dd178`(= `a930e24`) | `ce390759eceb`(Git 원본, 렌더 전) |
| errors | main `c6dd178`(= `8c53cf7`) | 원본 `747eeb0eca30`, 사본 `25dd980121e9` |
| R01 확인 항목 | state·DLQ 복제본과 원본 해시, `005`~`007` 마이그레이션·권한 적용, handoff 내부 참조, 담당 매핑, scope `dubakwi-p19-real` | - |

앞서 R01에 전달한 명령(`--errors-ref 8c53cf7 --r04-ref a930e24`)과 main 기준 명령(`--errors-ref c6dd178`)은 같은 사본을 만든다(support·errors 사본 SHA-256 동일).

문의 label이 scope·소유자·첫 요청 ID의 해시로 바뀌어, 이전 label로 만든 이슈는 재사용되지 않고 시험 중 scope를 바꾸면 기존 문의와 연결되지 않는다. 병합 순서는 PR #27 → #28 → #16이며 #27·#28은 병합됐다. 실제 Jira를 포함한 S1과 재전송은 게시 후 새 증거로 확인한다. 로컬 가짜 Jira 성공으로 실제 S1 완료 처리하지 않는다.

## 파일 만들기

```bash
uv run --locked python scripts/test/make_vm_p19_real_bundle.py --output-dir <새 폴더> \
  --state-workflow-id <state ID> --dlq-workflow-id <DLQ ID> --handoff-url <handoff 내부 주소> \
  --scope dubakwi-p19-real --errors-ref <errors 커밋> --r04-ref <state·DLQ·handoff 커밋> \
  --openai-credential-id <ID> --team-credential-id <ID> --internal-credential-id <ID>
```

`--errors-ref`를 주면 같은 폴더에 errors 사본(`dubakwi-errors-p19-real.json`, ID `dubakwiP19RealErrors`)도 만든다. E02의 `const importedScope = '__DUBAKWI_SCOPE__';` **대입값만** support와 같은 scope로 바꾸고, 비교식의 자리표시자는 그대로 둔다. 자리표시자를 전체 일괄 치환하면 비교식까지 바뀌어 저장이 막힌다. 도구는 `$env`가 막힌 상태를 흉내 내 E02를 실행해 support와 같은 scope로 저장 준비가 되는지 확인하고, 아니면 사본을 만들지 않는다(`manifest.json`의 `errors_copy.scope_matches_support`). 대입 줄이 없는 errors(예: 고정 기준 `ff19178`)는 거부한다. errors의 state·DLQ 대상은 support와 같은 `--state-workflow-id`·`--dlq-workflow-id`로 맞추고, `--error-workflow-id`를 따로 주지 않으면 support의 Error Workflow를 이 사본으로 지정한다.

`manifest.json`의 `dependencies`는 함께 반입할 원본의 커밋과 SHA-256이다. 옵션이 없으면 R01 확정 기준(state·DLQ·handoff `1b83d18`, errors `ff19178`)을 적으므로 **최신 #27·#28 반영을 뜻하지 않는다.** 실제로 반입할 원본은 `--r04-ref`·`--errors-ref`로 넘기고, 각 항목의 `default_differs`로 확정 기준과 다른지 확인한다. SHA-256은 Git 원본 기준이라 Jira 주소·담당 매핑을 채운 렌더 결과와는 다르다.

| 원본 | 확정 기준 | SHA-256(앞 12자) | 최신 후보(2026-11-06 11시) | SHA-256(앞 12자) |
| --- | --- | --- | --- | --- |
| state | `1b83d18` | `45b96868f74c` | #27 `86d78e7` | `917230d49e63` |
| DLQ | `1b83d18` | `9c466061b7e4` | #27 `86d78e7` | `823aa2605958` |
| handoff | `1b83d18` | `9d65d8c756e1` | #27 `86d78e7` | `7fd773544835` |
| errors | `ff19178` | `bf8146de49a6` | #28 `8c53cf7` | `747eeb0eca30` |

최신 후보로 만든 errors 사본은 `scope_matches_support: true`이고, `8c53cf7`의 errors 워크플로우는 `7426eb9`와 같아 사본 SHA-256도 같다(`25dd980121e9`). 실효 scope는 VM에서 `DUBAKWI_SCOPE`가 읽히면 그 값이 우선하므로 R01이 VM에서 따로 확인한다.

handoff는 R04 `168c79c`의 `scripts/dev/render_n8n_workflow.py`로 Jira 주소와 담당 매핑을 채운 사본을 Git 제외 경로에 만들어 반입한다. 환경 값은 옵션으로만 넣고 공개 기록에 남기지 않는다. `--scope`는 필수이며, 사본에 원본 `dubakwi-dev`가 남으면 만들지 않는다. `manifest.json`에 기준 커밋, support SHA-256, 함께 쓰는 워크플로우의 원본 커밋과 SHA-256이 남는다. R01의 비활성 복제본이 이 값과 같은 원본인지 대조한다.

## ID·Credential 대응표

| 대상 | 저장소 기본값 | 시험 사본 | 값 제공 |
| --- | --- | --- | --- |
| support ID·이름 | 환경별 | `dubakwiP19RealSupport`, `dubakwi-support-p19-real` | R02 |
| support 경로 | `/webhook/dubakwi-support` | `/webhook/dubakwi-support-p19-real` | R02 |
| B04 사용자 조회 | `dubakwi-user-api:8801/employees/<user>`, `dubakwi-internal-key` (2026-11-06 원본 반영) | 그대로, Credential ID만 연결 | R01 배포 완료(PR #32) |
| B07·B37·B32·X06 state | `dubakwiState01` | `--state-workflow-id` | R01 복제본 ID |
| X03 DLQ | `dubakwiDlq0001` | `--dlq-workflow-id` | R01 복제본 ID |
| B15·B27 handoff | `http://127.0.0.1:5678/webhook/dubakwi-handoff` | `--handoff-url` | R01 복제본 경로 |
| Error Workflow | 없음 | `--error-workflow-id` | R01. 아래 "Error Workflow 연결 전 확인" 해결 후 |
| scope (B07a·X06a·X03a) | `dubakwi-dev` (로컬 개발값) | `--scope` 필수로 치환 | R01. errors의 `DUBAKWI_SCOPE`와 같게 |
| B14 검색 | `/webhook/dubakwi-search` | 그대로 | R03 |
| B35 로그, X04 알림 | `data-api:8800` | 그대로 | 과정 data-api. 운영 알림 아님 |

| Credential | 노드 | 헤더·종류 |
| --- | --- | --- |
| `dubakwi-team-key` | B01 | `X-Team-Key` |
| `dubakwi-internal-key` | B04, B14, B15, B27, 검색과 handoff의 Webhook, 사용자 API | `X-Internal-Key` |
| `dubakwi-openai` | L01~L03 | OpenAI |
| `dubakwi-postgres` | S04, D04 | PostgreSQL |
| Jira SW Cloud API | handoff의 Jira 노드 | R04 연결 완료 보고. 노드 이름은 새 커밋 확인 후 기록 |

## Error Workflow 연결 전 확인

R02가 PR #28 `fc776e2`를 support 쪽에서 검토한 결과다(2026-11-06, [PR #28 댓글](https://github.com/ik-e/dubakwi-ttareungi-support/pull/28#issuecomment-6673887106)). R04가 `7426eb9`로 회신했고 R02가 다시 확인했다(아래 갱신 열).

| 항목 | 판정(`fc776e2`) | 내용 | 갱신(`7426eb9`) |
| --- | --- | --- | --- |
| E06 DLQ 요청 형식 | 동의 | DLQ D02(`1b83d18`, `fc776e2`) 계약 검사 통과(Code 대조). 오류 원문·비밀값을 남기지 않음 | 변경 없음 |
| E02 `$env.DUBAKWI_SCOPE` | 수정 필요 | 로컬 n8n 2.42.6 기본 설정(`N8N_BLOCK_ENV_ACCESS_IN_NODE` 미설정)에서 Code 노드의 `$env` 읽기가 `access to env vars denied`로 실패한다(시험 워크플로우로 확인 후 비활성화). 이 설정이면 E02가 중단되어 state·DLQ 기록이 남지 않는다. VM에서 환경 변수 접근을 허용하거나 반입 시 scope를 치환해야 하며, 값은 support `--scope`와 같아야 한다 | `$env` 예외 처리와 `__DUBAKWI_SCOPE__` 치환 반영. 단 자리표시자가 E02에 두 번(값과 비교식) 있어 **모두 치환하면 비교가 같아져 scope가 비고 저장이 막힌다**(Code로 확인: 첫 번째만 치환 `true`, 모두 치환 `false`). R01 지시(2026-11-06)로 R02 도구 `--errors-ref`가 대입값만 치환하고 support와 같은 scope인지 확인한다(`7426eb9`로 확인: `scope_matches_support: true`). R04 렌더 도구 쪽 보완은 R04 |
| 예상 밖 중단 뒤 재전송 | 확인 요청 | Error Trigger에는 `request_id`·`state_ref`가 없어 E05 fail이 skipped가 된다. 중단된 요청은 `processing`으로 남고 만료 조건이 없어 같은 `request_id` 재전송은 계속 `409 request_in_progress`다. DLQ 행은 `request_id: null`이라 `last_execution_id`로만 찾는다 | R04: 설계 의도(failed/unknown 자동 재실행 0, STORAGE-DESIGN 3.2). R02 수용. 남는 상태는 `processing`이라 운영 해제 절차는 확인 요청. 시민은 같은 `request_id`로만 막히고 새 문의는 새로 접수된다 |
| 예상 밖 중단 뒤 409 코드 | 정정(2026-11-06) | 처음에는 errors 경유 중단이 `processing`으로 남아 `request_in_progress`라고 봤지만, 그 시험은 행을 손으로 `processing`으로 바꾼 것이라 errors 경로를 거치지 않았다. state S03은 `state_ref: null` fail을 PostgreSQL로 보내고, SQL(`003`)이 `scope`+`execution_id`로 행을 찾아 `unknown`으로 바꾼다. errors의 `execution_id`는 support B07a가 begin에 저장한 실행 ID와 같다. 임시 PostgreSQL(`f1c4fcb` `001`~`007`) 확인: 원 실행 ID·같은 scope → `unknown` → 재전송 409 `request_requires_review`. 실행 ID·scope가 다르거나 begin 전 중단 → skipped → `processing` → 409 `request_in_progress` | 구분은 WORKFLOW-DESIGN 6.4.5(#28 `8c53cf7`)와 맞다. STORAGE-DESIGN 3.3 "언제" 열 정정은 #27에 요청([댓글](https://github.com/ik-e/dubakwi-ttareungi-support/pull/27#issuecomment-6674394121)). scope가 support와 같아야 이 경로가 동작한다 |
| 409 시민 안내 문구 | 제안 | support는 state 응답을 그대로 전달한다(FL35를 실제 문장으로 갱신). `기존 요청을 먼저 확인해야 합니다.`는 다음 행동을 알려 주지 않는다. 수정안(R01 제안 반영, 2026-11-06): `request_in_progress` → `같은 요청을 처리하고 있습니다. 같은 요청은 자동으로 다시 실행하지 않습니다.`, `request_requires_review` → `처리 결과 확인이 필요하며, 같은 요청은 자동으로 다시 실행하지 않습니다.`(R01 문구), `request_conflict` → `같은 요청 번호로 다른 내용이 들어왔습니다. 새 문의로 다시 보내 주세요.` 세 문구 모두 접수·완료·자동 복구·후속 연락을 약속하지 않는다(이전 안의 `잠시 뒤 결과를 확인`은 완료를 암시해 뺐다). `codes`는 유지 | #27 `86d78e7` S05에 위 문구로 최종 반영. support FL35·FL85·FL86 기대값을 같은 문장으로 맞춤 |

support를 통한 중단 → errors → PostgreSQL 종단과 VM 반입은 미실행이다. errors 사본은 `--errors-ref`로 만들 수 있지만, 고정 기준 errors는 아직 `ff19178`이라 새 errors 커밋은 R01이 기준으로 정한 뒤 쓴다.

## 재개 드라이버 미구현 상태의 영향(R02 확인, 2026-11-06)

**완료 제한(R01 결정, 2026-11-06): 실패한 문의의 연속 처리는 현재 지원하지 않으며, 원 요청 재개는 미구현이다.** 설계서 [7.6](../../docs/project/WORKFLOW-DESIGN.md#76-실패-문의의-후속-처리-제한-완료-제한)이 기준이다.

R01 요청으로 실패 요청을 `manual_required`로 보존하는 지금 상태에서 시민 안내·후속 문의·정상 연동 시험을 확인했다. 임시 PostgreSQL 16(#27 `86d78e7` `001`~`007`)에서 `state_apply`·`case_lookup`·`case_begin`을 직접 호출했고, support는 state 응답을 그대로 전달한다(FL35·FL85·FL86). n8n·VM 경유는 미실행이다.

| 시민이 하는 일 | 결과 | 시민이 받는 안내 |
| --- | --- | --- |
| 실패한 요청을 같은 `request_id`로 재전송 | 409 `request_requires_review`(원 실행이 아직 `processing`이면 `request_in_progress`) | `처리 결과 확인이 필요하며, 같은 요청은 자동으로 다시 실행하지 않습니다.` |
| 같은 문의를 `case_ref`로 이어서 질문 | 409 `case_busy`. 그 문의에 `processing`·`failed`·`unknown` 요청이 하나라도 있으면 `busy`이고, 재개 드라이버가 없어 **해제되지 않는다** | `기존 요청을 먼저 확인해야 합니다.`(S05 확정 문구 대상이 아니라 이전 문장 그대로) |
| 새 문의(새 `request_id`, `case_ref` 없음) | 200, 새 case로 정상 처리 | 일반 답변·보완·이관 |

- **시민 영향:** 실패한 문의는 이어서 질문할 수 없고 새 문의로만 다시 시작할 수 있다. 새 문의는 보완 횟수가 1부터 다시 세어지고 이관되면 Jira 이슈가 따로 생긴다(이전 문의의 label과 다르다). 담당자는 같은 사람의 두 이슈를 함께 봐야 한다.
- **`case_busy` 안내:** S05의 코드별 문구에 `case_busy`가 없어 다음 행동을 알려 주지 않는다. 처음 R02 제안(`새 문의로 다시 보내 주세요`)은 앞 요청이 **정상 처리 중일 때도** `case_busy`가 나는 점을 빠뜨렸다. R01 지적대로 모든 경우에 새 문의를 유도하지 않도록 R04가 문구와 Discord 어댑터의 오류 안내(같은 문의 연결값으로 다시 시도)를 맞춘다.
- **실패 시점의 응답:** 실패가 난 그 요청의 응답은 support X05가 만든다(`partial_effect`·`ticket_unknown`·`tickets_down`·`state_error` 모두 200 담당자 이관, FL25~FL37). 지금 X05 문구도 후속 처리를 약속하지 않는다(정적 검사 `담당자가 이어서` 금지).
- **정상 연동 시험은 막히지 않는다.** 새 `request_id`는 항상 새로 처리되고 다른 문의의 실패 행은 영향을 주지 않는다. 다만 아래를 지킨다.
  - `request_id`는 실행마다 새로 만든다. `run_cases.py`는 실행 ID를 앞에 붙인다. 과정 `flow.py`처럼 고정 ID를 다시 보내면 완료 건은 저장 응답 재사용, 실패 건은 409가 된다.
  - 실패 주입(Jira 종료 500, errors 경유 중단 등)을 한 문의는 이후 단계(`case_ref` 보완·한도)에 다시 쓰지 않는다. 보완·한도 시험은 실패 주입이 없는 새 문의로 한다.
  - 정상 S1과 실패 주입 시험의 결과는 따로 기록하고, 실패 주입 뒤 남은 행을 `resolve`로 복구 완료 처리하지 않는다.
  - 새 문의 성공을 기존 실패 문의의 복구 성공으로 기록하지 않는다.
- **확인 필요:** Discord 어댑터(R04)가 새 메시지마다 새 `request_id`를 만드는지, 이어서 질문할 때 `case_ref`를 어떻게 넣는지에 따라 시민이 `case_busy`를 실제로 만나는 빈도가 달라진다.

## 게시와 종료

1. 게시 순서: state → DLQ → errors → handoff → support.
2. PostgreSQL에 시험 scope의 기존 행이 없는지 확인한다. 같은 `request_id`를 재사용하면 409가 정상이다.
3. 시험 뒤 시험 사본을 비활성화하고 경로 404를 확인한다. 운영 P11은 그대로 둔다.

## S1 입력과 통과 기준

PR #36 정상 1건은 R03이 정한 질문과 기대 근거를 쓴다(2026-11-06).

```json
{"request_id": "s1-<실행ID>", "user": "citizen-a", "question": "QR이 안 읽혀요. 자전거번호로 대여하는 방법을 알려주세요.", "attempt": 1}
```

- **기대 근거:** `rental-guide` / `QR 인식 또는 잠금 해제가 어려운 경우`(시민 `public`).
- **검색 근거(R03):** 11/05 VM 검색 단독 SR-WF01에서 이 절이 2위였다([증거](https://github.com/ik-e/dubakwi-ttareungi-support/blob/r05/p07-r04-contract-cases/runs/public/20261105-162516-vm-p22-search/summary.json), 당시 main `0e44fdb`). 현재 VM 색인 상태와 P19 경유 결과가 아니며, 적용 색인 버전과 재색인 시점은 R03·R01이 확인한다.
- **로컬 참고:** 같은 문장(WF01)을 시간 예산 적용 뒤 실제 LLM으로 10회 보내 10/10 자동 답변, QR 절 인용 10회였다([기록](../../runs/public/20261106-093924-local-n8n-p19-time-budget-live/summary.json), PR #31 `06e9223` 색인·mock 하위 기능). VM 결과가 아니다.

| 확인 대상 | 기대값 |
| --- | --- |
| 응답 | 200, `자동 답변`, `ticket=null`, `case_ref` 있음, `sources`에 `rental-guide` / `QR 인식 또는 잠금 해제가 어려운 경우` |
| Jira | 티켓 1건 생성, `closed_guidance` 종료 확인 |
| `request_state` | `completed`, `jira_issue_key` 있음, 응답 저장 |
| `dead_letters` | 0건 |
| 재전송 | 같은 입력은 저장 응답 재사용, 티켓·LLM 추가 0 |
| 실행 기록 | B04·B14·L01~L03·B27·B32 실행 |

Jira 또는 저장 효과를 확인하지 못하면 응답이 맞아도 S1 통과로 기록하지 않는다. S1 뒤에는 보완 → 이관 → 조회 → 긴급 → 실패/복구 순서로 넓힌다.

## VM 정상 1건 결과

**첫 실행(2026-11-06 14:33:27 KST): 미완료.** [기록](../../runs/public/20261106-145001-vm-p19-normal-one-first/summary.json). 게시 기준 support `c5ed5fa`, state·DLQ·handoff `a930e24`(main `c6dd178`), errors `8c53cf7`, scope `dubakwi-p19-real`. R03 고정 질문, `citizen-a`, 새 `request_id`, `case_ref` 없음.

| 구간 | 결과 |
| --- | --- |
| 응답 | HTTP 200, 12.75초, `담당자 이관` / `partial_effect`, 티켓 `JBYS-6`(known ID) |
| 사용자 확인·분류·검색·답변·검증 | 통과(agents triage·retriever·writer·verifier) |
| 실행 ID(R01 VM 조회) | support 266 → 검색 268·조회 269 → handoff 270 → state 271~273 → DLQ 274 |
| Jira | `JBYS-6` 생성. 종료 실패: 새 이슈의 허용 전환이 Start(진행 중)·In review(Pending)뿐이라 handoff H33이 `transition_unavailable`로 중단, 종료 POST 미실행 |
| `request_state` | `unknown` / B29 / `partial_effect`, 최종 응답 없음 |
| `dead_letters` | `close` 복구 1건(pending), known Jira ID·key 보존 |

support의 부분 실패 보존은 설계대로 동작했다. 같은 요청 재전송·재종료는 하지 않았다. 다음은 R04의 시작 상태 → 완료 전환 방법 결정(중간 전환 구현 또는 Jira 설정) 뒤 새 `request_id`로 다시 실행한다. 실패 응답은 근거를 싣지 않으므로 기대 근거 사용 여부는 실행 266 기록으로 확인한다.

**정상 1건 통과(R01 실행, 2026-11-06):** B17 시간 예산을 남은 시간에 맞춰 L02/L03 한도까지 함께 줄이도록 바꾼 support `3e8547a`(R01 대리 편집, PR #16 `03dbb3f`로 반영)로 Webhook 실행 288(HTTP 200, 12.9초, 자동 답변, 기대 QR 근거, Jira 종료 204·독립 조회 완료, DB `completed`·응답 8필드 일치, DLQ 0)과 Discord 경유 실행 305(n8n 13.1초, 비공개 응답·근거·문의 연결값 수신, DB `completed`, Jira 완료, DLQ 0)가 통과했다. 증거는 PR #36의 `20261106-154400-vm-p19-normal-pass`, `20261106-163939-vm-discord-normal`이다. 앞선 실행 257·279는 B17이 남은 시간 14.9·15.1초로 기존 조건(15.5초)에 걸려 `deadline_exceeded`로 이관됐다. 288·305는 모델 최대 4/3초가 그대로 쓰였고, 줄인 한도 경로는 로컬 FL88~FL92로만 확인했다. 정상 1건 연결이며 R05 공식 판정·권한·실패·시간 시험을 대신하지 않는다.

## 로컬 예행 결과

실제 support, 임시 PostgreSQL(`001`~`006`), 임시 사용자 API, R04 `60f8886`의 state·DLQ·handoff, [가짜 Jira](fake_jira.py)로 호출했다. 실제 Jira 호출은 0건이다. [결과](../../runs/public/20261105-185000-local-n8n-p19-fake-jira-e2e/summary.json), [이전 Jira 없는 예행](../../runs/public/20261105-170800-local-n8n-p19-real-rehearsal/summary.json)

| 호출 | 응답 | 효과 |
| --- | --- | --- |
| 대표 문장 S1 | 200 자동 답변, `ticket=null` | 가짜 Jira 생성·종료, `completed`, DLQ 0 |
| 같은 요청 재전송 | 200 저장 응답 | 티켓 추가 0 |
| Jira 종료 500 | 200 이관 `partial_effect`, known `JBYS-2` | `unknown`, DLQ `close`·`jira_ref` |
| Jira 생성 500 | 200 이관 `ticket_unknown`, ticket null | `unknown`, DLQ `create` |
| 보완 후 `case_ref` | 200 보완 질문 | 같은 티켓 재사용 |
| 종료·없는·타인 `case_ref` | 409·400·403 | 내용 비공개 |
| 긴급 | 200 이관, priority high | 배정·알림 |
| 본인·타인 조회 | 200 자동 답변·권한 없음 | 타인 내용 비공개 |

R04 `fdd0be1` 기준 [재시험 결과](../../runs/public/20261105-194144-local-n8n-p19-fake-jira-fdd0be1/summary.json): 위 경로가 모두 동작했고, `attempt` 없이 `case_ref`로 이어 가도 3회째에 `attempt_limit`으로 이관된다. 담당 매핑은 시험 값이다.

R04 `168c79c` 기준 [재시험 결과](../../runs/public/20261105-195528-local-n8n-p19-fake-jira-168c79c/summary.json)도 같다.

R04 `1b83d18` 기준 [재시험 결과](../../runs/public/20261105-233715-local-n8n-p19-fake-jira-1b83d18/summary.json)도 같다(S1 실행 `20217`, 재전송 `20226`).

R04 요청으로 PR #27 `87ee11c` 기준 [재시험 결과](../../runs/public/20261106-102359-local-n8n-p19-fake-jira-87ee11c/summary.json)(2026-11-06, 참고 기록이며 고정 기준 아님): 임시 PostgreSQL에 `007`까지 적용했고, 위 경로가 모두 동작했다(S1 실행 `20753`, 재전송 `20762`). 한도 이관 3회(`lim-3`~`5`)는 같은 `JBYS-3`을 쓰고 알림 시도·성공 표식이 한 번씩만 남아 재배정·재알림이 없었다. 가짜 Jira가 label 추가와 담당자를 흉내 내도록 보강했다. 실제 Jira 호출은 0건이고 errors는 연결하지 않았다.

**알려진 결함:** 아래 `e0ff365`·`f306778`·`15e3c5a` 확인은 PR #27 진행 중의 참고 기록이며 고정 기준이 아니다.

- **알림 중복(재배정·재알림 포함):** 한도 이관 뒤 같은 case의 새 요청과 같은 요청 재시도에서 배정과 알림이 다시 나간다. R04가 PR #27 `e0ff365`에서 Jira label로 알림 시도·성공 표식을 나눠 고쳤다. 성공 표식이 있으면 생략하고, 시도 표식만 있으면 `partial_effect`와 복구 정보(`alert`)로 반환한다. R02 확인(2026-11-06): `e0ff365`의 state·DLQ·handoff로 support 로컬 Code 125/125, R04 반복 시험 4/4. support 수정은 필요 없다. 가짜 Jira는 label 추가를 흉내 내지 않아 support를 통한 종단 확인은 하지 않았다.
- **`alert_marker` DLQ:** `e0ff365`에서는 DLQ 허용 action에 없어 거절됐고, R04가 PR #27 `f306778`에서 허용과 case 단위 중복 제거(`007`)를 추가했다. R02 확인(2026-11-06): `f306778` 하위 기능 코드로 support 로컬 Code 127/127(새 FL75·FL76: 다른 요청 두 건이 같은 `case_id`·`_dedupe_ref`·`failed_step`·`error_code`로 같은 DLQ 키), R04 시험 4/4·4/4. 임시 PostgreSQL 16에 `001`~`007`을 적용해 support 형식 요청으로 `dlq_apply`를 호출하니 같은 case 두 번째는 같은 `dlq_id`, `deduplicated: true`, 최신 `request_id`로 갱신됐고 다른 case는 새 행이었다. FL75·FL76은 이 브랜치의 이전 R04 사본과 맞지 않아 #27 병합 뒤 main 반영 때 함께 올린다.
- **시도 표식만 남은 문의:** `f306778`에서는 이후 요청이 `recovery.action: alert`로 나와 같은 case라도 요청마다 새 DLQ 행이 생겼다(임시 DB 확인). R04가 `33e68d9`에서 이 경로도 `alert_marker`로 바꿔 같은 case DLQ로 합쳤다. R02 확인(`15e3c5a`): support 로컬 Code 127/127(FL75·FL76 포함), R04 반복 시험 5/5, DLQ 시험 4/4, recovery·DLQ action 대조 8/8. state·DLQ·SQL은 `f306778`과 같아 위 임시 DB 결과가 그대로 적용된다. 첫 알림 실패 자체는 `alert`로 한 건 남으므로 case당 DLQ는 최대 `alert` 1건과 `alert_marker` 1건이다.
- **Jira 검색 지연 시 중복 가능성:** R04 공유 미반영 항목이다.

실제 S1 통과가 아니다. 실제 Jira, VM, R05 공식 판정은 미실행이다.

[도구 안내](README.md)
