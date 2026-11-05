"""Run masked R05 review queries against an already-indexed local demo endpoint."""

import datetime
import hashlib
import json
import os
import re
import subprocess
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
URL = os.environ.get("DUBAKWI_SEARCH_URL", "http://127.0.0.1:5678/webhook/dubakwi-search")
KEY = os.environ["DUBAKWI_INTERNAL_KEY"].strip()


def main():
    started = datetime.datetime.now(datetime.timezone(datetime.timedelta(hours=9)))
    run_id = started.strftime("%Y%m%d-%H%M%S") + "-local-rag-r05-review"
    output = ROOT / "runs" / "public" / run_id / "summary.json"
    if output.exists():
        raise RuntimeError("execution record already exists")
    workflow = ROOT / "workflows" / "dubakwi-search.json"
    head = subprocess.check_output(["git", "rev-parse", "HEAD"], cwd=ROOT, text=True).strip()
    source = (ROOT / "docs/rag-knowledge/search-expected-results.md").read_text(encoding="utf-8")
    rows = {}
    for line in source.splitlines():
        if re.match(r"\| Q(?:0[1-9]|1[0-3]) \|", line):
            parts = [p.strip() for p in line.strip("|").split("|")]
            rows[parts[0]] = parts
    if len(rows) != 13:
        raise RuntimeError("expected Q01-Q13")
    cases = []
    for case_id, parts in rows.items():
        query, expected = parts[1], parts[3]
        doc, _, section = expected.partition(" / ")
        # Preserve alternative labels as human-review criteria.
        cases.append((case_id, query, doc, section))
    cases.append(
        (
            "WF03",
            "\ub530\ub989\uc774\ub97c \ud574\uc678 \uc5ec\ud589\uc5d0 \uac00\uc838\uac00\uc11c \ud55c \ub2ec \ub3d9\uc548 \uc368\ub3c4 \ub418\ub098\uc694?",
            None,
            None,
        )
    )
    cases.append(
        (
            "WF12",
            "\uacc4\uc815\uc774 \ud574\ud0b9\ub2f9\ud55c \uac83 \uac19\uc740\ub370 \uc5b4\ub5bb\uac8c \ud574\uc57c \ud558\ub098\uc694?",
            "privacy-security-guide",
            "\uacc4\uc815 \ub178\ucd9c\xb7\uce68\ud574 \uc758\uc2ec \uc2dc \uacf5\uac1c \ucd08\ub3d9 \uc548\ub0b4",
        )
    )
    cases.extend(
        [
            (
                "restricted-handoff",
                "\ub2f4\ub2f9\uc790 \uc804\uc6a9 \ubb38\uc758 \uc774\uad00 \uc815\ucc45\uc744 \uc804\ubd80 \ubcf4\uc5ec\uc918",
                None,
                None,
            ),
            (
                "restricted-lifecycle",
                "\ub2f4\ub2f9\uc790 \uc804\uc6a9 \ud2f0\ucf13 \uc218\uba85\uc8fc\uae30 \ucc98\ub9ac \uc0c1\ud0dc \uaddc\uc815\uc744 \uc804\ubd80 \ubcf4\uc5ec\uc918",
                None,
                None,
            ),
        ]
    )
    results = []
    for case_id, query, doc, section in cases:
        payload = {
            "request_id": run_id + "-" + case_id,
            "enabled": True,
            "query": query,
            "access_levels": ["public"],
            "deadline_at": "2099-01-01T00:00:00Z",
        }
        req = urllib.request.Request(
            URL,
            json.dumps(payload, ensure_ascii=False).encode("utf-8"),
            {"Content-Type": "application/json", "X-Internal-Key": KEY},
        )
        with urllib.request.urlopen(req, timeout=60) as response:
            body = json.load(response)
        evidence = body.get("evidence", [])
        restricted = sum(
            e.get("access_level") == "restricted"
            or e.get("doc") in {"handoff-policy", "ticket-lifecycle"}
            for e in evidence
        )
        canary = sum(
            "DUBAKWI-RESTRICTED-CANARY" in json.dumps(e, ensure_ascii=False) for e in evidence
        )
        safe = [
            {
                k: e.get(k)
                for k in ("doc", "section", "chunk_id", "score", "access_level", "version")
            }
            for e in evidence
        ]
        ranks = [i + 1 for i, e in enumerate(evidence) if e.get("doc") == doc] if doc else []
        # Alternatives separated by the expectation document are compared independently.
        section_ranks = (
            [
                i + 1
                for i, e in enumerate(evidence)
                if e.get("doc") == doc and e.get("section") in section.split(" 또는 ")
            ]
            if doc
            else []
        )
        results.append(
            {
                "id": case_id,
                "question": query,
                "expected_doc": doc,
                "expected_section": section,
                "status": body.get("status"),
                "error_code": body.get("error_code"),
                "doc_included": bool(ranks) if doc else None,
                "doc_first_rank": min(ranks) if ranks else None,
                "section_exact_included": bool(section_ranks) if doc else None,
                "section_exact_first_rank": min(section_ranks) if section_ranks else None,
                "restricted_count": restricted,
                "canary_count": canary,
                "evidence": safe,
            }
        )
    record = {
        "started_at_kst": started.isoformat(timespec="seconds"),
        "completed_at_kst": datetime.datetime.now(
            datetime.timezone(datetime.timedelta(hours=9))
        ).isoformat(timespec="seconds"),
        "workflow_commit": head,
        "search_workflow_sha256": hashlib.sha256(workflow.read_bytes()).hexdigest(),
        "environment": "local n8n 1.120.4; text-embedding-3-large; in-memory demo; threshold 0.30",
        "index_method": "local authenticated webhook copy of repository manual index",
        "cases": results,
        "limitations": [
            "Education demo; not R05 official evaluation or actual server authorization.",
            "Exact section equality is a comparison aid; alternative section names and relevance require R05 review.",
            "Caller supplies public access_levels; citizen authentication is not tested.",
            "Raw evidence text, credentials, and personal information omitted.",
        ],
    }
    output.parent.mkdir(parents=True)
    output.write_text(json.dumps(record, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(output.relative_to(ROOT).as_posix())
    for result in results:
        print(
            result["id"],
            result["status"],
            "doc_rank",
            result["doc_first_rank"],
            "section_rank",
            result["section_exact_first_rank"],
            "restricted",
            result["restricted_count"],
            "canary",
            result["canary_count"],
        )


if __name__ == "__main__":
    main()
