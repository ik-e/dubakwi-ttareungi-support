"""Measure the local search webhook only; never record secrets or response text.

Set DUBAKWI_INTERNAL_KEY in the process environment. The n8n demo must already
be indexed and the local search webhook published. Calls may use OpenAI credits.
This is not a P19, real-user authorization, or official R05 test.
"""

import argparse
import datetime as dt
import ipaddress
import json
import math
import os
import statistics
import time
import urllib.error
import urllib.parse
import urllib.request
import uuid

QUERY = "QR이 안 읽혀요. 자전거번호로 대여하는 방법을 알려주세요."
RESTRICTED_DOCS = {"handoff-policy", "ticket-lifecycle"}
CANARY = "DUBAKWI-RESTRICTED-CANARY"


class NoRedirect(urllib.request.HTTPRedirectHandler):
    """Never send the internal header to a redirect destination."""

    def redirect_request(self, req, fp, code, msg, headers, newurl):
        return None


def local_search_url(value):
    """Only allow the search webhook over loopback, avoiding shared VM calls."""
    parsed = urllib.parse.urlsplit(value)
    try:
        loopback = (
            parsed.hostname == "localhost"
            or ipaddress.ip_address(parsed.hostname or "").is_loopback
        )
    except ValueError:
        loopback = False
    if (
        parsed.scheme != "http"
        or not loopback
        or parsed.username
        or parsed.password
        or parsed.path != "/webhook/dubakwi-search"
        or parsed.query
        or parsed.fragment
    ):
        raise ValueError("URL must be the loopback HTTP search webhook")
    return value


def measure(url, key, iterations, *, timeout=15):
    """Return only timing, statuses, and aggregate leak flags; no raw content."""
    url = local_search_url(url)
    if not key or not 1 <= iterations <= 20:
        raise ValueError("Internal key required; iterations must be 1 through 20")
    rows = []
    opener = urllib.request.build_opener(urllib.request.ProxyHandler({}), NoRedirect())
    for _ in range(iterations):
        request_id = "r03-latency-" + uuid.uuid4().hex
        deadline = (dt.datetime.now(dt.UTC) + dt.timedelta(seconds=30)).isoformat()
        payload = {
            "request_id": request_id,
            "query": QUERY,
            "enabled": True,
            "access_levels": ["public"],
            "deadline_at": deadline,
        }
        request = urllib.request.Request(
            url,
            data=json.dumps(payload, ensure_ascii=False).encode("utf-8"),
            headers={"Content-Type": "application/json", "X-Internal-Key": key},
            method="POST",
        )
        started = time.monotonic()
        status = "transport_error"
        leakage = None
        try:
            with opener.open(request, timeout=timeout) as response:
                raw = response.read(1024 * 1024 + 1)
                if len(raw) > 1024 * 1024:
                    status = "oversized_response"
                else:
                    body = json.loads(raw)
                    evidence = body.get("evidence")
                    if not isinstance(evidence, list) or body.get("request_id") != request_id:
                        status = "invalid_response"
                    else:
                        status = body.get("status")
                        if status not in {"ok", "empty", "skipped", "error"}:
                            status = "invalid_response"
                        decoded = raw.decode("utf-8", errors="replace")
                        leakage = (
                            CANARY in decoded
                            or any(doc in decoded for doc in RESTRICTED_DOCS)
                            or any(
                                not isinstance(item, dict)
                                or item.get("access_level") != "public"
                                or item.get("doc") in RESTRICTED_DOCS
                                for item in evidence
                            )
                        )
        except (OSError, ValueError, TypeError, AttributeError, json.JSONDecodeError):
            # Never print exception text: HTTP or network errors may contain sensitive data.
            status = "transport_or_parse_error"
        rows.append(
            {
                "elapsed_ms": round((time.monotonic() - started) * 1000, 1),
                "status": status,
                "restricted_or_canary_detected": leakage,
            }
        )
    timings = sorted(row["elapsed_ms"] for row in rows)
    return {
        "kind": "local-search-direct-latency",
        "scope": "public synthetic query; direct search only; no raw text",
        "cases": rows,
        "summary": {
            "count": len(rows),
            "ok_count": sum(row["status"] == "ok" for row in rows),
            "over_3000_ms_count": sum(value > 3000 for value in timings),
            "median_ms": statistics.median(timings),
            "p95_ms_nearest_rank": timings[math.ceil(0.95 * len(timings)) - 1],
            "max_ms": max(timings),
            "leak_detected": any(row["restricted_or_canary_detected"] for row in rows),
            "leak_unchecked_count": sum(
                row["restricted_or_canary_detected"] is None for row in rows
            ),
        },
        "limitations": [
            "Direct search only, not P19 end-to-end or authorization verification.",
            "Elapsed time includes all network and embedding work; component timings unknown.",
            "No workflow version or current index state is inferred by this tool.",
        ],
    }


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--url", default="http://127.0.0.1:5678/webhook/dubakwi-search")
    parser.add_argument("--iterations", type=int, default=3)
    args = parser.parse_args()
    try:
        report = measure(args.url, os.environ.get("DUBAKWI_INTERNAL_KEY", ""), args.iterations)
    except ValueError:
        parser.exit(2, "Invalid local search URL, missing key, or invalid iteration count.\n")
    print(json.dumps(report, ensure_ascii=False, indent=2))
    return (
        0
        if report["summary"]["ok_count"] == args.iterations
        and not report["summary"]["leak_detected"]
        else 1
    )


if __name__ == "__main__":
    raise SystemExit(main())
