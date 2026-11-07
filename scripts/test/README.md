# 프로젝트 검증 도구

같은 작업 폴더에서 공개 범위는 `uv run --locked python scripts/test/check_public_files.py`로 검사한다.
실제 Git 추적/미추적 후보·강제 추가된 제외 파일·알려진 비밀 패턴·공개 링크 완결성을 확인한다.
파일이 로컬에 존재해도 Git 후보가 아니면 공개 링크 대상으로 인정하지 않는다. 실제 개인정보의 모든
형태와 과거 커밋을 자동 보장하지 않으며 스테이징 내용이 작업 파일과 다르면 staged diff도 확인한다.

담당 R05, 관련 계약·기능 검토 R02/R03/R04. 프로젝트 루트에서 실행한다.

```powershell
python scripts/test/check_project_docs.py
python scripts/test/check_project_docs.py --output docs/project/reviews/<새로운-증거파일명>.json
```

권장 실행은 `uv sync --locked` 후 `uv run --locked python scripts/test/check_project_docs.py`다. 공개 경계 시험은 `uv run --locked python -m unittest discover -s scripts/test -p "test_*.py"`로 실행한다.

Python 표준 라이브러리만 사용한다. 현재 팀 문서와 진입/작업/배포 안내의 로컬 파일 링크·앵커·표 열 수를 확인한다. 예시 코드 블록과 외부 URL 연결 상태·Mermaid 문법·업무 의미·실제 n8n/Jira/DB 동작은 검사하지 않는다. 출력 파일이 이미 있으면 거절하며 이전 검증 증거를 덮어쓰지 않는다.

Windows에서 `python`이 Microsoft Store 별칭이면 같은 명령의 실행기를 `py -3`으로 바꾼다. 현재 Windows 환경에서는 `py -3 scripts/test/check_project_docs.py`로 확인했다.

P11 support 골격의 Code 노드 로컬 시험은 `node scripts/test/support-skeleton-cases.js [--workflow <json>] [--label <이름>] [--output runs/public/<실행묶음ID>/summary.json]`로 실행한다. JSON의 jsCode를 Node.js에서 실행하고 connections를 따라 진행하며 B04·B35 HTTP는 대체값을 쓴다. 실패 시 종료 코드 1이고 기존 출력 파일은 덮어쓰지 않는다. unittest의 `test_support_skeleton.py`도 같은 시험을 실행한다. n8n 가져오기·Webhook·data-api 실호출·VM·WF-08/13 공식 판정을 대신하지 않는다.

`mocks/`의 state·dlq·search·handoff 워크플로우는 로컬 시험 전용이며 실제 저장·Jira를 호출하지 않는다. TC08은 `uv run --locked python scripts/test/make_verifier_fault.py --output <새 파일>`로 만든 사본을 시험 환경에만 게시한다. 모드는 `grounded`, `unparsable`, `unknown_chunk`(TC08-v1)다. 사본 경로는 `/webhook/dubakwi-support-tc08`이고 원본과 동시 게시할 수 있으며, 출력되는 모드와 SHA-256을 결과에 남긴다.

R05 사례 응답은 `support_route_compare.py`로 3회씩 flow.py 칸만 대조하며 결과는 "응답 칸 통과"다. 실행마다 `--search-source`에 실제 검색 구성을 적는다. mock 하위 기능과 과정 data-api 직원을 쓰므로 sources·티켓·저장 판정과 공식 판정을 대신하지 않는다.

VM P19 연결 시험 사본과 전용 mock은 `make_vm_p19_bundle.py`로 만든다. 게시 순서·ID 대응표·입력·기대값은 [VM P19 mock 시험](vm-p19-mock-test.md)을 따른다.

`fake_jira.py`는 로컬 예행 전용 가짜 Jira다. 실제 Jira 통과 증거로 쓰지 않는다. 실제 state·DLQ·handoff 연결 사본은 `make_vm_p19_real_bundle.py`로 만든다. 대응표와 S1 통과 기준은 [VM P19 실제 연결 시험](vm-p19-real-test.md)을 따른다.

