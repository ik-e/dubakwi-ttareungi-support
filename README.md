# 두바퀴 · 따릉이 시민 문의 지원 시스템

[GitHub 저장소](https://github.com/ik-e/dubakwi-ttareungi-support) · [품질 검사 실행](https://github.com/ik-e/dubakwi-ttareungi-support/actions)

팀 이름은 **두바퀴**, 기술 접두사는 **dubakwi**입니다.

Discord로 받은 시민 문의를 근거 안내·정보 보완·Jira 담당 연결로 처리하는 n8n 중심 MVP입니다.
2026-11-07 PR #36 통합본을 VM에 반입해 Discord 비공개 답변·실제 RAG·Jira 종료·PostgreSQL 최종 저장을 확인했습니다. [실제 연결 검증](runs/public/20261107-170503-vm-pr36-integration/report.md)은 정상 한 건과 전체 회귀를 구분합니다. 41개 정의 중 40개 실행, 원 기대 미충족 2개, 자동 재처리 미구현 1개이며 역할별 공식 최종 확인은 대기입니다.

PostgreSQL 16.15, SQL001~009, 읽기 전용 records 연결과 등록 사용자 5명의 Discord 매핑을 사용합니다. 키를 교체하고 인증 후 저장 전 가림을 적용했습니다. 배포·비공개 설정은 [infra 안내](infra/README.md), 과거 사전 점검은 [당시 VM 기록](infra/vm-preflight.md)을 참조하세요. 실제 시민 인증·기관 내부 시스템·환불/출동 실행은 구현 범위에 포함하지 않습니다.

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


## PR36 로컬 통합 후보 확인

[수정 경계와 반입 조건](infra/pr36-local-candidate.md) · [파일별 수용·설계 대조](infra/pr36-local-acceptance.md). 로컬 후보·과거 실연동·현재 VM 상태를 구분하며 원격 병합/운영 완료를 뜻하지 않는다.
