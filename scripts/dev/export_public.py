"""Export explicitly allowed project files into a new directory under dist/.

No Git actions, uploads, recursive source copies, or changes to preserved originals.
"""

import argparse
import hashlib
import json
import re
from datetime import UTC, datetime
from pathlib import Path, PurePosixPath
from urllib.parse import unquote

ROOT = Path(__file__).resolve().parents[2]
LINK = re.compile(r'!?\[([^\]\n]+)\]\((?:<([^>]+)>|([^\s)]+))(?:\s+"[^"]*")?\)')
FORBIDDEN = (
    "tmp/",
    "data/",
    "docs/guideline/",
    "docs/research/",
    "data/learning/",
    "docs/csj/",
    "docs/htk/",
    "docs/jso/",
    "docs/ykh/",
    "docs/concepts/",
    "docs/project/reviews/",
    "docs/project/images/",
    ".git/",
    ".venv/",
)
TOKENS = {
    "private_key": r"-----BEGIN (?:RSA |OPENSSH |EC )?PRIVATE KEY-----",
    "github_token": r"\b(?:gh[pousr]_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{40,})\b",
    "api_key": r"\bsk-(?:proj-|svcacct-)?[A-Za-z0-9_-]{24,}\b",
    "aws_access_id": r"\bAKIA[0-9A-Z]{16}\b",
    "gitlab_token": r"\bglpat-[A-Za-z0-9_-]{15,}\b",
    "url_credentials": r"https?://[^\s/:@]+:[^\s/@]+@",
}


def generated_files():
    return {
        "README.md": """# 두바퀴 · 따릉이 시민 문의 지원 시스템

시민 문의를 근거 안내·정보 보완·Jira 담당 연결로 처리하는 n8n 중심 MVP입니다.
현재는 설계·개발 규칙·Python 도구 준비 단계입니다. 실제 시민 인증·기관 시스템·환불 실행은
포함하지 않으며 서비스 구현·실연동 시험을 완료했다고 주장하지 않습니다.

## 읽는 순서

1. [주제와 범위](docs/project/TOPIC.md)
2. [시스템 설계](docs/project/SYSTEM-DESIGN.md)와 [상세 설계 목록](docs/project/README.md)
3. [역할](docs/project/TEAM-CHARTER.md)·[작업 규칙](AGENTS.md)·[개발 계획](docs/DEVELOPMENT-PLAN.md)
4. [Python 환경](docs/PYTHON-DEVELOPMENT.md)·[Docker 배포 기준](infra/README.md)
5. [발표 계획](docs/PRESENTATION-PLAN.md)·[공개 정책](docs/PUBLICATION.md)

## 로컬 확인

```sh
uv sync --locked
uv run --locked ruff check .
uv run --locked ruff format --check .
uv run --locked python scripts/test/check_project_docs.py
uv run --locked python -m unittest discover -s scripts/test -p "test_*.py"
```

외부 원문·조사 원본·이미지·서버 관측·과거 검토 사본은 이 공개본에 포함하지 않았습니다.
[출처 안내](docs/PUBLIC-SOURCES.md)와 `_public-build.json`의 변환 내역을 확인할 수 있습니다.
팀의 공개 라이선스 선택은 아직 확정하지 않았습니다. Docker Compose는 채택했으며 실제 compose와
업무 Python 코드는 구현 전입니다. 공개 저장소 업로드는 이 내보내기 도구가 수행하지 않습니다.
""",
        "docs/README.md": """# 공개 프로젝트 문서

[설계 목록](project/README.md)·[개발 계획](DEVELOPMENT-PLAN.md)·
[발표 계획](PRESENTATION-PLAN.md)·[Python 개발](PYTHON-DEVELOPMENT.md)·
[공개 정책](PUBLICATION.md)·[외부 출처](PUBLIC-SOURCES.md)

[프로젝트 대문](../README.md)
""",
        "docs/project/README.md": """# 공개 설계 산출물

| 문서 | 내용 |
| --- | --- |
| [TOPIC](TOPIC.md) | 시민 문의 범위·가정·제외 |
| [TEAM-CHARTER](TEAM-CHARTER.md) | 역할·경로별 책임 |
| [SYSTEM-DESIGN](SYSTEM-DESIGN.md) | 전체 구성·상태·기능·시나리오·경로 |
| [WORKFLOW-DESIGN](WORKFLOW-DESIGN.md) | 업무 노드·엣지·공개 계약 |
| [RAG-ARCHITECTURE](RAG-ARCHITECTURE.md) | 검색·색인·측정 계획 |
| [STORAGE-DESIGN](STORAGE-DESIGN.md) | 처리 상태·DLQ·복구 |

모두 구현 검증 전 초안입니다. 원문·과거 사본은 [출처 안내](../PUBLIC-SOURCES.md)를 참조합니다.
[개발 계획](../DEVELOPMENT-PLAN.md)·[작업 규칙](../../AGENTS.md)
""",
        "scripts/README.md": """# 공개 개발 도구

[공개본 생성](dev/README.md)·[문서 검사](test/README.md)·
[Python 품질 기준](../docs/PYTHON-DEVELOPMENT.md)

기존 조사 도구와 원본 자료는 공개본에 포함하지 않았습니다.
""",
        "docs/PUBLIC-SOURCES.md": """# 공개본의 외부 출처와 제외 자료

원문·강의·조사 데이터·앱 화면·과거 검토 사본은 로컬 보존 대상으로 공개본에 포함하지 않았습니다.
해당 자료로 가는 링크는 이 안내로 바꿨습니다. `_public-build.json`은 변환한 원래 상대 경로만
기록하며 제외 자료의 내용·비밀·전체 로컬 경로는 담지 않습니다.

- [과정 제공 저장소](https://gl.isitsoft.kr/publicproj/aio-01d4-stu/): 과제·강의의 원래 제공처.
- [서울 열린데이터광장](https://data.seoul.go.kr/): 공개 데이터의 원래 제공처.
- [따릉이 공식 사이트](https://www.bikeseoul.com/): 시민 이용 안내의 확인 출발점.

이 링크는 모든 인용의 현재성·재배포 조건을 확인했다는 뜻이 아닙니다. 실제 서비스 지식에는
항목별 출처·확인일·적용 범위·이용 조건을 검토한 후 반영해야 합니다. 지금의 모의 정책을
기관의 확정 SOP로 사용하지 않습니다. 제외한 자료에 의존하는 조사 재현은 공개본만으로 보장하지
않으며 현재 공개 도구의 재현 범위는 문서 검사와 패키지 생성입니다.
""",
    }


