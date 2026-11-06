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
