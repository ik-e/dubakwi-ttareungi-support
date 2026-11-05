# VM P19 실제 연결 시험

R02가 준비하고 R01이 환경 값을 연결해 게시하는 시험이다. 첫 목표는 실제 사용자 조회 → 분류·검색·답변 검증 → Jira 생성·종료 → 최종 저장 → 응답의 S1 한 건이다. mock 시험은 [VM P19 mock 시험](vm-p19-mock-test.md)에 따로 둔다.

**현재 상태:** 묶음과 대응표는 준비됐지만 실제 S1은 통과할 수 없다. R04 보고(2026-11-05) 기준 Jira 생성·배정·bind는 팀 n8n에서 연결됐지만, Jira 종료(JBYS의 Resolution 값 없음), save 성공, `case_ref`, `/records`는 미완료다. 저장소의 PR #27 `e273daa`는 아직 Jira 없는 버전이라 이 묶음의 handoff 기준은 R04 새 커밋으로 바꿔야 한다.

## 파일 만들기

```bash
uv run --locked python scripts/test/make_vm_p19_real_bundle.py --output-dir <새 폴더> \
  --state-workflow-id <state ID> --dlq-workflow-id <DLQ ID> --handoff-url <handoff 내부 주소> \
  --scope <시험 scope> --error-workflow-id <errors ID> \
  --openai-credential-id <ID> --team-credential-id <ID> --internal-credential-id <ID>
```

환경 값은 옵션으로만 넣고 공개 기록에 남기지 않는다. `manifest.json`에 기준 커밋, support SHA-256, 함께 쓰는 워크플로우의 원본 커밋과 SHA-256이 남는다. R01의 비활성 복제본이 이 값과 같은 원본인지 대조한다.

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

임시 PostgreSQL(`001`~`004`), 임시 사용자 API, main의 state·DLQ, PR #27 handoff로 호출했다. Jira는 없다. [결과](../../runs/public/20261105-170800-local-n8n-p19-real-rehearsal/summary.json)

| 호출 | 응답 | 저장 결과 |
| --- | --- | --- |
| 대표 문장 `citizen-a` | 200 담당자 이관 `tickets_down`, ticket null | `failed`, DLQ 1건 `pending` |
| 같은 ID·같은 입력 재전송 | 409 `request_requires_review` | 추가 행 없음 |
| 같은 ID·다른 입력, 다른 사용자 | 409 `request_conflict` | 추가 행 없음 |
| 보완 정보 부족, 긴급 | 200 담당자 이관 `tickets_down` | `failed`, DLQ 각 1건 |
| `case_ref` 있는 요청 | 200 담당자 이관 `case_verification_required` | 추가 행 없음 |
| 주입, 미등록 사용자 | 200 차단, 400 `unknown_user` | 행 없음 |
| PostgreSQL 중단 | 200 담당자 이관, 본문 있음 | 저장 불가 |

실제 S1 통과가 아니다. 실제 Jira, VM, R05 공식 판정은 미실행이다.

[도구 안내](README.md)
