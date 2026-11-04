"""Offline lexical retrieval for evaluating prepared chunks, not a service or authorization layer."""

import argparse
import json
import math
import re
from collections import Counter
from pathlib import Path


def features(text):
    text = re.sub(r"\s+", "", text.lower())
    return Counter(text[i : i + 2] for i in range(len(text) - 1))


def search(chunks, query, role, *, top_k=3):
    """Role is a local test fixture; a caller must enforce actual identity separately."""
    permissions = {
        "citizen": {"public"},
        "support": {"public", "restricted"},
        "security": {"public", "restricted"},
    }
    if role not in permissions or not isinstance(query, str) or not query.strip():
        raise ValueError("valid fixture role and query required")
    if not isinstance(top_k, int) or isinstance(top_k, bool) or not 1 <= top_k <= 20:
        raise ValueError("top_k must be an integer from 1 to 20")
    q = features(query)
    norm_q = math.sqrt(sum(v * v for v in q.values()))
    if not norm_q:
        return []
    ranked = []
    for c in chunks:
        if c.get("access_level") not in permissions[role]:
            continue
        v = features(c["title"] + " " + c["section"] + " " + c["text"])
        norm_v = math.sqrt(sum(x * x for x in v.values()))
        score = (
            sum(count * v.get(term, 0) for term, count in q.items()) / (norm_q * norm_v)
            if norm_v
            else 0
        )
        if score > 0:
            ranked.append({**c, "score": score})
    return sorted(ranked, key=lambda c: (-c["score"], c["chunk_id"]))[:top_k]


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--chunks", type=Path, required=True)
    parser.add_argument("--query", required=True)
    parser.add_argument("--role", choices=["citizen", "support", "security"], required=True)
    parser.add_argument("--top-k", type=int, default=3)
    args = parser.parse_args()
    chunks = json.loads(args.chunks.read_text(encoding="utf-8"))
    print(
        json.dumps(
            {
                "mode": "offline_lexical_fixture",
                "hits": search(chunks, args.query, args.role, top_k=args.top_k),
            },
            ensure_ascii=False,
            indent=2,
        )
    )


if __name__ == "__main__":
    main()
