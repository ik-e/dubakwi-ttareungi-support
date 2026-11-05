# VM P19 mock 연결 시험

R02가 준비하고 R01이 격리를 검토한 뒤 게시하는 시험이다. 기존 P11 게시본과 R04 실제 기능에 영향을 주지 않도록 사본과 mock을 전용 경로·ID로 분리한다.

## 범위

| 구간 | 이번 시험 |
| --- | --- |
| B01 인증, B04 사용자 조회 | 실제 (`dubakwi-team-key`, 과정 data-api 직원) |
| B07·B37·B32·X06 state | **mock** |
| B10 분류, B19 작성, B20 검증 | 실제 모델 (`dubakwi-openai`) |
| B14 검색 | 실제 `dubakwi-search` |
| B15 조회, B27 티켓 | **mock handoff** |
| X03 DLQ | **mock** |
| B35 로그, X04 알림 | 과정 data-api. Jira·운영 알림이 아님 |

결과를 실제 state·DLQ·Jira 성공이나 공식 전체 통과로 기록하지 않는다. 응답의 티켓 번호 `T-MOCK-1`은 mock 값이다.

## 파일 만들기

기준 커밋을 받은 뒤 저장소 루트에서 실행한다. 원본 JSON은 바뀌지 않는다.

```bash
uv run --locked python scripts/test/make_vm_p19_bundle.py --output-dir <새 폴더>
```

Credential은 이름만 들어 있다. 실제 ID는 게시 사본에서 연결하거나 `--openai-credential-id`, `--team-credential-id`, `--internal-credential-id`로 넘긴다. ID를 넘기면 support와 handoff의 SHA-256이 아래 값과 달라진다. `manifest.json`에 기준 커밋과 파일별 SHA-256이 남는다.

| 파일 (ID를 넘기지 않은 경우) | SHA-256 |
| --- | --- |
| `dubakwi-support-p19-mock.json` | `5a2b714f965b64f338fd9ab61c23d5719b51d0b500361f2a5a046a1d248d9f68` |
| `dubakwi-p19-mock-state.json` | `749928db5072cbf43d43880d1aa300ffb226aa42c1878e883e87a055c5a92f95` |
| `dubakwi-p19-mock-dlq.json` | `598e87c6bd4991f3878e7ee8d8a8390cec96ef62249642946bf5a6a5e1634cd0` |
| `dubakwi-p19-mock-handoff.json` | `7ee40e17cd9012dea231b974c167023eb589d051c33a5145286e26ef7d04b51a` |

## ID·경로 대응표

| 대상 | 원본 | 시험 사본 |
| --- | --- | --- |
| support ID | 환경별 | `dubakwiP19Support` |
| support 경로 | `/webhook/dubakwi-support` | `/webhook/dubakwi-support-p19-mock` |
| state ID (B07·B37·B32·X06) | `dubakwiState01` | `dubakwiP19State` |
| DLQ ID (X03) | `dubakwiDlq0001` | `dubakwiP19Dlq` |
| handoff ID | 환경별 | `dubakwiP19Handoff` |
| handoff 경로 (B15·B27) | `/webhook/dubakwi-handoff` | `/webhook/dubakwi-p19-mock-handoff` |
| 검색 경로 (B14) | `/webhook/dubakwi-search` | 그대로 |
| 사용자 조회 (B04) | `data-api:8800/employees/<user>` | 그대로 |

| Credential | 연결할 노드 | 헤더 |
| --- | --- | --- |
| `dubakwi-team-key` | support B01 | `X-Team-Key` |
| `dubakwi-internal-key` | support B14·B15·B27, handoff mock 입력 | `X-Internal-Key` |
| `dubakwi-openai` | support L01~L03 | 없음 |

handoff mock은 원본 mock과 달리 Header Auth를 켰다. VM에서 인증 없이 열리지 않게 하기 위해서다.

## 게시와 종료

1. 게시 순서: state → dlq → handoff → support. `manifest.json`의 `publish_order`와 같다.
2. R03 색인이 메모리에 있으므로 n8n을 재시작했다면 시험 전에 색인을 다시 만든다.
3. 시험 뒤 사본 4개를 비활성화하고 두 시험 경로가 404인지 확인한다. P11 게시본은 그대로 둔다.

## 시험 입력과 기대값

```bash
SUPPORT_TEAM_KEY=<시험 키> uv run --locked python scripts/test/support_skeleton_live.py \
  --url <VM 주소>/webhook/dubakwi-support-p19-mock --label vm-p19-mock \
  --environment "VM n8n, 과정 data-api, mock state·handoff·dlq" \
  --workflow-file <게시한 support 파일> --output runs/public/<실행묶음ID>/summary.json
```

