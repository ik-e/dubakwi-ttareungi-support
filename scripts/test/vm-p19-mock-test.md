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

2026-11-06부터 원본 B04가 팀 사용자 API(`dubakwi-user-api:8801`, `dubakwi-internal-key`)를 호출하므로 사본도 기본값이 같다(R04 요청). 시험 사용자는 `citizen-a` 등 `data/users.json`의 ID를 쓰며 `박서연`은 400이 된다. 아래 `06863b3` 시험처럼 과정 data-api 직원으로 재현할 때만 `--data-api`를 붙인다(이전 `--user-api`는 없앴다).

Credential은 이름만 들어 있다. 실제 ID는 게시 사본에서 연결하거나 `--openai-credential-id`, `--team-credential-id`, `--internal-credential-id`로 넘긴다. ID를 넘기면 support와 handoff의 SHA-256이 아래 값과 달라진다. `manifest.json`에 기준 커밋과 파일별 SHA-256이 남는다.

| 파일 (ID를 넘기지 않은 경우) | SHA-256 |
| --- | --- |
| `dubakwi-support-p19-mock.json` | `e1dde6744829ce308910cf3212efa3543788b88ee5ee3e6def538e188353984a` (B04 변경 전 기준. 현재 기본값으로 만들면 달라진다) |
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
| 사용자 조회 (B04) | `dubakwi-user-api:8801/employees/<user>` (2026-11-06 전에는 `data-api:8800`) | 그대로. `--data-api`면 과정 data-api |

| Credential | 연결할 노드 | 헤더 |
| --- | --- | --- |
| `dubakwi-team-key` | support B01 | `X-Team-Key` |
| `dubakwi-internal-key` | support B04·B14·B15·B27, handoff mock 입력 | `X-Internal-Key` |
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

## VM 시험 결과

R01이 2026-11-05에 실행하고 보고한 결과다. R02가 직접 관측한 값이 아니다.

| 항목 | 결과 |
| --- | --- |
| 기준 | PR #16 `06863b3`. VM에서 생성한 파일 4개의 SHA-256 일치 |
| Credential | 실제 ID 참조 8곳 연결 확인 |
| 인증 | support와 mock handoff 모두 키 없음·틀린 키 403 |
| 사례 | 20사례 첫 실행 20/20, 추가 재시도 없음 |
| 실제 호출 | 사용자 조회, B14 검색, L01~L03 모델 |
| mock | state·handoff·DLQ. 실제 R04 하위 워크플로우 호출 0건 |
| 종료 | 사본 4개 비활성화, 두 시험 경로 404. 기존 P11·RAG·Credential 보존, n8n 재시작 없음 |

고정 커밋의 연결 시험이다. 실제 state·DLQ·Jira 성공이나 공식 전체 통과가 아니다. LN07이 8.184초라 WF-11 전체 시간 기준 통과도 아니다. 20/20은 한 번의 실행이라 아래 L03 오판 한계를 지우지 않는다. `06863b3` 이후의 save 실패 처리 수정(`dc6eb8e`)과 `--user-api`는 이 시험 범위 밖이다.

## 로컬 예행 결과

로컬 n8n 2.42.6에서 묶음 사본을 게시하고 실제 모델과 main의 R03 검색으로 호출했다. VM 시험이 아니다.

| 실행 | 결과 | 비고 |
| --- | --- | --- |
| [1차](../../runs/public/20261105-140528-local-n8n-p19-vm-bundle/summary.json) | 18/20 | L03 수정 전. LN14(당시 "화성" 문장), LN20 실패 |
| [2차](../../runs/public/20261105-140827-local-n8n-p19-vm-bundle-2/summary.json) | 19/20 | L03 수정 전. LN14를 WF-03 문장으로 교체, LN20 실패 |
| [L03 수정 후 회귀](../../runs/public/20261105-142926-local-n8n-p19-l03-regression/summary.json) | 19/20 | LN10 1회 `verification_failed` |
| [save 실패 처리 수정 후 회귀](../../runs/public/20261105-144236-local-n8n-p19-save-failure/summary.json) | 20/20 | 이 한 번의 결과다. 비슷한 문장의 오판은 계속 나올 수 있다 |
| [L03 수정 후 R05 사례](../../runs/public/20261105-143008-local-n8n-p19-l03-r05/summary.json) | 19개 3회 응답 칸 통과 | R05 `61dd421`. WF-04·09·10·11, TC03은 제외 |

