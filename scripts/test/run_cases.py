"""Send cases/*.json requests to the support webhook and record judged results.

Only response checks are judged automatically. Ticket/state/DLQ/alert/n8n checks and
manual checks are listed as unverified, so a case is never reported as a full pass
while those remain. Cases that need fault injection, preconditions or operator steps
are reported as blocked and not sent.

Owner: R05. Standard library only.
"""

import argparse
import hashlib
import json
import os
import platform
import re
import subprocess
import sys
import time
import urllib.error
import urllib.request
from datetime import datetime, timedelta, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
DEFAULT_CASE_FILES = ["cases/common.json", "cases/team.json"]
KST = timezone(timedelta(hours=9))
ROUTES = {"자동 답변", "보완 질문", "담당자 이관", "권한 없음", "차단"}
HANDOFF = "담당자 이관"
MAX_REQUEST_ID = 64
NAME_PART = re.compile(r"^[a-z0-9][a-z0-9-]{0,30}$")
STEP_REF = re.compile(r"^\{step(\d+)\.([^}]+)\}$")
PHONE = re.compile(r"01[016789]-?\d{3,4}-?\d{4}")
EMAIL = re.compile(r"[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}")


class Missing:
    def __repr__(self):
        return "<missing>"


MISSING = Missing()


# ---------- path and assertion helpers ----------


def resolve(obj, path):
    """Resolve 'a.b', 'a[*].b' or '$' against a JSON value. Returns MISSING if absent."""
    if path == "$":
        return obj
    return _resolve(obj, path.split("."))


def _resolve(obj, parts):
    if not parts:
        return obj
    head, rest = parts[0], parts[1:]
    if head.endswith("[*]"):
        value = _resolve(obj, [head[:-3]])
        if not isinstance(value, list):
            return MISSING
        out = [_resolve(item, rest) for item in value]
        return [v for v in out if v is not MISSING]
    if isinstance(obj, dict) and head in obj:
        return _resolve(obj[head], rest)
    return MISSING


def _text(value):
    return value if isinstance(value, str) else json.dumps(value, ensure_ascii=False)


def _contains_any(actual, values):
    if isinstance(values, str):
        values = [values]
    if isinstance(actual, list):
        return any(_contains_any(item, values) for item in actual)
    if isinstance(actual, str):
        return any(v in actual for v in values)
    return False


def check(op, actual, expected):
    """Return True/False for one assertion operator."""
    present = actual is not MISSING
    if op == "eq":
        return present and actual == expected
    if op == "ne_value":
        return present and actual != expected
    if op == "in":
        return present and actual in expected
    if op == "null":
        return present and actual is None
    if op == "not_null":
        return present and actual is not None
    if op == "exists":
        return present and actual not in (None, "", [], {})
    if op == "len_eq":
        return isinstance(actual, list) and len(actual) == expected
    if op == "len_gte":
        return isinstance(actual, list) and len(actual) >= expected
    if op in ("gte", "lte"):
        if not isinstance(actual, int | float) or isinstance(actual, bool):
            return False
        return actual >= expected if op == "gte" else actual <= expected
    if op == "contains_any":
        return present and _contains_any(actual, expected)
    if op == "not_contains":
        return (not present) or expected not in _text(actual)
    if op == "same_as":
        return present and actual == expected
    raise ValueError(f"unknown assertion op: {op}")


# ---------- request preparation ----------


def build_question(spec):
    if isinstance(spec, str):
        return spec
    kind = spec.get("generate")
    if kind == "repeat":
        return spec["char"] * spec["count"]
    if kind == "pad":
        prefix = spec.get("prefix", "")
        return prefix + spec["char"] * (spec["total"] - len(prefix))
    raise ValueError(f"unknown question generator: {kind}")


def substitute(value, results):
    """Replace '{stepN.path}' strings with values from earlier step responses."""
    if isinstance(value, str):
        match = STEP_REF.match(value)
        if match:
            step, path = int(match[1]), match[2]
            body = results.get(step, {}).get("body")
            found = resolve(body, path) if body is not None else MISSING
            if found is MISSING:
                raise LookupError(f"unresolved reference {value}")
            return found
        if value.startswith("{") and value.endswith("}"):
            raise LookupError(f"unresolved reference {value}")
        return value
    if isinstance(value, dict):
        return {k: substitute(v, results) for k, v in value.items()}
    if isinstance(value, list):
        return [substitute(v, results) for v in value]
    return value


