# 팀원이 처음 시작하는 순서

현재는 설계 초안·개발 도구 준비 단계다. n8n7개 워크플로우·Discord 봇·지식·모의 데이터·서비스 시험은 아직 구현 전이다. 저장소의 품질 시험 통과는 민원 처리 서비스의 동작 증거가 아니다.

## 1 첫 회의에서 역할과 환경 확인

| 결정·확인 | 책임·시점 | 작업 영향 |
| --- | --- | --- |
| R01~R05의 실제 담당자·검토자 | R01 취합, 작업 배정 전 | 공개 문서는 역할 ID 유지. 실제 Discord/GitHub 계정 연결은 팀 내부에서 공유 |
| 두바퀴/dubakwi 확정 공유·원격 주소·검토/연락/발표 역할 | R01, 첫 공동 작업 전 | 파일/웹훅 이름·병합·배포·시연 예약 |
| 실제 VM 접근·Docker/Compose·배포 비밀 전달 | R01/R04, P04 배포 준비 전 | 키/주소를 공개 PR·문서에 붙이지 않음 |
| Jira 생성/조회/종료/배정 필드·물리 상태/DLQ 저장 | R04/R01, D01 해당 연결 전 | 검증되지 않은 API/DB 동작을 가정하지 않음 |
| Discord 앱/허용 서버·모의 이용자 매핑·SDK·defer | R04/R01, D07 연결 전 | 실제 Discord ID/토큰은 환경 비밀. 본체 검증 후 어댑터 연결 |
| 주제/조합·모의 시나리오의 과정 기준 적합성 | R01/전원, 가이드의 점검 시점 | 강사 확인은 아직 미완료. 로컬 원문이 없는 팀원은 출처 안내에서 원문 확보 |

결정 결과와 진행은 [개발 원장](DEVELOPMENT-PLAN.md#5-작업-원장)·D01~D07에서 관리한다. 이 페이지에 별도 상태 원장을 만들지 않는다. [헌장](project/TEAM-CHARTER.md)의 검토 전 책임을 실제 사람에게 배정해야 한다.

## 2 저장소를 받은 뒤 실행

Git과 uv를 준비하고 [두바퀴 저장소](https://github.com/ik-e/dubakwi-ttareungi-support)를 clone한 폴더에서 실행한다.

```sh
git clone https://github.com/ik-e/dubakwi-ttareungi-support.git
cd dubakwi-ttareungi-support
```

```sh
uv python install 3.12
uv sync --locked
uv run --locked ruff check .
uv run --locked ruff format --check .
uv run --locked python scripts/test/check_project_docs.py
uv run --locked python scripts/test/check_public_files.py
uv run --locked python -m unittest discover -s scripts/test -p "test_*.py"
```

기능 API 키나 원문 데이터 없이 실행할 수 있는 준비/품질 검사다. 실제 n8n/Discord/Jira 설치·기능 실행 명령은 아직 없다. 없는 서비스 실행 명령을 완료 절차처럼 적지 않는다. Python은 [개발 기준](PYTHON-DEVELOPMENT.md), 배포 준비는 [infra](../infra/README.md)를 따른다.

## 3 역할별 첫 작업과 인계

| 역할 | 처음 준비할 것 | 다른 역할에 넘길 것 |
| --- | --- | --- |
| R01 | 역할 배정·dubakwi 명명 적용·원격/검토 규칙·환경·공통 범위 검토 | 팀 안내·검토된 초안·비밀 없는 환경 절차 |
| R02 | Request/Response와 하위 계약 검토, 본체 입력·분기·모의 연결 | 필요한 모의 호출/출력·유형별 필수 정보와 기대 분기 |
| R03 | 출처/권한을 구분한 지식, 기대 문서/절 질문, index/search 초안 | SearchResult 모의 결과·준비 상태·비교 측정 계획 |
| R04 | Jira/저장 지원의 작은 검증·state/handoff 경계, Discord 준비 병행 | 실제 지원/미지원·매핑·저장/실패 계약·어댑터 조건 |
| R05 | 공통14/팀5 이상 입력·기대 결과, 계약·동시/실패 시험 준비 | 구현 전 판정·재현 입력·공유할 가린 결과 |

R04에 Jira·저장·DLQ·Discord가 집중되므로 Jira/저장 기본과 S1을 먼저 연결한다. R01이 환경/배포를, R05가 고장 입력/증거를 지원하고 Discord 실연결은 본체 해당 흐름 확인 후 진행한다. 모든 모듈의 최종 완성을 기다리지 않고 검토된 계약의 모의 결과로 병행 개발할 수 있다.

## 4 브랜치에서 검토·병합까지

R01이 첫 기본 커밋을 올린 뒤 최신 기본 브랜치에서 `<역할ID>/<P번호>-<설명>` 작업 브랜치를 만든다. 파일 소유권·의존성 확인 → 변경/시험 → 공개 후보/실제 staged diff 확인 → PR 템플릿 작성 → 영향 역할/R05 검토 → R01 병합 순서다. 직접 만든 변경도 다른 역할의 검토를 받는다.

GitHub의 저장소 멤버 권한·브랜치 보호/필수 PR 검토·quality 체크는 R01이 원격 생성 후 설정/확인한다. 로컬 문서나 CI 파일만으로 그 설정이 활성화되지는 않는다. 실제 계정 핸들을 모르므로 CODEOWNERS를 임의로 만들지 않았다.

## 5 공개와 비공개 자료를 나누어 인계

- 공유 원본: 설계·계획·코드·모의 입력과, 가린 데일리 Markdown·발표 메모 Markdown·`runs/public/<실행묶음ID>/`의 JSON/Markdown 요약.
- 로컬/팀 비공개: 원문·이미지·원시 runs·비밀·실제 ID·바이너리 발표 파일. 필요하면 Discord의 합의한 비공개 전달 경로로 주고 공개 PR에는 첨부하지 않는다.
- 과제 제출: 가이드가 요구하는 실제 실행 증거·파일은 R01/R05가 별도 제출 패키지로 확인한다. GitHub 공개 제외가 제출 불필요를 뜻하지 않는다.
- 제외 자료의 공개 링크는 [출처 안내](PUBLIC-SOURCES.md)로 연결한다. 공개 저장소만으로 원문 조사 전체 재현을 보장하지 않는다.

[전체 설계](project/SYSTEM-DESIGN.md)·[개발 순서](DEVELOPMENT-PLAN.md)·[작업 규칙](../AGENTS.md)·[공유 전 점검](project/TEAM-READINESS-REVIEW.md)