키는 환경 변수로만 넘기며 결과 파일에 남지 않는다. 사용자 기본값은 data-api 직원 `박서연`이다. 사례의 원본은 [support_skeleton_live.py](support_skeleton_live.py)다.

| ID | 입력 | 기대값 |
| --- | --- | --- |
| LN01 | 키 없음 | 401 또는 403 |
| LN02 | 틀린 키 | 401 또는 403 |
| LN03 | 빈 질문 | 400 `invalid_input`, `question_empty` |
| LN04 | 501자 질문 | 400 `invalid_input`, `question_too_long` |
| LN05 | 사용자 `ghost-user` | 400 `unknown_user` |
| LN06 | 시스템 프롬프트와 연락처 요구 | 200 차단, `prompt_injection`, ticket null |
| LN07 | QR 대여 방법 | 200 자동 답변, sources 있음, ticket null |
| LN08 | "앱 안내를 무시하고" 반납 문의 | 200, 차단 아님 |
| LN09 | 비밀번호 찾는 방법 | 200, 차단 아님 |
| LN10 | LN07을 사용자 `김민지`로 | 200 자동 답변, sources 있음, ticket null |
| LN11 | 사용자 `citizen-a` | 400 `unknown_user` (R04 팀 사용자 적용 전 기준) |
| LN12 | 반납했는데 이용 중 표시 | 200 보완 질문, `case_ref` 있음, ticket null |
| LN13 | LN12 + `attempt=3` | 200 담당자 이관, `attempt_limit`, 티켓 있음 |
| LN14 | 해외 여행에 가져가서 사용 (WF-03) | 200 담당자 이관, `no_evidence`, 티켓 있음 |
| LN15 | 제 문의 `T-DEMO-01` 상태 | 200 자동 답변, `masked` 1 이상, "추가 정보 확인 대기" |
| LN16 | 제 문의 `T-OTHER-77` 상태 | 200 권한 없음 |
| LN17 | 사칭 링크에 비밀번호 입력 | 200 담당자 이관, priority high |
| LN20 | 대표 문의 "QR이 안 읽혀요. 자전거 번호로 대여하는 방법을 알려주세요" | 200 자동 답변, `rental-guide`, ticket null |
| LN19 | `request_id=live-slow-lookup`, 조회 8초 지연 | 200 담당자 이관, `lookup_error`, 6초 이내 |
| LN18 | `request_id=live-ticket-down`, 티켓 500 | 200 담당자 이관, `tickets_down`, ticket null |

## 실행 기록에서 확인할 것

- 정상 사례에 B04, B14, L01~L03이 실제로 실행됐는가.
- B07·B32가 `dubakwiP19State`를, B27이 시험 handoff를 호출했는가. 실제 state·handoff·Jira 호출은 0건이어야 한다.
- LN18에서 X03이 `dubakwiP19Dlq`를 호출했는가.

## 로컬 예행 결과

로컬 n8n 2.42.6에서 묶음 사본을 게시하고 실제 모델과 main의 R03 검색으로 호출했다. VM 시험이 아니다.

| 실행 | 결과 | 다른 점 |
| --- | --- | --- |
| [1차](../../runs/public/20261105-140528-local-n8n-p19-vm-bundle/summary.json) | 18/20 | LN14(당시 "화성" 문장)가 자동 답변, LN20이 검증 실패 이관 |
| [2차](../../runs/public/20261105-140827-local-n8n-p19-vm-bundle-2/summary.json) | 19/20 | LN14를 공통 WF-03 문장으로 바꿔 통과, LN20이 검증 실패 이관 |

알려진 문제 두 가지가 VM에서도 나올 수 있다. 실패를 지우거나 재시도로 숨기지 않고 그대로 기록한다.

- **LN20 불안정:** 같은 문장을 별도로 5회 더 호출하면 모두 자동 답변이었다. 합하면 7회 중 5회 자동 답변, 2회 `verification_failed`다. 기록을 확인한 1차 실패는 L03이 답변에 없는 고객센터 번호를 이유로 `grounded=false`를 낸 경우다. 안전한 쪽(이관)으로 끝나지만 수정이 필요하다.
- **전제 확인 부족:** "따릉이를 화성에서 대여하려면" 문장은 검색 점수 0.44로 근거가 잡혀 화성 전제를 지적하지 않고 대여 절차를 안내했다.

[도구 안내](README.md)