def load_files(root):
    manifest = json.loads((root / "scripts/dev/public-files.json").read_text(encoding="utf-8"))
    files = manifest["files"]
    if len(files) != len(set(files)):
        raise ValueError("Duplicate public path")
    for name in files:
        path = PurePosixPath(name)
        if path.is_absolute() or ".." in path.parts or "\\" in name or ":" in name:
            raise ValueError(f"Invalid public path: {name}")
        if (
            name.startswith(FORBIDDEN)
            or path.suffix.lower()
            in {
                ".png",
                ".jpg",
                ".jpeg",
                ".pdf",
                ".zip",
                ".csv",
                ".pem",
                ".key",
            }
            or name.startswith(".env")
        ):
            raise ValueError(f"Excluded public path: {name}")
        source = root / name
        if source.is_symlink() or not source.resolve().is_relative_to(root.resolve()):
            raise ValueError(f"Unsafe source path: {name}")
        if not source.is_file():
            raise ValueError(f"Missing allowed file: {name}")
    return files


def rewrite_markdown(body, name, root, available, changes, generated=None):
    def replace(match):
        url = match[2] or match[3]
        if re.match(r"^[a-zA-Z][\w+.-]*:", url) or url.startswith("#"):
            return match[0]
        part, _, _fragment = url.partition("#")
        target = (root / name).parent / unquote(part)
        if target.resolve().is_relative_to(root):
            relative = target.resolve().relative_to(root).as_posix()
        else:
            relative = "outside-public-root"
        if relative in available:
            if _fragment and relative in (generated or {}):
                changes.append({"document": name, "generated_page_reference": relative})
                return f"[{match[1]}]({part})"
            return match[0]
        changes.append({"document": name, "omitted_reference": relative})
        depth = len(PurePosixPath(name).parent.parts)
        notice = "../" * depth + "docs/PUBLIC-SOURCES.md"
        return f"[{match[1]} — 공개본 제외 자료]({notice})"

    # Preserve code examples and literal paths; rewrite actual prose links only.
    fence = None
    lines = []
    for line in body.splitlines(keepends=True):
        marker = re.match(r"^\s*(`{3,}|~{3,})", line)
        if marker:
            char = marker[1][0]
            fence = char if fence is None else None if char == fence else fence
            lines.append(line)
        else:
            lines.append(LINK.sub(replace, line) if fence is None else line)
    return "".join(lines)


def build(root, output):
    root, output = root.resolve(), output.resolve()
    if not output.is_relative_to(root / "dist") or output == root / "dist":
        raise ValueError("Output must be a new subdirectory under dist/")
    if output.exists():
        raise ValueError("Output exists; select a new --output path")
    files = load_files(root)
    generated = generated_files()
    available = set(files) | set(generated)
    contents, changes = {}, []
    for name in files:
        body = (root / name).read_text(encoding="utf-8-sig")
        contents[name] = (
            rewrite_markdown(body, name, root, available, changes, generated)
            if name.endswith(".md")
            else body
        )
    contents.update(generated)
    findings = []
    for name, body in contents.items():
        for rule, pattern in TOKENS.items():
            if re.search(pattern, body):
                findings.append({"file": name, "rule": rule})
    if findings:
        raise ValueError("Possible secret patterns (values hidden): " + json.dumps(findings))
    # No destination is created until all source/path/pattern checks pass.
    output.mkdir(parents=True)
    snapshots = []
    for name, body in sorted(contents.items()):
        destination = output / name
        destination.parent.mkdir(parents=True, exist_ok=True)
        data = body.replace("\r\n", "\n").encode("utf-8")
        destination.write_bytes(data)
        snapshots.append({"file": name, "sha256": hashlib.sha256(data).hexdigest()})
    report = {
        "created_at": datetime.now(UTC).isoformat(),
        "files": snapshots,
        "rewritten_references": changes,
        "checks": {"allowlist": True, "known_secret_patterns": "no matches"},
        "limits": "No image/PII/license determination or service execution; no upload performed",
    }
    (output / "_public-build.json").write_text(
        json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8"
    )
    return report


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output", type=Path, default=Path("dist/public"))
    args = parser.parse_args()
    output = args.output if args.output.is_absolute() else ROOT / args.output
    try:
        report = build(ROOT, output)
    except (ValueError, OSError, KeyError, json.JSONDecodeError) as error:
        parser.exit(1, f"Public export failed: {error}\n")
    print(
        json.dumps(
            {
                "files": len(report["files"]),
                "rewritten_references": len(report["rewritten_references"]),
                "uploaded": False,
            }
        )
    )


if __name__ == "__main__":
    main()
