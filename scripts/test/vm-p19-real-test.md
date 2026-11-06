# VM P19 실제 연결 시험

R02가 준비하고 R01이 환경 값을 연결해 게시하는 시험이다. 첫 목표는 실제 사용자 조회 → 분류·검색·답변 검증 → Jira 생성·종료 → 최종 저장 → 응답의 S1 한 건이다. mock 시험은 [VM P19 mock 시험](vm-p19-mock-test.md)에 따로 둔다.

**현재 상태:** R04는 팀 n8n에서 하위 기능의 실제 Jira 생성·종료·이관을 통과했다고 보고했다(PR #27 `fdd0be1`, 최신 기준 `168c79c`). support를 포함한 실제 S1은 아직이다. support 연결은 로컬 가짜 Jira로 확인했다. 남은 것은 R01의 담당 매핑, `005`~`006` 적용, 시험 사본 게시다.

## 다음 시험 고정 기준

R01 확정 후 R04가 하위 기능 기준을 `1b83d18`로 올렸고, R01이 이 커밋의 R02 소비 검토 동의를 취합했다(2026-11-06). PR #27은 이후 `15e3c5a`까지 바뀌었지만 반복 이관 시 새 문맥 저장 누락과 DLQ 중복·복구 계약에 수정 요청이 있어 병합 보류 중이다. R01 지시로 의존 버전은 자동으로 올리지 않고 아래 확정값을 유지한다. R04의 새 고정 커밋이 정해지면 그 변경분만 추가 검토한다. 기존 복제본이 이 기준이라고 가정하지 않고 R01이 원본 해시로 확인한다.

| 대상 | 기준 |
| --- | --- |
| support | `5e0026c` |
| state·DLQ·handoff | `1b83d18` (이전 R01 확정값 `168c79c`) |
| errors | `ff19178` (별도 기준) |
| R01 확인 항목 | state·DLQ 복제본과 원본 해시, `005`~`006` 마이그레이션·권한 적용, handoff 내부 참조, 담당 매핑, scope |

문의 label이 scope·소유자·첫 요청 ID의 해시로 바뀌어, 이전 label로 만든 이슈는 재사용되지 않고 시험 중 scope를 바꾸면 기존 문의와 연결되지 않는다. 병합 순서는 PR #27 → PR #16이다. 실제 Jira를 포함한 S1과 재전송은 게시 후 새 증거로 확인한다. 로컬 가짜 Jira 성공으로 실제 S1 완료 처리하지 않는다.

## 파일 만들기

```bash
uv run --locked python scripts/test/make_vm_p19_real_bundle.py --output-dir <새 폴더> \
  --state-workflow-id <state ID> --dlq-workflow-id <DLQ ID> --handoff-url <handoff 내부 주소> \
  --scope <R01이 정한 VM scope> --errors-ref <errors 커밋> \
  --openai-credential-id <ID> --team-credential-id <ID> --internal-credential-id <ID>
```

`--errors-ref`를 주면 같은 폴더에 errors 사본(`dubakwi-errors-p19-real.json`, ID `dubakwiP19RealErrors`)도 만든다. E02의 `const importedScope = '__DUBAKWI_SCOPE__';` **대입값만** support와 같은 scope로 바꾸고, 비교식의 자리표시자는 그대로 둔다. 자리표시자를 전체 일괄 치환하면 비교식까지 바뀌어 저장이 막힌다. 도구는 `$env`가 막힌 상태를 흉내 내 E02를 실행해 support와 같은 scope로 저장 준비가 되는지 확인하고, 아니면 사본을 만들지 않는다(`manifest.json`의 `errors_copy.scope_matches_support`). 대입 줄이 없는 errors(예: 고정 기준 `ff19178`)는 거부한다. errors의 state·DLQ 대상은 support와 같은 `--state-workflow-id`·`--dlq-workflow-id`로 맞추고, `--error-workflow-id`를 따로 주지 않으면 support의 Error Workflow를 이 사본으로 지정한다.

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
| 409 시민 안내 문구 | 제안 | support는 state 응답을 그대로 전달한다(FL35를 실제 문장으로 갱신). `기존 요청을 먼저 확인해야 합니다.`는 다음 행동을 알려 주지 않는다. 수정안(R01 제안 반영, 2026-11-06): `request_in_progress` → `같은 요청을 처리하고 있습니다. 같은 요청은 자동으로 다시 실행하지 않습니다.`, `request_requires_review` → `처리 결과 확인이 필요하며, 같은 요청은 자동으로 다시 실행하지 않습니다.`(R01 문구), `request_conflict` → `같은 요청 번호로 다른 내용이 들어왔습니다. 새 문의로 다시 보내 주세요.` 세 문구 모두 접수·완료·자동 복구·후속 연락을 약속하지 않는다(이전 안의 `잠시 뒤 결과를 확인`은 완료를 암시해 뺐다). `codes`는 유지 | R04가 #27 `f1c4fcb` S05에 반영했지만 R01 지시 전 초안이라 위 수정안으로 맞추도록 요청 |

support를 통한 중단 → errors → PostgreSQL 종단과 VM 반입은 미실행이다. errors 사본은 `--errors-ref`로 만들 수 있지만, 고정 기준 errors는 아직 `ff19178`이라 새 errors 커밋은 R01이 기준으로 정한 뒤 쓴다.

## 게시와 종료

1. 게시 순서: state → DLQ → errors → handoff → support.
2. PostgreSQL에 시험 scope의 기존 행이 없는지 확인한다. 같은 `request_id`를 재사용하면 409가 정상이다.
3. 시험 뒤 시험 사본을 비활성화하고 경로 404를 확인한다. 운영 P11은 그대로 둔다.

## S1 입력과 통과 기준

```json
{"request_id": "s1-<실행ID>", "user": "citizen-a", "question": "QR이 안 읽혀요. 자전거 번호로 대여하는 방법을 알려주세요", "attempt": 1}
```

| 확인 대상 | 기대값 |
| --- | --- |
| 응답 | 200, `자동 답변`, `ticket=null`, `case_ref` 있음, `rental-guide`의 QR 절 근거 |
| Jira | 티켓 1건 생성, `closed_guidance` 종료 확인 |
| `request_state` | `completed`, `jira_issue_key` 있음, 응답 저장 |
| `dead_letters` | 0건 |
| 재전송 | 같은 입력은 저장 응답 재사용, 티켓·LLM 추가 0 |
| 실행 기록 | B04·B14·L01~L03·B27·B32 실행 |

Jira 또는 저장 효과를 확인하지 못하면 응답이 맞아도 S1 통과로 기록하지 않는다. S1 뒤에는 보완 → 이관 → 조회 → 긴급 → 실패/복구 순서로 넓힌다.

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