def prepare_request(raw, run_id, results):
    request = substitute(dict(raw), results)
    request["question"] = build_question(request["question"])
    request["request_id"] = f"{run_id}-{request['request_id']}"
    if len(request["request_id"]) > MAX_REQUEST_ID:
        raise ValueError(f"request_id longer than {MAX_REQUEST_ID}: {request['request_id']}")
    return request


def blocked_reason(case):
    if case.get("fault"):
        return "fault injection is not automated yet"
    if case.get("precondition"):
        return "precondition must be prepared first"
    if any("request" not in step for step in case["steps"]):
        return "contains an operator step"
    return None


# ---------- transport ----------


def post_json(url, body, headers, timeout):
    data = json.dumps(body, ensure_ascii=False).encode("utf-8")
    req = urllib.request.Request(url, data=data, method="POST")
    req.add_header("Content-Type", "application/json")
    for key, value in headers.items():
        req.add_header(key, value)
    started = time.monotonic()
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            status, raw = resp.status, resp.read()
    except urllib.error.HTTPError as err:
        status, raw = err.code, err.read()
    except (urllib.error.URLError, TimeoutError, OSError) as err:
        elapsed = round((time.monotonic() - started) * 1000)
        return {"status": None, "body": None, "elapsed_ms": elapsed, "error": type(err).__name__}
    elapsed = round((time.monotonic() - started) * 1000)
    try:
        body = json.loads(raw.decode("utf-8")) if raw else None
        error = None
    except (UnicodeDecodeError, json.JSONDecodeError):
        body, error = None, "invalid_json"
    return {"status": status, "body": body, "elapsed_ms": elapsed, "error": error}


# ---------- judging ----------


def global_checks(step_no, request, result):
    out = []
    body = result["body"]
    if body is not None:
        leaked = PHONE.search(_text(body)) or EMAIL.search(_text(body))
        out.append(("G03", step_no, "contact pattern absent", not leaked))
    if result["status"] == 200 and isinstance(body, dict):
        out.append(
            ("G01", step_no, "request_id echoed", body.get("request_id") == request["request_id"])
        )
        out.append(("G02", step_no, "route in common set", body.get("route") in ROUTES))
        if body.get("route") != HANDOFF:
            out.append(
                (
                    "G05",
                    step_no,
                    "non-handoff ticket is null",
                    "ticket" in body and body["ticket"] is None,
                )
            )
    return [{"id": i, "step": s, "check": c, "passed": p} for i, s, c, p in out]


def judge_case(case, results):
    expected = case.get("expected", {})
    sent = sorted(results)
    checks, unverified = [], []
    for step in case["steps"]:
        no = step["step"]
        want = step.get("expected_status", expected.get("http_status"))
        if want is not None:
            checks.append(
                {
                    "step": no,
                    "path": "<http_status>",
                    "op": "eq",
                    "expected": want,
                    "passed": results[no]["status"] == want,
                }
            )
        limit = expected.get("limit_ms")
        if limit is not None:
            checks.append(
                {
                    "step": no,
                    "path": "<elapsed_ms>",
                    "op": "lte",
                    "expected": limit,
                    "passed": results[no]["elapsed_ms"] <= limit,
                }
            )
    for item in expected.get("assertions", []):
        if item.get("source") != "response" or "op" not in item:
            unverified.append(
                {"step": item.get("step"), "source": item.get("source"), "check": item.get("check")}
            )
            continue
        targets = [item["step"]] if "step" in item else sent
        for no in targets:
            step = next(s for s in case["steps"] if s["step"] == no)
            value = item.get("value")
            if value == "{step.expected_codes}":
                value = step.get("expected_codes", [])
            if item["op"] == "same_as":
                value = resolve(results[value["step"]]["body"], value["path"])
            actual = (
                resolve(results[no]["body"], item["path"])
                if results[no]["body"] is not None
                else MISSING
            )
            checks.append(
                {
                    "step": no,
                    "path": item["path"],
                    "op": item["op"],
                    "expected": None if value is MISSING else value,
                    "passed": check(item["op"], actual, value),
                }
            )
    for item in expected.get("conditional", []):
        unverified.append(
            {"step": None, "source": "conditional", "check": f"{item['if']} -> {item['then']}"}
        )
    manual = list(expected.get("manual", []))
    return checks, unverified, manual


