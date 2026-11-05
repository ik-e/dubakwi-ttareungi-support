# 두바퀴 · 따릉이 시민 문의 지원 시스템

[GitHub 저장소](https://github.com/ik-e/dubakwi-ttareungi-support) · [품질 검사 실행](https://github.com/ik-e/dubakwi-ttareungi-support/actions)

팀 이름은 **두바퀴**, 기술 접두사는 **dubakwi**입니다.

Discord로 받은 시민 문의를 근거 안내·정보 보완·Jira 담당 연결로 처리하는 n8n 중심 MVP입니다.
VM에서 GitLab79 모의 API를 연결해 P11 입력·사용자 조회·로그 저장과 교육용 RAG 수동 색인·검색을 확인했습니다. 전체 서비스 실연동 시험은 아직 완료하지 않았습니다. [현재 VM 상태](infra/vm-preflight.md)를 참조하세요.

PostgreSQL 상태/DLQ의 [VM 배포 준비본과 R04 검토 항목](infra/postgres-deployment.md)을 작성했습니다. 실제 DB·Credential은 미적용이며 PR #23 수정과 적용 조건 검토가 남았습니다.
Discord 채널은 채택했으며 실제 봇 연결은 구현 전입니다. 실제 시민 인증·기관 내부 시스템·환불/출동 실행은 구현 범위에 포함하지 않습니다.

## 읽는 순서

팀원은 [첫 실행과 역할별 인계](docs/TEAM-START.md)·[공유 전 점검 결과](docs/project/TEAM-READINESS-REVIEW.md)를 먼저 확인하면 됩니다.

1. [주제와 범위](docs/project/TOPIC.md)·[역할과 책임](docs/project/TEAM-CHARTER.md)
2. [전체 시스템](docs/project/SYSTEM-DESIGN.md)·[설계 목록](docs/project/README.md)
3. [작업 규칙](AGENTS.md)·[개발 계획](docs/DEVELOPMENT-PLAN.md)
4. [Python 개발](docs/PYTHON-DEVELOPMENT.md)·[Docker 배포 기준](infra/README.md)
5. [발표 계획](docs/PRESENTATION-PLAN.md)·[출처 안내](docs/PUBLIC-SOURCES.md)

## 환경과 검사

```sh
uv sync --locked
uv run --locked ruff check .
uv run --locked ruff format --check .
uv run --locked python scripts/test/check_project_docs.py
uv run --locked python scripts/test/check_public_files.py
uv run --locked python -m unittest discover -s scripts/test -p "test_*.py"
```

Python3.12·uv·Ruff를 사용하며 Docker Compose는 채택했지만 실제 배포 설정은 구현 전입니다.
GitHub Actions는 같은 품질 검사를 실행하도록 구성했습니다. 실제 실행 결과는 위 품질 검사 링크에서 확인합니다.

## 같은 폴더에서 개발과 공개 관리

이 작업 폴더를 그대로 Git 저장소로 사용합니다. `.gitignore`가 외부 원문·조사/학습 데이터·
팀원 자료·화면·서버 기록·과거 검토·tmp·비밀·캐시를 제외합니다. 제외 파일은 로컬에 남습니다.
공개할 파일을 별도 폴더에 매번 복사할 필요가 없습니다. [공개 정책](docs/PUBLICATION.md)에 따라
실제 Git 후보와 링크를 확인한 뒤 커밋합니다. 강제 추가나 과거 이력 병합은 별도 검토가 필요합니다.

자료의 원래 제공처는 [출처 안내](docs/PUBLIC-SOURCES.md), 로컬 자료 탐색은 공개 제외된
`docs/LOCAL-INDEX.md`를 사용합니다. 프로젝트 공개 라이선스는 아직 미지정입니다.
