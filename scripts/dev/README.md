# 개발과 공개 범위 관리 도구

담당 R01, 비밀/데이터 검토 R04, 재현/참조 검토 R05.

현재 폴더에서 개발하고 Git으로 공개한다. [공개 정책](../../docs/PUBLICATION.md)과 `.gitignore`가
원본이다. 기본 검사는 다음과 같다.

```sh
uv run --locked python scripts/test/check_public_files.py
git status --short
git add --dry-run .
```

검사기는 Git의 추적/새 파일 후보·강제 추가된 제외 파일·알려진 비밀 형태와 공개 링크를 확인한다.
커밋·원격 생성·업로드는 하지 않는다. 현재 작업 파일을 검사하며 이미 스테이징한 내용과 작업 파일이
다르면 실제 staged diff도 별도로 확인한다.

## 선택적 ZIP 내보내기

`export_public.py`와 `public-files.json`은 기존 스냅샷 생성용 보조 도구다. 일상 개발에 필요하지 않다.
`uv run --locked python scripts/dev/export_public.py --output dist/public-002`처럼 새 출력 경로를
사용하며 기존 출력은 덮어쓰지 않는다. Git 공개 경로 변경 시 필요하면 이 보조 목록도 갱신한다.

[Python 기준](../../docs/PYTHON-DEVELOPMENT.md)·[문서 검사](../test/README.md)

## n8n 가져오기용 사본 만들기 (R04)

`workflows/dubakwi-handoff.json`은 Jira 주소(`__JIRA_BASE_URL__`)와 역할별 담당 계정(`__ASSIGNEE_MAP_JSON__`)을
자리표시자로만 둔다. 값은 Git 밖에서 넣는다. 담당 매핑이 없으면 handoff는 배정하지 않고 안전하게 실패한다.

```sh
uv run --locked python scripts/dev/render_n8n_workflow.py --source workflows/dubakwi-handoff.json --jira-base https://<jira-host> --assignee-map-file <Git 밖 경로>/assignee-map.json --output runs/private-render/dubakwi-handoff.json
```

- 출력은 Git 제외 경로인 `runs/`(공개용 `runs/public` 제외)에만 쓴다. 값이 안전하지 않으면(따옴표·공백·http 등) 만들지 않는다.
- 만든 사본을 n8n에 가져온 뒤 Credential(`dubakwi-internal-key`, `dubakwi-Jira SW Cloud account`)과 state 하위 워크플로우를 연결한다. 이 도구는 Credential ID를 다루지 않는다.
- `dubakwi-state.json`의 Jira 확인 노드(S09·S16)도 같은 `__JIRA_BASE_URL__`를 쓰므로 같은 방법으로 사본을 만든다.

errors 워크플로우(`dubakwi-errors.json`, PR #28)는 `--scope dubakwi-dev`로 `importedScope` 대입값만 치환한다.
값은 support의 scope와 같아야 한다. 같은 문자열이 비교식에도 있으므로 전체 문자열 치환은 쓰지 않는다(저장이 항상 차단됨).

### Jira 종료만 실패시키는 시험 사본 (R01 TC17 준비)

`make_close_fault_copy.py`는 handoff 사본에서 종료 전환 요청(H33)의 전환 ID만 존재하지 않는 값으로 바꾼다. 생성·bind·조회·담당 지정은 원본과 같다. Jira가 거절하면 H36이 `closed=failed`, `partial_effect`, 복구 캡슐(close)을 남긴다.

```bash
uv run --locked python scripts/dev/make_close_fault_copy.py --output runs/private-render/dubakwi-handoff-close-fault.json
```

- 주입: 만든 사본을 `render_n8n_workflow.py`로 치환한 뒤 별도 시험용 워크플로우로 가져온다(공유·운영 사본에는 가져오지 않는다). 이름에 ` close-fault`가 붙고 비활성으로 만들어진다.
- 해제: 시험이 끝나면 그 시험 사본을 삭제하거나 비활성으로 둔다. 원본 `workflows/dubakwi-handoff.json`은 바뀌지 않으므로 원본을 다시 렌더링해 가져오면 정상 동작으로 돌아간다.
- 이 도구는 n8n·Jira를 호출하지 않는다. 실제 Jira 종료 거절 응답과 DLQ 저장은 별도 시험 사본에서 실행해 확인해야 한다(미실행).

## 병렬 계약 로컬 감사

저장소 루트에서 `node scripts/dev/audit-parallel-contract.js .`를 실행한다. 실제 support/handoff의 Code 노드를 모의 입력으로 호출하고 공통 기준 예제와 대조한다. HTTP·Jira·DB·VM을 호출하지 않는다. 출력의 `implementation_gap`은 미래 계약 대비 구현 차이이며 기존 S1 회귀 실패를 뜻하지 않는다. 종료 코드 0은 감사 실행 완료이고 전체 계약 통과를 뜻하지 않는다. 새 결과는 새 실행묶음 경로에 저장하며 과거 summary를 덮어쓰지 않는다.

## 전체 수정 계획 누락 검사

`uv run --locked python scripts/dev/check_full_system_coverage.py`는 대조표와 계획의 64개 ID·원래 완료 조건·담당 작업·예정 시험·의존성 순환·S10 미구현 한계와 Jira 문맥 fixture를 검사한다. `--output <새 경로>`로 새 증거를 저장할 수 있다. 검사 통과는 계획 연결의 완전성이며 기능·VM 시험의 통과가 아니다. 정식 cases/runner 연결은 R05 후속 작업이다.

## 인증 입구 실행 이력 보존 제한

`protect_n8n_execution_data.py --source <렌더한사본> --output runs/private-render/<새파일>.json`은 Header Auth Webhook 사본의 성공/실패/수동/진행 저장만 해제한다. `uv run --locked python`으로 실행하며 출력 덮어쓰기를 거절한다. API나 VM은 변경하지 않고 업무 노드·연결·Credential을 보존한다. 이력 보존을 끄는 도구이며 실행 중/삭제 대기 DB 원문 미저장이나 과거 자료 삭제를 보장하지 않는다. 실제 적용·시험 관측은 [보안 기준](../../infra/execution-data-security.md)을 따른다.

## PR36 문맥 원본·가져오기 후보

`uv run --locked python scripts/dev/build_case_context_nodes.py`는 JS 공통 문맥 소스를 state/handoff JSON에 반영한다. `--check`는 원본과 생성본의 일치만 검사하며 API를 호출하지 않는다. JS/Python 파서는 같은 공격 fixture로 대조한다.

가져오기 사본은 기존 render 도구의 `--context-authors-file <비공개 JSON 배열>`과 `--assignee-map-file <비공개 역할 매핑>`을 사용한다. 실제 서비스 댓글 작성 계정은 담당 배정 계정과 구분한다. 값은 Git 제외 runs/ 사본에만 들어가며 미치환 상태는 활성화하지 않는다.

보안 이미지·DB·API·묶음 반입 조건은 [로컬 통합 후보](../../infra/pr36-local-candidate.md)를 따른다.
