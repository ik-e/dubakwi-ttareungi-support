"""Check current project Markdown references. No network or service execution.

Run from any directory: python scripts/test/check_project_docs.py
Use --output PATH to retain a new snapshot. Historical evidence is never rewritten.
"""

import argparse
import hashlib
import json
import re
from pathlib import Path
from urllib.parse import unquote

ROOT = Path(__file__).resolve().parents[2]
LINK = re.compile(r'!?\[[^\]\n]+\]\((?:<([^>]+)>|([^\s)]+))(?:\s+"[^"]*")?\)')


def unfenced(body):
    result, fence = [], None
    for line in body.splitlines():
        match = re.match(r"^\s*(`{3,}|~{3,})", line)
        if match:
            marker = match[1]
            if fence is None:
                fence = marker[0]
            elif marker[0] == fence:
                fence = None
            continue
        if fence is None:
            result.append(line)
    return "\n".join(result)


def anchors(body):
    result = set(re.findall(r'<a\s+id=["\']([^"\']+)', body))
    counts = {}
    for heading in re.findall(r"^#{1,6}\s+(.+?)\s*#*$", unfenced(body), re.M):
        slug = re.sub(r"[^\w\-\s]", "", heading.lower().replace("`", "")).replace(" ", "-")
        count = counts.get(slug, 0)
        counts[slug] = count + 1
        result.add(slug + (f"-{count}" if count else ""))
    return result


def check():
    files = sorted((ROOT / "docs/project").glob("*.md"))
    files += [
        ROOT / name
        for name in (
            "README.md",
            "AGENTS.md",
            "infra/README.md",
            "scripts/README.md",
            "scripts/test/README.md",
            "docs/README.md",
            "docs/DEVELOPMENT-PLAN.md",
            "docs/PRESENTATION-PLAN.md",
            "docs/PUBLICATION.md",
            "docs/PYTHON-DEVELOPMENT.md",
            "scripts/dev/README.md",
            "docs/TEAM-START.md",
        )
    ]
    errors, snapshots = [], []
    links = fragments = 0
    for file in files:
        if not file.is_file():
            errors.append(f"missing checked file: {file.relative_to(ROOT)}")
            continue
        raw = file.read_bytes()
        body = unfenced(raw.decode("utf-8-sig"))
        snapshots.append(
            {"file": file.relative_to(ROOT).as_posix(), "sha256": hashlib.sha256(raw).hexdigest()}
        )
        width = None
        for line in body.splitlines():
            if not line.startswith("|"):
                width = None
                continue
            cols = len(re.split(r"(?<!\\)\|", line))
            if width is not None and width != cols:
                errors.append(f"table width: {file.relative_to(ROOT)}: {line[:80]}")
            width = cols
        for match in LINK.finditer(body):
            url = match[1] or match[2]
            if re.match(r"^[a-zA-Z][\w+.-]*:", url):
                continue
            links += 1
            part, _, fragment = url.partition("#")
            target = (file.parent / unquote(part)).resolve() if part else file
            if not target.exists():
                errors.append(f"missing target: {file.relative_to(ROOT)} -> {url}")
            elif fragment and target.suffix.lower() == ".md":
                fragments += 1
                if unquote(fragment) not in anchors(target.read_text(encoding="utf-8-sig")):
                    errors.append(f"missing anchor: {file.relative_to(ROOT)} -> {url}")
    return {
        "scope": "current project documents; local links/anchors/tables only; "
        "external URLs, Mermaid syntax, runtime and historic snapshots excluded",
        "files": len(files),
        "local_links": links,
        "anchor_links": fragments,
        "errors": errors,
        "snapshots": snapshots,
    }


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output", type=Path)
    args = parser.parse_args()
    report = check()
    if args.output:
        if args.output.exists():
            parser.error("output already exists; use a new evidence filename")
        args.output.parent.mkdir(parents=True, exist_ok=True)
        args.output.write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps({k: v for k, v in report.items() if k != "snapshots"}, ensure_ascii=False))
    return 1 if report["errors"] else 0


if __name__ == "__main__":
    raise SystemExit(main())