TC-07의 복구 저장 계약은 disposable PostgreSQL에 migrations 001~016을 적용해 확인한다. 운영자 입력·finish capsule 계약은 `node scripts/test/tc07-operator-workflow-contract.js` 및 `node scripts/test/tc07-finish-capsule-contract.js`로, handoff가 종료·배정·검증 snapshot이 생성된 문맥 갱신 실패 인자를 가린 recovery capsule에 보존하는지는 `node scripts/test/tc07-handoff-recovery-capsule-contract.js`로 확인한다. 이는 외부 Jira/Discord 조작이나 VM migration 적용을 대신하지 않는다.

`build_knowledge_search_mock.py`는 승인 전 지식으로 답하는 시험용 search를 만든다. 산출물은 커밋하지 않고 실제 검색 평가에 쓰지 않는다.

게시된 n8n의 Webhook 호출은 `SUPPORT_TEAM_KEY=<시험 키> uv run --locked python scripts/test/support_skeleton_live.py --url <Webhook URL> [--output runs/public/<실행묶음ID>/summary.json]`로 확인한다. 키는 결과에 남기지 않는다. n8n 게시 직후 결과가 이전 버전으로 나올 수 있어 실패하면 잠시 뒤 다시 확인하고 최초 결과를 보존한다. VM·공식 판정을 대신하지 않는다.
## 서비스 사례 실행 도구

사례 파일은 실습 키트 `tools/flow.py test`의 형식(`webhook`·`before`/`after`·`name`·`body`·`expect`의 `status`/`equals`/`contains`/`not_contains`/`max_seconds`)을 따른다. 공식 실행·결과서 증거는 키트의 `flow.py test`이며, 팀 확장 칸 `x_dubakwi`(추가 판정·미확인 항목·여러 단계)를 flow.py가 무시하는지는 키트에서 확인해야 한다.

| 파일 | 실행 도구 | 내용 |
| --- | --- | --- |
| [공통 사례](../../cases/common.json) | flow.py test, run_cases.py | 공통 14유형(17건). WF-10은 `flow.py llm down/up`을 손으로 켜고 끈다 |
| [팀 사례](../../cases/team.json) | flow.py test, run_cases.py | 한 번 전송으로 판정되는 팀 사례 |
| [팀 확장 사례](../../cases/team-extended.json) | run_cases.py 전용 | 앞 응답 값을 넘기는 여러 단계, 사전 준비·시험용 설정·운영자 조작이 필요한 사례 |

`run_cases.py`는 같은 파일을 읽어 support Webhook에 보내고 응답을 판정한다. flow.py로 돌릴 수 없는 팀 확장 사례와 로컬 가짜 서버 확인용이다. 담당 R05, 대상 기능 R02/R04. 표준 라이브러리만 사용한다.

```powershell
# 요청만 만들어 확인(전송·파일 생성 없음)
uv run --locked python scripts/test/run_cases.py --env local --desc p13-entry --path mock --dry-run
# 첫 VM 입구 시험 예(P11 골격의 mock 경로). 인증값은 flow.py와 같은 환경변수에만 둔다
# VM에 data-api가 없으므로 --no-hooks로 파일 앞 tickets-reset을 건너뛴다(세 사례는 자체 고장 설정이 없어 그대로 전송)
$env:FLOW_WEBHOOK_KEY = "<팀 키>"
uv run --locked python scripts/test/run_cases.py --base-url <n8n 주소> --env vm --desc p13-entry --path mock --case WF08 WF13a WF13c --no-hooks --auth-required --workflow-version <커밋 또는 내보내기 버전>
# WF13b(미등록 사용자)는 사용자 조회용 data-api 준비 후 같은 방식으로 실행한다
# P13 공식 입구 시험(data-api 연결 후): 입력 거절·미등록·등록 사용자 골격 응답과 B35 로그를 함께 판정한다
# data-api는 VM 내부 주소이므로 VM에서 실행하거나 터널로 --data-api를 지정한다
uv run --locked python scripts/test/run_cases.py --base-url <n8n 주소> --data-api <data-api 주소> --env vm --desc p13-official --path mock --cases-file cases/common.json cases/p11-entry.json --case WF08 WF13a WF13b WF13c P11-01 --no-hooks --check-logs --auth-required --workflow-version <커밋 또는 내보내기 버전>
# TC08(답변 검증 실패): R02 사본을 만들어 게시한 뒤, 출력된 모드·sha256을 넘긴다. 두 모드는 같은 경로라 하나씩 게시한다
# 사본 도구는 PR #16 병합 전까지 r02/p19-support-flow에만 있다. 원본이 바뀌면 sha256도 바뀌므로 시험마다 새로 만든다
# 사본도 state·handoff를 호출하므로 VM에 두 하위 워크플로우가 있어야 실행할 수 있다
uv run --locked python scripts/test/make_verifier_fault.py --output <새 파일> --mode grounded
uv run --locked python scripts/test/run_cases.py --base-url <n8n 주소> --env vm --desc p13-tc08 --path mock --case TC08 --test-copy-mode grounded --test-copy-sha256 <출력된 sha256> --auth-required --workflow-version <커밋>
```

