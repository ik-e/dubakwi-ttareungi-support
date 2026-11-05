# VM P19 실제 연결 시험

R02가 준비하고 R01이 환경 값을 연결해 게시하는 시험이다. 첫 목표는 실제 사용자 조회 → 분류·검색·답변 검증 → Jira 생성·종료 → 최종 저장 → 응답의 S1 한 건이다. mock 시험은 [VM P19 mock 시험](vm-p19-mock-test.md)에 따로 둔다.

**현재 상태:** R04는 팀 n8n에서 하위 기능의 실제 Jira 생성·종료·이관을 통과했다고 보고했다(PR #27 `fdd0be1`, 최신 기준 `168c79c`). support를 포함한 실제 S1은 아직이다. support 연결은 로컬 가짜 Jira로 확인했다. 남은 것은 R01의 담당 매핑, `005`~`006` 적용, 시험 사본 게시다.

## 다음 시험 고정 기준

R01 확정 후 R04가 하위 기능 기준을 `1b83d18`로 올렸다고 알렸다(2026-11-05). 새 기준의 R01 확인은 대기 중이다. 기존 복제본이 이 기준이라고 가정하지 않고 R01이 원본 해시로 확인한다.

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
  --scope <시험 scope> --error-workflow-id <errors ID> \
  --openai-credential-id <ID> --team-credential-id <ID> --internal-credential-id <ID>
```

handoff는 R04 `168c79c`의 `scripts/dev/render_n8n_workflow.py`로 Jira 주소와 담당 매핑을 채운 사본을 Git 제외 경로에 만들어 반입한다. 환경 값은 옵션으로만 넣고 공개 기록에 남기지 않는다. `manifest.json`에 기준 커밋, support SHA-256, 함께 쓰는 워크플로우의 원본 커밋과 SHA-256이 남는다. R01의 비활성 복제본이 이 값과 같은 원본인지 대조한다.

## ID·Credential 대응표

| 대상 | 저장소 기본값 | 시험 사본 | 값 제공 |
| --- | --- | --- | --- |
| support ID·이름 | 환경별 | `dubakwiP19RealSupport`, `dubakwi-support-p19-real` | R02 |
| support 경로 | `/webhook/dubakwi-support` | `/webhook/dubakwi-support-p19-real` | R02 |
| B04 사용자 조회 | `data-api:8800/employees/<user>` | `dubakwi-user-api:8801/employees/<user>` | R01 배포 완료(PR #32) |
| B07·B37·B32·X06 state | `dubakwiState01` | `--state-workflow-id` | R01 복제본 ID |
| X03 DLQ | `dubakwiDlq0001` | `--dlq-workflow-id` | R01 복제본 ID |
| B15·B27 handoff | `http://127.0.0.1:5678/webhook/dubakwi-handoff` | `--handoff-url` | R01 복제본 경로 |
| Error Workflow | 없음 | `--error-workflow-id` | R01. `DUBAKWI_SCOPE` 미설정 문제 해결 후 |
| scope (B07a·X06a·X03a) | `dubakwi-dev` | `--scope`, 기본 `dubakwi-p19-real` | R01. errors의 `DUBAKWI_SCOPE`와 같게 |
| B14 검색 | `/webhook/dubakwi-search` | 그대로 | R03 |
| B35 로그, X04 알림 | `data-api:8800` | 그대로 | 과정 data-api. 운영 알림 아님 |

| Credential | 노드 | 헤더·종류 |
| --- | --- | --- |
| `dubakwi-team-key` | B01 | `X-Team-Key` |
| `dubakwi-internal-key` | B04, B14, B15, B27, 검색과 handoff의 Webhook, 사용자 API | `X-Internal-Key` |
| `dubakwi-openai` | L01~L03 | OpenAI |
| `dubakwi-postgres` | S04, D04 | PostgreSQL |
| Jira SW Cloud API | handoff의 Jira 노드 | R04 연결 완료 보고. 노드 이름은 새 커밋 확인 후 기록 |

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

**알려진 결함:**

- **알림 중복(재배정·재알림 포함):** 한도 이관 뒤 같은 case의 새 요청과 같은 요청 재시도에서 배정과 알림이 다시 나간다. R04가 같은 원인으로 확인했다(이미 알렸다는 표시 없음). R04가 병합 뒤 Jira label로 건너뛰도록 고칠 예정이다.
- **Jira 검색 지연 시 중복 가능성:** R04 공유 미반영 항목이다.

실제 S1 통과가 아니다. 실제 Jira, VM, R05 공식 판정은 미실행이다.

[도구 안내](README.md)
