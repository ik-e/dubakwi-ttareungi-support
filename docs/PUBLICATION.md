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

`docs/rag-knowledge/*.md`는 R03이 직접 작성하고 출처와 공개 범위를 검토한 시민 안내 초안의
공유 경로다. 원문 조사 자료와 실제 개인정보는 포함하지 않는다. 승인 전 초안은 색인에 사용하지 않는다.

2026-11-05 R01 결정: `docs/rag-knowledge/chatbot_documents/README.md`와
`source-index.md`는 직접 작성한 조사 요약·출처 목록으로 공개한다. 원문 Markdown·사진은
공개 재배포 허용 근거가 확인되지 않아 Git 제외된 팀 내부 자료로 보존한다. 교육용 표기나
자료 수집자의 공유 의사를 이용 조건 확인으로 대신하지 않는다. 원문·사진의 향후 공개는
해당 자료의 이용 조건과 내용 검토를 거쳐 별도 변경으로 처리한다. 이번 결정은 RAG 지식
승인·색인 승인이나 발표 PDF의 공개 승인이 아니다.

루트와 docs는 기본 제외 후 공개할 경로만 허용한다. 미지정 새 루트 경로나 새 문서는 자동 공개되지 않는다.
허용된 코드/입력 디렉터리의 새 파일은 Git 후보가 되므로 커밋 전 검사가 필요하다. raw/실제 개인정보를
모의 입력 이름에 넣지 않는다. 과제 제출본의 외부 자료 요구와 GitHub 공개 범위는 구분한다.

## 2 커밋과 공개 전 확인

### 2026-11-09 최종산출물·발표 공개 범위 추가

사용자가 필수산출물 최종본과 발표 자료를 main에서 확인할 수 있도록 공개 사본의 반영을 명시적으로 요청했다. R01은 기존 통합 권한으로 `submission/public/`의 검토한 Markdown·HTML·CSS·JavaScript·SVG·파일 목록 JSON을 공개한다. 원래 `submission/final/`, 팀원 원본, 내부 공유 ZIP·백업은 계속 추적에서 제외한다. 공개 사본은 [사용 안내](../submission/public/README.md)에서 읽는다.

공개에는 필수 문서 3종, 12장 HTML 발표, 대본·필수산출물 대응·시연 절차, R02 시나리오 상호작용과 직접 작성한 도표, 가린 텍스트 기록을 포함한다. 개인 식별자·계정·연락처·접속 주소와 원문 PDF·화면·이미지·강의 가이드 전문·원시 로그는 제외한다. 가이드 전문은 프로젝트 적용 요약으로, PDF/화면 버튼은 공개 텍스트와 기존 공개 검증 기록으로 연결한다. 새로운 서비스 실행이나 제3자 자료 재배포 허가를 주장하지 않는다.

루트 `.gitignore`는 이 디렉터리의 정해진 확장자만 허용한다. 생성 도구는 로컬 전체 자료에서 파생본을 만들고 입력 해시를 대조하며, 공개 검사는 로컬 원본 없이 참조가 열리는지 확인한다. 자동 패턴 검사는 개인정보·이용 조건 전체를 보증하지 않으므로 검토 범위와 미확인 사항을 [별도 기록](../runs/public/20261109-124900-local-public-submission/report.md)에 남긴다. 다른 역할의 승인 회신을 추정하지 않는다.

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