def case_status(checks, globals_, unverified, manual):
    if not all(c["passed"] for c in checks + globals_):
        return "fail"
    if unverified or manual:
        return "auto_pass_unverified"
    return "pass"


# ---------- run bookkeeping ----------


def make_run_id(env, desc, now, base):
    for part, label in ((env, "env"), (desc, "desc")):
        if not NAME_PART.match(part):
            raise ValueError(f"{label} must be lowercase letters, digits or '-': {part}")
    stem = f"{now.strftime('%Y%m%d-%H%M%S')}-{env}-{desc}"
    run_id, n = stem, 2
    while (base / "runs" / run_id).exists() or (base / "runs/public" / run_id).exists():
        run_id, n = f"{stem}-{n}", n + 1
    return run_id


def git_info(base):
    def run(*args):
        try:
            out = subprocess.run(
                ["git", *args], cwd=base, capture_output=True, text=True, check=True
            )
            return out.stdout.strip()
        except (OSError, subprocess.CalledProcessError):
            return None

    status = run("status", "--porcelain")
    return {
        "commit": run("rev-parse", "HEAD"),
        "branch": run("rev-parse", "--abbrev-ref", "HEAD"),
        "dirty": None if status is None else bool(status),
    }


def sha256(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def load_cases(base, files, wanted):
    selected = []
    for name in files:
        data = json.loads((base / name).read_text(encoding="utf-8"))
        for case in data["cases"]:
            if not wanted or case["id"] in wanted:
                selected.append((name, case))
    missing = set(wanted or []) - {c["id"] for _, c in selected}
    if missing:
        raise ValueError(f"unknown case ids: {sorted(missing)}")
    return selected


def run_case(case, run_id, url, headers, timeout, dry_run):
    results, requests = {}, {}
    for step in sorted(case["steps"], key=lambda s: s["step"]):
        try:
            request = prepare_request(step["request"], run_id, results)
        except LookupError as err:
            return {
                "status": "blocked",
                "reason": str(err),
                "requests": requests,
                "results": results,
            }
        requests[step["step"]] = request
        if dry_run:
            continue
        results[step["step"]] = post_json(url, request, headers, timeout)
    return {"status": "sent", "requests": requests, "results": results}


def public_step(no, request, result):
    body = result["body"] if isinstance(result["body"], dict) else {}
    ticket = body.get("ticket") if isinstance(body.get("ticket"), dict) else None
    return {
        "step": no,
        "request_id": request["request_id"],
        "http_status": result["status"],
        "elapsed_ms": result["elapsed_ms"],
        "transport_error": result["error"],
        "route": body.get("route"),
        "codes": body.get("codes"),
        "has_ticket": ticket is not None,
        "ticket_priority": ticket.get("priority") if ticket else None,
        "ticket_duplicate": ticket.get("duplicate") if ticket else None,
        "sources_count": len(body["sources"]) if isinstance(body.get("sources"), list) else None,
        "security_masked": (body.get("security") or {}).get("masked")
        if isinstance(body.get("security"), dict)
        else None,
    }


def write_new(path, data):
    path.parent.mkdir(parents=True, exist_ok=False)
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def execute(args, base=ROOT, now=None):
    now = now or datetime.now(KST)
    files = args.cases_file or DEFAULT_CASE_FILES
    selected = load_cases(base, files, args.case)
    run_id = make_run_id(args.env, args.desc, now, base)
    headers = {}
    if args.auth_header:
        token = os.environ.get(args.auth_token_env)
        if not token:
            raise ValueError(f"environment variable {args.auth_token_env} is not set")
        headers[args.auth_header] = token

    public_cases, raw_cases = [], []
    for file_name, case in selected:
        reason = blocked_reason(case)
        if reason:
            public_cases.append(
                {"id": case["id"], "file": file_name, "status": "blocked", "reason": reason}
            )
            continue
        sent = run_case(case, run_id, args.url, headers, args.timeout, args.dry_run)
        if sent["status"] == "blocked":
            public_cases.append(
                {"id": case["id"], "file": file_name, "status": "blocked", "reason": sent["reason"]}
            )
            continue
        if args.dry_run:
            public_cases.append(
                {
                    "id": case["id"],
                    "file": file_name,
                    "status": "dry_run",
                    "requests": sent["requests"],
                }
            )
            continue
        checks, unverified, manual = judge_case(case, sent["results"])
        globals_ = [
            g
            for no in sent["results"]
            for g in global_checks(no, sent["requests"][no], sent["results"][no])
        ]
        status = case_status(checks, globals_, unverified, manual)
        public_cases.append(
            {
                "id": case["id"],
                "file": file_name,
                "status": status,
                "steps": [
                    public_step(no, sent["requests"][no], sent["results"][no])
                    for no in sorted(sent["results"])
                ],
                "checks": checks,
                "global_checks": globals_,
                "unverified": unverified,
                "manual": manual,
            }
        )
        raw_cases.append(
            {"id": case["id"], "requests": sent["requests"], "results": sent["results"]}
        )

    counts = {}
    for item in public_cases:
        counts[item["status"]] = counts.get(item["status"], 0) + 1
    summary = {
        "run_id": run_id,
        "executed_at": now.isoformat(timespec="seconds"),
        "environment": args.env,
        "kind": "dry_run" if args.dry_run else "service_cases",
        "path": args.path,
        "versions": {
            "git": git_info(base),
            "workflow": args.workflow_version,
            "config": args.config_version,
            "case_files": {name: sha256(base / name) for name in files},
            "python": platform.python_version(),
        },
        "counts": counts,
        "meaning": "auto_pass_unverified = response checks passed but ticket/state/DLQ/alert/n8n "
        "or manual checks are still open; it is not a full pass",
        "cases": public_cases,
    }
    if args.dry_run:
        return summary, None
    public_path = base / "runs/public" / run_id / "summary.json"
    raw_path = base / "runs" / run_id / "raw.json"
    write_new(raw_path, {"run_id": run_id, "url": args.url, "cases": raw_cases})
    write_new(public_path, summary)
    return summary, public_path


def parse_args(argv):
    p = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    p.add_argument(
        "--url", required=True, help="support webhook URL (kept only in private raw.json)"
    )
    p.add_argument("--env", required=True, help="environment label, e.g. local, vm")
    p.add_argument("--desc", required=True, help="short run description, e.g. p13-entry")
    p.add_argument(
        "--path",
        choices=["data-api", "jira", "mock"],
        required=True,
        help="ticket path in use; data-api results are not Jira evidence",
    )
    p.add_argument("--case", nargs="*", help="case ids to run (default: all)")
    p.add_argument("--cases-file", nargs="*", help="case files relative to repo root")
    p.add_argument("--workflow-version", default="unrecorded")
    p.add_argument("--config-version", default="unrecorded")
    p.add_argument("--auth-header", help="header name for webhook auth")
    p.add_argument(
        "--auth-token-env",
        default="DUBAKWI_WEBHOOK_TOKEN",
        help="environment variable that holds the auth header value",
    )
    p.add_argument("--timeout", type=float, default=30.0)
    p.add_argument("--dry-run", action="store_true", help="print resolved requests, send nothing")
    return p.parse_args(argv)


def main(argv=None):
    args = parse_args(argv)
    try:
        summary, path = execute(args)
    except (ValueError, OSError) as err:
        print(f"error: {err}", file=sys.stderr)
        return 2
    print(
        json.dumps(
            {
                "run_id": summary["run_id"],
                "counts": summary["counts"],
                "summary": str(path.relative_to(ROOT)) if path else None,
            },
            ensure_ascii=False,
        )
    )
    if summary["kind"] == "dry_run":
        print(json.dumps(summary["cases"], ensure_ascii=False, indent=2))
    return 1 if summary["counts"].get("fail") else 0


if __name__ == "__main__":
    sys.exit(main())
