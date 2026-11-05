"""Refresh the explicit demo snapshot in the inactive P10 n8n workflow."""

import json

from prepare_rag_chunks import MANIFEST, ROOT, prepare


def main():
    path = ROOT / "workflows" / "dubakwi-index.json"
    workflow = json.loads(path.read_text(encoding="utf-8"))
    chunks = prepare(ROOT, MANIFEST, allow_demo=True)
    script = (
        "const chunks = "
        + json.dumps(chunks, ensure_ascii=True)
        + "; let seen = new Set(); return chunks.map(json => { "
        "const clearStore = !seen.has(json.access_level); "
        "seen.add(json.access_level); return {json: {...json, clearStore}}; });"
    )
    node = next(n for n in workflow["nodes"] if n["name"] == "Prepare chunks")
    node["parameters"]["jsCode"] = script
    path.write_text(json.dumps(workflow, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Refreshed {len(chunks)} pending-review DEMO chunks; no approval changed.")


if __name__ == "__main__":
    main()