[L03 수정 비교](../../runs/public/20261105-143502-local-n8n-p19-l03-verifier/summary.json): 대표 문장 20회 중 자동 답변이 수정 전 12회, 최종 20회다. 일부러 지어낸 문장을 넣은 대조 시험에서도 거절이 늘었다.

save 실패 경로는 state mock이 `ok:false`, `tickets_down`을 돌려주는 별도 사본으로 로컬 n8n에서 확인했다. 일반 문의와 긴급 문의 모두 200 담당자 이관, `reason=tickets_down`이었고 긴급은 priority high를 유지했다. 이 묶음의 기본 state mock은 save 성공을 돌려주므로 VM 시험에서는 이 경로를 지나지 않는다.

[R03 PR #31 지식 확인](../../runs/public/20261105-160847-local-n8n-p19-pr31-knowledge/summary.json): 표현과 WF01 근거는 맞았다(자동 답변 전부 `5자리`와 QR 절 인용, "챗봇" 표현 0건). 다만 대표 문장 자동 답변은 20회 중 17회로 L03 수정 직후의 20회보다 줄었고, [회귀](../../runs/public/20261105-160555-local-n8n-p19-pr31-regression/summary.json)도 18/20이다. 실패는 번호 생략 오판이다. [R05 사례](../../runs/public/20261105-160642-local-n8n-p19-pr31-r05/summary.json)는 19개 3회 응답 칸 통과다.

[L02 공개 대표번호 수정 비교](../../runs/public/20261105-163443-local-n8n-p19-l02-compare/summary.json): PR #31 색인 기준 대표 문장 자동 답변이 20회 중 17회에서 30회 중 29회가 됐다. 남은 1회는 `llm_down`이고 번호 생략 오판은 없었다. "QR 대여 방법"은 10회 중 5회에서 10회가 됐고, "QR로 대여하는 방법"은 20회 중 12회에서 13회로 거의 그대로다. [회귀](../../runs/public/20261105-163143-local-n8n-p19-l02-regression-2/summary.json) 19/20, [R05 사례](../../runs/public/20261105-163225-local-n8n-p19-l02-r05-2/summary.json)는 19개 중 18개 3회 통과이고 WF-03은 1회가 보완 질문이었다.

[R03 PR #31 `06e9223` 확인](../../runs/public/20261105-165038-local-n8n-p19-pr31b-check/summary.json): 대표 문장 30회, WF01 문장 10회 모두 자동 답변이고, WF-12 5회는 `privacy-security-guide` 근거의 긴급 이관, TC04 5회는 사람 판단 이관이다. "QR로 대여하는 방법"은 20회 중 14회다. [회귀](../../runs/public/20261105-164815-local-n8n-p19-pr31b-regression/summary.json)와 [R05 사례](../../runs/public/20261105-164859-local-n8n-p19-pr31b-r05/summary.json)를 같은 구성에서 다시 실행해 각각 18/20(LN07 검증 실패 이관, LN14 보완 질문), 19개 3회 응답 칸 통과다.

DLQ 계약 수정 후 [회귀](../../runs/public/20261105-170027-local-n8n-p19-contract-fix-regression/summary.json) 20/20, [R05 사례](../../runs/public/20261105-170112-local-n8n-p19-contract-fix-r05/summary.json) 19개 3회 응답 칸 통과다. 한 번의 실행이라 아래 한계를 지우지 않는다.

B27 15초와 재전송·DLQ ID 수정 후 [회귀](../../runs/public/20261105-184305-local-n8n-p19-b27-regression/summary.json) 20/20이다.

알려진 문제가 VM에서도 나올 수 있다. 실패를 지우거나 재시도로 숨기지 않고 그대로 기록한다.

- **L03 과도 판정 잔존:** L02 수정 뒤 번호 생략 이유는 줄었지만, 문장에 여러 근거 문서가 섞이면 L03이 말 바꿈이나 문서 간 차이를 실패로 보는 경우가 남았다. "QR로 대여하는 방법 알려주세요"는 20회 중 7회 `verification_failed`다. 안전한 쪽(이관)으로 끝난다.
- **지어낸 내용 일부 통과:** 작성 단계를 고정한 대조 시험에서 "대여소 직원에게 요청하면 대신 대여해 줍니다"는 5회 모두, "앱을 삭제한 뒤 다시 설치하면 해결됩니다"는 5회 중 2회 통과했다. 수정 전에는 둘 다 5회 모두 통과했다.
- **전제 확인 부족:** "따릉이를 화성에서 대여하려면" 문장은 검색 점수 0.44로 근거가 잡혀 화성 전제를 지적하지 않고 대여 절차를 안내했다(L03 수정 전 관측).

[도구 안내](README.md)
