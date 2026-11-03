# Python 개발 환경과 품질 기준

Python 3.12·uv 프로젝트·Ruff 린트/포맷을 공통 개발 기준으로 사용한다. 실제 비즈니스 기능은 아직 구현하지 않았다. n8n 중심의 오케스트레이션은 유지하며, Python 로직의 호출/배포 경계는 구현 시 R02/R04가 계약과 함께 정한다. Discord 채널은 Python Gateway 봇을 Compose 별도 서비스로 두는 기본안이며 API 서버 신설은 전제하지 않는다. SDK·추가 의존성은 D07에서 확인 후 uv로 잠근다.

## 1 환경과 실행

uv가 설치된 환경에서 프로젝트 루트에서 실행한다. `.python-version`은 Python 3.12 계열, `pyproject.toml`은 지원 범위·의존성·Ruff 설정, `uv.lock`은 해결된 버전의 원본이다. `.venv`는 커밋하지 않는다.

```powershell
uv sync --locked
uv run --locked python scripts/test/check_project_docs.py
uv run --locked ruff check .
uv run --locked ruff format --check .
```

Python 3.12가 없으면 `uv python install 3.12`로 준비한다. OS별 Python 패치 버전은 달라질 수 있으며 실행 보고서에는 실제 버전을 기록한다. CI·배포에서 같은 잠금 파일을 사용한다. Git 공개 범위는 같은 작업 폴더의 .gitignore로 관리하고 ZIP 복사를 필수로 하지 않는다. 설치 없는 임의 전역 pip 환경을 공동 기준으로 삼지 않는다.

## 2 의존성과 코드 스타일

- 일반 실행 의존성은 `uv add <패키지>`, 개발 도구는 `uv add --dev <패키지>`로 추가한다. 현재 실행 의존성은 없고 Ruff만 개발 의존성이다. 실제 필요 전 웹 프레임워크·DB 드라이버·테스트 프레임워크를 미리 추가하지 않는다.
- 변경 시 pyproject와 uv.lock을 함께 검토한다. 평소 설치는 `uv sync --locked`, 의존성 변경은 uv의 잠금 갱신 결과와 시험을 검토한다. 잠금 파일을 수동 편집하지 않는다.
- Ruff는 Python3.12·100자 폭·큰따옴표·스페이스4칸·LF를 사용한다. 새 Python 모듈 파일명은 `snake_case.py`다. 문서·일반 파일명 하이픈 규칙의 Python 예외다.
- 개발 중 `uv run --locked ruff check --fix .`, `uv run --locked ruff format .`으로 자동 수정한 뒤 diff를 확인한다. CI는 자동 수정 없이 check만 수행한다.
- 검사 범위는 현재 새 개발/시험 도구와 향후 Python 코드다. `scripts/research/`·docs·data·tmp·dist는 Ruff에서 제외한다. 기존 조사 스크립트의 재현 결과·보존 사본을 일괄 포맷하지 않는다. 해당 영역을 수정할 때 별도 재현 검토한다.
- Ruff는 테스트·권한·외부 효과·비밀 검사를 대체하지 않는다. 변경 기능에 맞는 시험과 문서 동기화를 함께 수행한다.

## 3 향후 Python 코드와 책임

공유 가능한 업무 로직이 생기면 `src/ttareungi_support/`, 해당 로직의 시험은 `tests/`에 둔다. 현재 두 경로는 생성 전이다. 소유자는 기능에 따라 본체 R02·RAG R03·연동/저장 R04, 시험 취합 R05다. 파일마다 기능 소유자 1개 역할을 인계 기록에 지정한다.

현재 tool.uv.package=false인 도구 프로젝트이므로 src 패키지의 자동 설치/실행을 구현했다고 가정하지 않는다. 첫 업무 모듈을 추가할 때 R01과 모듈 소유자가 빌드/설치·entrypoint·n8n 호출과 Docker 실행을 D03/D07에서 결정하고 실제 명령을 이 문서/infra에 추가한다. 업무 시험은 tests 경로에 두고 선택한 프레임워크/의존성·CI 명령을 함께 갱신한다. 현재 unittest는 개발 도구의 경계 시험용이며 서비스 시나리오 통과를 뜻하지 않는다.

공통 Python 설정/잠금·CI는 R01, 품질/문서 검사 도구는 R05, 공개 패키지 생성 도구는 R01이 소유한다. 의존성 요청은 해당 기능 역할이 제공하고 R01이 통합 환경 영향을 확인한다. n8n Code 노드와 Python 파일 사이에 서로 다른 원본을 복제하지 않는다.

공식 기준: [uv 잠금과 동기화](https://docs.astral.sh/uv/concepts/projects/sync/)·[개발 의존성](https://docs.astral.sh/uv/concepts/projects/dependencies/)·[Ruff 설정](https://docs.astral.sh/ruff/configuration/). 도구 설정·잠금 버전은 실제 로컬 명령으로 검증한다.

[작업 규칙](../AGENTS.md) · [공개 정책](PUBLICATION.md) · [개발 계획](DEVELOPMENT-PLAN.md)
