"""Audit Git's tracked + non-ignored candidates without staging or uploading files."""

import argparse
import importlib.util
import json
import re
import subprocess
from pathlib import Path
from urllib.parse import unquote

from check_project_docs import LINK, anchors, unfenced

ROOT = Path(__file__).resolve().parents[2]
SPEC = importlib.util.spec_from_file_location(
    "public_policy", ROOT / "scripts/dev/export_public.py"
)
POLICY = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(POLICY)


def git_paths(root, *arguments):
    result = subprocess.run(
        ["git", "--no-optional-locks", "ls-files", "-z", *arguments],
        cwd=root,
        capture_output=True,
        check=True,
    )
    return {x for x in result.stdout.decode("utf-8").split("\0") if x}


def audit(root=ROOT):
    root = root.resolve()
    tracked = git_paths(root, "--cached")
    ignored_tracked = git_paths(root, "--cached", "--ignored", "--exclude-standard")
    names = tracked | git_paths(root, "--others", "--exclude-standard")
    errors = []
    local_links = 0
    for name in sorted(names):
        path = root / name
        if name in ignored_tracked:
            errors.append(
                {"file": name, "issue": "ignored file already tracked; review index/history"}
            )
        if name.startswith(POLICY.FORBIDDEN) and name not in {
            "data/users.json",
            "data/records.json",
        }:
            errors.append({"file": name, "issue": "private material in Git candidates"})
            continue
        if path.suffix.lower() in {
            ".pem",
            ".key",
            ".p12",
            ".pfx",
            ".dump",
            ".zip",
            ".pdf",
            ".csv",
        } or (path.name.startswith(".env") and path.name != ".env.example"):
            errors.append({"file": name, "issue": "unreviewed raw/secret artifact"})
            continue
        if not path.is_file() or path.is_symlink() or not path.resolve().is_relative_to(root):
            errors.append({"file": name, "issue": "missing or unsafe candidate path"})
            continue
        if path.stat().st_size > 5 * 1024 * 1024:
            errors.append({"file": name, "issue": "large candidate requires review"})
            continue
        try:
            body = path.read_text(encoding="utf-8-sig")
        except UnicodeDecodeError:
            errors.append({"file": name, "issue": "binary/non-UTF-8 candidate requires review"})
            continue
        for rule, pattern in POLICY.TOKENS.items():
            if re.search(pattern, body):
                errors.append({"file": name, "issue": "possible secret", "rule": rule})
        if path.suffix.lower() != ".md":
            continue
        for match in LINK.finditer(unfenced(body)):
            url = match[1] or match[2]
            if re.match(r"^[a-zA-Z][\w+.-]*:", url):
                continue
            local_links += 1
            part, _, fragment = url.partition("#")
            target = (path.parent / unquote(part)).resolve() if part else path
            if not target.is_relative_to(root) or target.relative_to(root).as_posix() not in names:
                errors.append({"file": name, "issue": "link target not public", "target": url})
            elif not target.is_file():
                errors.append({"file": name, "issue": "link target missing", "target": url})
            elif fragment and target.suffix.lower() == ".md":
                if unquote(fragment) not in anchors(target.read_text(encoding="utf-8-sig")):
                    errors.append({"file": name, "issue": "anchor missing", "target": url})
    return {
        "scope": "Git candidate paths/current worktree bytes and public Markdown closure; "
        "no history/remote/PII/license guarantee",
        "files": sorted(names),
        "tracked_files": len(tracked),
        "ignored_tracked_files": len(ignored_tracked),
        "public_local_links": local_links,
        "errors": errors,
    }


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output", type=Path)
    args = parser.parse_args()
    try:
        report = audit()
    except (OSError, subprocess.CalledProcessError) as error:
        parser.exit(1, f"Git candidate audit failed: {error}\n")
    if args.output:
        if args.output.exists():
            parser.error("output exists; use a new evidence path")
        args.output.parent.mkdir(parents=True, exist_ok=True)
        args.output.write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps({**report, "files": len(report["files"])}, ensure_ascii=False))
    return bool(report["errors"])


if __name__ == "__main__":
    raise SystemExit(main())
