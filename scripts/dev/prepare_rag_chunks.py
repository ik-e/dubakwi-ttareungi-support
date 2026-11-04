"""Validate the knowledge manifest and prepare reviewable RAG chunks.

This is an offline preparation tool, not an authorization or vector-store service.
Pending documents require an explicit demo flag and are never silently approved.
"""

import argparse
import hashlib
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
MANIFEST = ROOT / "knowledge" / "manifest.json"


def normalize(data):
    return data.replace(b"\r\n", b"\n").replace(b"\r", b"\n")


def prepare(root, manifest, *, allow_demo=False):
    root = root.resolve()
    items = json.loads(manifest.read_text(encoding="utf-8"))["documents"]
    chunks = []
    seen = set()
    for doc in items:
        doc_id, access = doc["doc_id"], doc["access_level"]
        if doc_id in seen or access not in {"public", "restricted"}:
            raise ValueError("duplicate document ID or invalid access level")
        seen.add(doc_id)
        path = (root / doc["path"]).resolve()
        if not path.is_relative_to(root / "knowledge" / access) or not path.is_file():
            raise ValueError(f"invalid document path: {doc_id}")
        data = normalize(path.read_bytes())
        if hashlib.sha256(data).hexdigest() != doc["sha256"]:
            raise ValueError(f"hash mismatch: {doc_id}")
        if not (doc["approval_status"] == "approved" and doc["index_enabled"] is True):
            if not allow_demo:
                raise ValueError(f"document is not approved for indexing: {doc_id}")
        source = data.decode("utf-8")
        title = source.splitlines()[0].removeprefix("# ").strip()
        sections = re.split(r"(?m)^##\s+(.+?)\s*$", source)
        for section, content in zip(sections[1::2], sections[2::2], strict=True):
            paragraphs = [x.strip() for x in re.split(r"\n\s*\n", content) if x.strip()]
            citation = next((x for x in reversed(paragraphs) if x.startswith("출처:")), "")
            for paragraph in paragraphs:
                if paragraph.startswith("출처:"):
                    continue
                if (
                    access == "restricted"
                    or "가상 설정" in section
                    or "**가상" in paragraph
                    or "**충돌 판단" in paragraph
                    or citation.startswith("출처: 두바퀴")
                ):
                    kind = "simulation"
                else:
                    kind = "actual_guidance"
                # A mixed paragraph cannot be safely attributed to one category.
                if "**가상" in paragraph and not paragraph.lstrip().startswith("**가상"):
                    actual, virtual = paragraph.split("**가상", 1)
                    parts = [
                        ("actual_guidance", actual.strip()),
                        ("simulation", "**가상" + virtual),
                    ]
                else:
                    parts = [(kind, paragraph)]
                for part_kind, text in parts:
                    if not text:
                        continue
                    digest = hashlib.sha256(
                        f"{doc_id}\n{section}\n{part_kind}\n{text}".encode()
                    ).hexdigest()[:16]
                    label = "[가상 설정]" if part_kind == "simulation" else "[실제 안내]"
                    chunks.append(
                        {
                            "doc": doc_id,
                            "title": title,
                            "section": section,
                            "chunk_id": f"{doc_id}-{digest}",
                            "access_level": access,
                            "type": part_kind,
                            "text": f"{label} {text}",
                            "source": citation,
                            "source_checked_at": doc["source_checked_at"],
                            "version": doc["version"],
                            "demo": allow_demo,
                        }
                    )
    if not chunks:
        raise ValueError("no chunks produced")
    return chunks


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--demo", action="store_true", help="allow pending knowledge for offline demo only"
    )
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()
    chunks = prepare(ROOT, MANIFEST, allow_demo=args.demo)
    if args.output.exists():
        parser.error("output already exists")
    args.output.write_text(
        json.dumps(chunks, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )
    print(json.dumps({"chunks": len(chunks), "demo": args.demo}, ensure_ascii=False))


if __name__ == "__main__":
    main()
