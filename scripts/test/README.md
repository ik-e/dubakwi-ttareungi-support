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

## 서비스 사례 실행 도구

`run_cases.py`는 [공통 사례](../../cases/common.json)·[팀 사례](../../cases/team.json)의 요청을 support Webhook에 보내고 응답을 판정한다. 담당 R05, 대상 기능 R02/R04. 표준 라이브러리만 사용한다.

```powershell
# 요청만 만들어 확인(전송·파일 생성 없음)
uv run --locked python scripts/test/run_cases.py --url <webhook-url> --env local --desc p13-entry --path mock --dry-run
# 첫 VM 입구 시험 예. 인증값은 환경변수에만 둔다
$env:DUBAKWI_WEBHOOK_TOKEN = "<n8n Credential과 같은 값>"
uv run --locked python scripts/test/run_cases.py --url <webhook-url> --env vm --desc p13-entry --path data-api --case WF08 WF13 --auth-header <헤더 이름> --workflow-version <커밋 또는 내보내기 버전>
```

- 실행묶음 ID는 `YYYYMMDD-HHMMSS-<env>-<desc>`(KST)이며 이미 있으면 `-2`부터 접미사를 붙인다. 요청 request_id 앞에 이 ID를 붙여 실행마다 고유하게 만들고 64자를 넘으면 전송 전에 멈춘다.
- 공유용 가린 요약은 `runs/public/<실행묶음ID>/summary.json`, 요청·응답 원문과 URL은 Git 제외 경로 `runs/<실행묶음ID>/raw.json`에 쓴다. 공개 요약에는 답변 원문·URL·인증값을 넣지 않는다. 인증값은 어느 파일에도 쓰지 않는다. 기존 결과는 덮어쓰지 않는다.
- 자동 판정은 응답 상태·응답 필드·공통 검사 G01/G02/G03/G05·지정 시간 한도다. 티켓·처리 상태·DLQ·알림·n8n 실행 기록·수동 판정은 `unverified`/`manual`로 남는다.
- 사례 상태는 `pass`(열린 항목 없음), `auto_pass_unverified`(응답 판정만 통과, 완전 통과 아님), `fail`, `blocked`(고장 주입·사전 준비·운영자 단계가 필요해 전송하지 않음), `dry_run`이다. `fail`이 있으면 종료 코드 1, 입력·설정 오류는 2다.
- `--path`에 data-api/jira/mock을 기록한다. data-api 결과를 Jira 연동 증거로 쓰지 않는다. 고장 주입·해제와 티켓/DLQ 조회 자동화는 R04가 방법을 정한 뒤 추가한다.
- 경계 시험: `uv run --locked python -m unittest scripts/test/test_run_cases.py`. 가짜 Webhook으로 판정·차단·비밀/원문 비노출·덮어쓰기 방지를 확인하며 실제 n8n 동작 확인이 아니다.

조사·보존 해시·전체 저장소 검사는 기존 [조사 문서 검사 — 공개본 제외 자료](../../docs/PUBLIC-SOURCES.md)를 사용한다. 기존 임시 Mermaid 검사 환경은 정식 도구가 아니며 [임시 기록 — 공개본 제외 자료](../../docs/PUBLIC-SOURCES.md)에서 한계를 확인한다. 서비스 시험/검색 측정 도구는 실제 구현 때 이 경로에 추가하고 사용법·입출력·고장 복원 방법을 기록한다.

[도구 목록](../README.md) · [작업 규칙](../../AGENTS.md)

## P06/P07/P13 통합 검토 기준 (2026-11-04)

[PR #7](https://github.com/ik-e/dubakwi-ttareungi-support/pull/7)은 사례·실행 도구 초안 공유다. 모든 사례는 not_run을 유지하며 도구 단위시험 결과를 서비스 통과 수로 쓰지 않는다. 가이드 설명 원문 일부 대조와 실제 공통 fixture·실행 검증은 구분한다. R01의 이번 안내 대리 편집 범위는 개발 원장에 기록한다.

- 본체는 `POST /webhook/dubakwi-support`, Header Auth 헤더는 `X-Team-Key`다. run_cases.py는 `--auth-header X-Team-Key --auth-token-env DUBAKWI_WEBHOOK_TOKEN`으로 환경변수의 키를 읽는다. 과정 flow.py는 `FLOW_WEBHOOK_KEY`를 사용하므로 도구별 변수 이름을 혼동하지 않는다.
- 실제 VM URL·키는 R01과 담당자가 환경 연결을 확인한 뒤 비공개 전달한다. 실행 기록에는 `--workflow-version`·`--config-version`을 실제 배포/설정 식별자로 지정한다. 예시 주소나 unrecorded를 실배포 확인 증거로 쓰지 않는다.
- 사례는 이 도구의 자체 스키마다. 과정 flow.py가 직접 읽을 수 있는지는 미확인이다. 공식 도구 사용이 필요한 점검/제출에는 R05가 변환 또는 별도 호환 사례를 준비하고 공통 판정 강도를 유지한다.
- WF07의 원문 필수 조건은 연락처 가림·masked>=1이며 자동 답변 route는 팀 본인 조회 설계에서 정한 기대값이다. WF13은 400·codes가 필수다. 현재 invalid_input/unknown_user 기대와 R02 tk 4b3d3b7의 대응은 정적 확인이며 실제 서비스 시험은 아니다.
- 응답 자동 판정 밖의 티켓·상태·DLQ·알림·n8n 확인과 고장 설정/해제는 R04/R05가 준비 후 수행한다. blocked·unverified를 통과로 바꾸지 않는다.
- 각 작업자는 check_public_files로 후보를 검사하고, R01은 최종 병합 후보를 Gitleaks로 검사한다. tscan이 없으면 미실행 사실과 대체 검사·한계를 기록한다. Gitleaks 설치 파일/도구 경로·실제 키는 공개 필수 의존성으로 추가하지 않는다.
