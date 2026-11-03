# 같은 작업 폴더에서 Git 공개 범위 관리

2026-11-03 사용자 결정에 따라 현재 폴더를 개발 원본이자 Git 작업 폴더로 사용한다.
공개 범위의 원본은 이 문서와 루트 `.gitignore`다. 외부 원문과 조사 자료를 삭제/이동하지 않고
Git 추적에서 제외한다. ZIP을 별도로 생성/복사하는 것은 필수가 아니다.

## 1 포함과 제외

| 구분 | 기준 |
| --- | --- |
| 포함 | 지정한 설계·계획·작업 규칙·uv/Ruff/CI 설정·직접 작성한 개발/시험 도구 |
| 향후 포함 경로 | src·tests·workflows·knowledge·cases·requests와 모의 data/users.json·records.json. 추가 파일은 커밋 전 내용/비밀/권한 검토 |
| 로컬 보존·추적 제외 | docs의 강의/가이드/조사/팀원 자료·서버 관측, data의 조사/학습 원본, scripts/research, 과거 검토/화면, tmp·dist |
| 항상 제외 | .env 등 실제 비밀·키·DB/볼륨/백업·가상환경·의존성/검사 캐시 |

협업 인계용 예외는 `docs/project/daily/*.md`·`docs/project/presentation/*.md`와
`runs/public/`의 검토한 JSON/Markdown이다. 원시 runs·화면·발표 바이너리와 구분하고 R05가 가림·원본
보고서와의 일치를 확인한다. JSON/Markdown 확장자만으로 공개 안전이 보장되지는 않는다.

루트와 docs는 기본 제외 후 공개할 경로만 허용한다. 미지정 새 루트 경로나 새 문서는 자동 공개되지 않는다.
허용된 코드/입력 디렉터리의 새 파일은 Git 후보가 되므로 커밋 전 검사가 필요하다. raw/실제 개인정보를
모의 입력 이름에 넣지 않는다. 과제 제출본의 외부 자료 요구와 GitHub 공개 범위는 구분한다.

## 2 커밋과 공개 전 확인

```sh
uv sync --locked
uv run --locked ruff check .
uv run --locked ruff format --check .
uv run --locked python scripts/test/check_project_docs.py
uv run --locked python scripts/test/check_public_files.py
uv run --locked python -m unittest discover -s scripts/test -p "test_*.py"
git status --short
git add --dry-run .
```

Git 후보 검사는 추적 파일과 무시되지 않은 새 파일을 확인하며, 로컬에 존재해도 공개 후보에 없는
자료로 향하는 Markdown 링크를 오류로 처리한다. 비밀 패턴 검사는 알려진 형태만 검사한다.
실제 개인정보·재배포 조건·이미지·알려지지 않은 비밀까지 자동 보장하지 않는다.

R01은 파일/범위·문서를, R04는 비밀/데이터·접속 정보를, R05는 재현·참조·실행 결과를 확인한다.
검토 후 스테이징할 때 `git diff --cached --name-only`로 실제 추가 목록을 다시 확인한다.
원격 저장소 생성·커밋·업로드는 이 문서나 검사기가 자동 수행하지 않는다.

## 3 이미 추적한 파일과 이력

`.gitignore`는 이미 추적한 파일·과거 커밋을 제거하지 않는다. 강제 추가된 제외 파일도 검사기가
거절한다. 이미 커밋된 민감 정보가 있으면 파일 제거만으로 해결됐다고 보지 않고 토큰 폐기/재발급과
이력 검토를 별도로 수행한다. 초기 공개 범위 검사 때는 로컬 Git만 초기화했으며, 이후 사용자의 명시적
업로드 요청으로 [공개 저장소](https://github.com/ik-e/dubakwi-ttareungi-support)를 생성했다. 검사기 자체는 커밋/업로드를 수행하지 않는다.

## 4 로컬 자료와 선택적 스냅샷

공개 문서의 제외 원문 링크는 [출처 안내](PUBLIC-SOURCES.md)로 연결한다. 로컬 탐색은 Git에서 제외한
`docs/LOCAL-INDEX.md`와 원래 경로를 사용한다. 코드/문서 라이선스는 팀 선택 전 임의로 부여하지 않는다.

기존 ZIP은 당시 검사한 스냅샷이며 현재 변경을 자동 반영하지 않는다. 필요할 때만
`scripts/dev/export_public.py`를 보조 내보내기로 사용할 수 있다. 그 허용 목록은 해당 보조 도구의
파일 목록일 뿐 현재 Git 공개 정책의 원본은 아니다. 일상 개발/업로드는 현재 폴더와 `.gitignore`를 기준으로 한다.

[도구 안내](../scripts/dev/README.md)·[Python 기준](PYTHON-DEVELOPMENT.md)·[팀 헌장](project/TEAM-CHARTER.md)
