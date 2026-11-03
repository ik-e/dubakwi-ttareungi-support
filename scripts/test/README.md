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

조사·보존 해시·전체 저장소 검사는 기존 [조사 문서 검사 — 공개본 제외 자료](../../docs/PUBLIC-SOURCES.md)를 사용한다. 기존 임시 Mermaid 검사 환경은 정식 도구가 아니며 [임시 기록 — 공개본 제외 자료](../../docs/PUBLIC-SOURCES.md)에서 한계를 확인한다. 서비스 시험/검색 측정 도구는 실제 구현 때 이 경로에 추가하고 사용법·입출력·고장 복원 방법을 기록한다.

[도구 목록](../README.md) · [작업 규칙](../../AGENTS.md)