- 웹훅은 사례 파일의 `webhook`(dubakwi-support), 인증 머리글은 `X-Team-Key`가 기본이다. `--data-api`로 before/after 주소의 `http://localhost:8800`을 바꿀 수 있다. `after`는 사례가 실패해도 실행한다.
- 실행묶음 ID는 `YYYYMMDD-HHMMSS-<env>-<desc>`(KST)이며 이미 있으면 `-2`부터 접미사를 붙인다. 요청 request_id 앞에 이 ID를 붙여 실행마다 고유하게 만들고 64자를 넘으면 전송 전에 멈춘다.
- 공유용 가린 요약은 `runs/public/<실행묶음ID>/summary.json`, 요청·응답 원문과 URL은 Git 제외 경로 `runs/<실행묶음ID>/raw.json`에 쓴다. 공개 요약에는 답변 원문·URL·인증값을 넣지 않는다. 인증값은 어느 파일에도 쓰지 않는다. 기존 결과는 덮어쓰지 않는다.
- 자동 판정은 응답 상태·응답 필드·공통 검사 G01/G02/G03/G05·지정 시간 한도다. 티켓·처리 상태·DLQ·알림·n8n 실행 기록·수동 판정은 `unverified`/`manual`로 남는다.
- 사례 상태는 `pass`(열린 항목 없음), `auto_pass_unverified`(응답 판정만 통과, 완전 통과 아님), `fail`, `blocked`(`requires`·운영자 단계·수동 고장·`--no-hooks`로 전송하지 않음), `dry_run`이다. `fail`이 있으면 종료 코드 1, 입력·설정 오류는 2다.
- `--check-logs`를 주면 사례마다 data-api `GET /logs`를 읽어 B35 기록을 판정한다. L01 같은 request_id 기록 있음, L02 기록의 route·status가 응답과 같음, L03 질문 원문이 기록에 없음. `/logs`를 읽지 못하면 실패가 아니라 미확인으로 남긴다. 응답 모양(목록 또는 logs/items/data 칸)은 키트에서 확인해야 한다.
- [P11 입구 사례](../../cases/p11-entry.json)는 P19 게시 전까지만 쓰는 임시 사례다. 등록 사용자 조회 성공 경로의 골격 응답(`reason=skeleton_mock`)을 보며 업무 성공으로 세지 않는다. 기본 사례 목록에 없으므로 `--cases-file`로 지정한다.
- `x_dubakwi.test_copy`가 있는 사례(TC08)는 `--test-copy-mode`·`--test-copy-sha256`을 함께 줄 때만 사본 webhook(`dubakwi-support-tc08`)으로 보내고, 없으면 blocked다. 모드·해시는 공개 요약에 남는다. 다른 사례는 원본 webhook으로 그대로 보낸다.
- WF-09 2/2는 두 응답의 `ticket_id`·`priority`가 같고 2번째 `ticket.duplicate=true`인지 본다(R02·R05 제안 판정, PR #16). 티켓 1건과 D02 대조가 남아 있어 완전 통과로 기록하지 않는다.
- `contains`는 목록 항목이 값과 같거나 항목의 필드 값이 같을 때(예: `sources`의 `doc`), 문자열이면 부분 문자열일 때 통과로 본다. flow.py의 실제 해석과 다르면 키트에 맞춘다.
- run_cases.py는 request_id 앞에 실행묶음 ID를 붙이고 flow.py는 고정 ID를 보낸다. 요청 상태를 저장소에 남기는 설계에서는 flow.py 반복 실행이 재전송으로 판정될 수 있다.
- `--path`에 data-api/jira/mock을 기록한다. data-api 결과를 Jira 연동 증거로 쓰지 않는다. 티켓/DLQ/알림 조회 자동화와 R02/R04 시험용 설정은 방법이 정해진 뒤 추가한다.
- 경계 시험: `uv run --locked python -m unittest scripts/test/test_run_cases.py`. 가짜 Webhook·data-api로 판정·고장 켜기/끄기 순서·차단·비밀/원문 비노출·덮어쓰기 방지와 저장소 사례 파일 모양을 확인하며 실제 n8n 동작 확인이 아니다.

조사·보존 해시·전체 저장소 검사는 기존 [조사 문서 검사 — 공개본 제외 자료](../../docs/PUBLIC-SOURCES.md)를 사용한다. 기존 임시 Mermaid 검사 환경은 정식 도구가 아니며 [임시 기록 — 공개본 제외 자료](../../docs/PUBLIC-SOURCES.md)에서 한계를 확인한다. 서비스 시험/검색 측정 도구는 실제 구현 때 이 경로에 추가하고 사용법·입출력·고장 복원 방법을 기록한다.

[도구 목록](../README.md) · [작업 규칙](../../AGENTS.md)

## P06/P07/P13 통합 검토 기준 (2026-11-04)

[PR #7](https://github.com/ik-e/dubakwi-ttareungi-support/pull/7)은 사례·실행 도구 초안 공유다. 모든 사례는 not_run을 유지하며 도구 단위시험 결과를 서비스 통과 수로 쓰지 않는다. 가이드 설명 원문 일부 대조와 실제 공통 fixture·실행 검증은 구분한다. R01의 이번 안내 대리 편집 범위는 개발 원장에 기록한다.

- 본체는 `POST /webhook/dubakwi-support`, Header Auth 헤더는 `X-Team-Key`다. run_cases.py는 과정 flow.py와 같은 `FLOW_WEBHOOK_KEY`를 먼저 읽고, 없으면 R01 시험용 환경 예시(PR #12의 `.env.example`)의 `DUBAKWI_WEBHOOK_TOKEN`을 읽는다(2026-11-04 R05 갱신).
- 실제 VM URL·키는 R01과 담당자가 환경 연결을 확인한 뒤 비공개 전달한다. 실행 기록에는 `--workflow-version`·`--config-version`을 실제 배포/설정 식별자로 지정한다. 예시 주소나 unrecorded를 실배포 확인 증거로 쓰지 않는다.
- 사례는 과정 flow.py test 형식으로 변환했다(2026-11-04 R05 갱신). 팀 확장 칸 `x_dubakwi`를 flow.py가 무시하는지, `contains` 해석, `llm down/up` 주소는 키트에서 아직 확인하지 않았다. flow.py 한 번 전송으로 판정할 수 없는 팀 사례는 cases/team-extended.json(run_cases.py 전용)에 둔다.
- WF07의 원문 필수 조건은 연락처 가림·masked>=1이며 flow.py 형식 변환에서 팀 추가 기대값이던 자동 답변 route는 판정에서 뺐다. masked>=1은 x_dubakwi 판정으로 둔다. WF13은 400·codes가 필수다. 현재 invalid_input/unknown_user 기대와 R02 tk 4b3d3b7의 대응은 정적 확인이며 실제 서비스 시험은 아니다.
- 응답 자동 판정 밖의 티켓·상태·DLQ·알림·n8n 확인과 고장 설정/해제는 R04/R05가 준비 후 수행한다. blocked·unverified를 통과로 바꾸지 않는다.
- 각 작업자는 check_public_files로 후보를 검사하고, R01은 최종 병합 후보를 Gitleaks로 검사한다. tscan이 없으면 미실행 사실과 대체 검사·한계를 기록한다. Gitleaks 설치 파일/도구 경로·실제 키는 공개 필수 의존성으로 추가하지 않는다.

## P13 hook 실패 중단 (2026-11-05 R01 인계 수정)

사용자 인계로 R01이 hook 실패 처리와 회귀시험을 대리 수정했다. 파일 수준 초기화 또는 사례 before hook이 실패하면 이후 모든 사례·파일을 blocked로 남기고 Webhook을 보내지 않는다. 사례 after hook은 응답/준비 실패에도 시도하며, 해제 실패 시 현재 응답 판정과 별도로 H01 실패를 기록하고 뒤의 모든 사례·파일을 차단한다. 수동으로 고장/초기화 상태를 확인한 뒤 새 실행묶음으로 재시험한다. `--no-hooks`는 자체 준비/고장이 없는 선택 입력 사례에만 사용하며 준비가 필요한 사례의 차단을 해제하지 않는다.

## PR36 후속 시험 준비

`make_boundary_fault_copy.py --source <실제 연결 사본> --mode <모드> --output runs/<새 사본>.json`은 create/bind/context/close/assign/alert/save/state_fail/dlq/unexpected 한 경계만 바꾼 비활성 사본을 만든다. 원본/공용 Credential을 변경하거나 실행하지 않는다. state_fail+dlq 이중 실패는 같은 scope의 별도 두 사본을 묶은 뒤 사용한다. LLM/시간 사본은 PR43의 `make_llm_time_fault.py`, 검증기 사본은 `make_verifier_fault.py`를 유지한다.

R05 runner의 `--ready TC17 TC18`은 단계별 원 실행 종료/고장 해제 확인 후 진행한다. 해제 실패는 halted이며 다음 사례를 보내지 않는다. `--no-hooks`로 필요한 고장/해제를 우회하지 않는다. TC07은 recovery/not_implemented이며 새 정상 문의를 기존 실패의 복구로 세지 않는다. 원본41개 정의와 반복·최초 실패를 보존한다.

TC-07 operator 저장 경계는 `node scripts/test/tc07-operator-workflow-contract.js`,
`node scripts/test/tc07-finish-capsule-contract.js`, PostgreSQL 16.15 disposable DB의
`infra/db/verification/controlled-recovery-contract.sql`과
`controlled-recovery-claim-release-contract.sql`,
`controlled-recovery-unknown-effect-contract.sql`로 검사한다. migrations 001~016 적용,
runtime/operator 권한 경계, claim/resume의 fresh StateRef, release 후 unknown 효과 보존과
재확인 강제, confirmed 효과의 중복 실행 없는 adopt/complete를 확인한다.
이 계약은 저장 경계만 검증하며 Jira/Discord action 실행, VM 적용, TC-07 실연동 통과를 대신하지 않는다.

Jira mock와 실제 PostgreSQL의 로컬 결과는 VM/Jira/Discord 공식 판정과 분리한다. provider 시험은 `test_records_provider.py`, 공통 문맥 fixture는 `test_case_context.py`, 최종 save amendment는 `p12-save-cases.js`가 다룬다.


`node scripts/test/p19-shared-contract-cases.js`는 공통 BeginResult golden fixture3개를 S05→B08 코드에 통과시키고, AUTH01~07의 서버 응답 대역을 B05→B13→RAG Validate 코드에 통과시킨다. HTTP/실제 사용자 조회·벡터 검색/LLM·권한 종단 판정이 아니며 공통 unittest에서 함께 실행한다.

G03 연락처 검사는 중첩된 문자열 값과 키를 검사한다. 숫자형 검색 점수·시간을 JSON
문자열로 바꿔 휴대전화로 오인하지 않는다. 문자열로 전달된 숫자나 request_id는 검사에서
제외하지 않는다. 이전 실행 결과는 보존하고 검사기 버전과 재판정 근거를 새 기록에 남긴다.
