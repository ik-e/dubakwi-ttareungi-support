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
