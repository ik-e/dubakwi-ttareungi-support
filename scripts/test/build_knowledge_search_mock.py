"""저장소 지식 문서로 답하는 시험 전용 search mock을 만든다.

사용법:
  uv run --locked python scripts/test/build_knowledge_search_mock.py --output <새 파일>

R03의 로컬 준비 도구(--demo)와 같은 글자 2개 유사도를 쓴다. 승인 전 지식의 로컬 시험용이며
실제 dubakwi-search·벡터 검색·승인 점수 기준을 대신하지 않는다. 산출물은 커밋하지 않는다.
"""

import argparse
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "scripts" / "dev"))

from prepare_rag_chunks import MANIFEST, prepare  # noqa: E402

BASE = ROOT / "scripts" / "test" / "mocks" / "dubakwi-mock-search.json"
MIN_SCORE = 0.08
TOP_K = 3
KEEP = ("doc", "section", "chunk_id", "text", "access_level", "version", "source_url")
LOGIC = r"""
// 시험 전용 mock 검색. 저장소 지식의 로컬 시험용이며 실제 검색·승인 점수 기준이 아니다.
const r = $json.body;
if (!r.enabled) return { json: { request_id: r.request_id, status: 'skipped', evidence: [], error_code: null } };
const grams = (text) => {
  const clean = String(text).toLowerCase().replace(/\s+/g, '');
  const out = new Map();
  for (let i = 0; i < clean.length - 1; i += 1) {
    const key = clean.slice(i, i + 2);
    out.set(key, (out.get(key) ?? 0) + 1);
  }
  return out;
};
const norm = (m) => Math.sqrt([...m.values()].reduce((sum, v) => sum + v * v, 0));
const q = grams(r.query);
const ranked = CHUNKS.filter((c) => r.access_levels.includes(c.access_level)).map((c) => {
  const v = grams(`${c.title} ${c.section} ${c.text}`);
  let dot = 0;
  for (const [key, count] of q) dot += count * (v.get(key) ?? 0);
  const score = norm(q) && norm(v) ? dot / (norm(q) * norm(v)) : 0;
  const { title, ...rest } = c;
  return { ...rest, score };
}).filter((c) => c.score >= MIN_SCORE).sort((a, b) => b.score - a.score).slice(0, TOP_K);
if (ranked.length === 0) return { json: { request_id: r.request_id, status: 'empty', evidence: [], error_code: null } };
return { json: { request_id: r.request_id, status: 'ok', evidence: ranked, error_code: null } };
"""


def build() -> dict:
    chunks = []
    for chunk in prepare(ROOT, MANIFEST, allow_demo=True):
        item = {key: chunk[key] for key in KEEP if key in chunk}
        item["title"] = chunk["title"]
        chunks.append(item)
    workflow = json.loads(BASE.read_text(encoding="utf-8"))
    node = next(item for item in workflow["nodes"] if item["name"] == "Mock 처리")
    data = json.dumps(chunks, ensure_ascii=False)
    node["parameters"]["jsCode"] = (
        f"const MIN_SCORE = {MIN_SCORE};\nconst TOP_K = {TOP_K};\nconst CHUNKS = {data};\n"
        + LOGIC.strip()
        + "\n"
    )
    return workflow


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()
    with args.output.open("x", encoding="utf-8") as file:
        json.dump(build(), file, ensure_ascii=False, indent=2)
        file.write("\n")


if __name__ == "__main__":
    main()
