"""Run cases/*.json (flow.py test format) against the support webhook and record judged results.

The official runner is the kit's `tools/flow.py test`. This tool reads the same case shape
(webhook, before/after, name, body, expect{status, equals, contains, not_contains,
max_seconds}) and adds the team extension `x_dubakwi` (extra assertions, multi-step cases,
open checks). Ticket/state/DLQ/alert/n8n checks and manual checks stay unverified, so a case
is never reported as a full pass while those remain. Cases that need preparation, test
switches or operator steps are reported as blocked and not sent.

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
DEFAULT_CASE_FILES = ["cases/common.json", "cases/team.json", "cases/team-extended.json"]
DEFAULT_DATA_API = "http://localhost:8800"
DEFAULT_TOKEN_ENVS = ["FLOW_WEBHOOK_KEY", "DUBAKWI_WEBHOOK_TOKEN"]
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


def flow_contains(actual, value):
    """Our reading of flow.py contains/not_contains (to confirm against the kit).

    list -> an item equals the value, is a dict holding it as a field value, or is a
    string containing it; string -> substring; dict -> a field value equals it.
    """
    if isinstance(actual, list):
        return any(
            item == value
            or (isinstance(item, dict) and value in item.values())
            or (isinstance(item, str) and isinstance(value, str) and value in item)
            for item in actual
        )
    if isinstance(actual, str):
        return isinstance(value, str) and value in actual
    if isinstance(actual, dict):
        return value in actual.values()
    return False


def check(op, actual, expected):
    """Return True/False for one x_dubakwi assertion operator."""
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


# ---------- case loading ----------


def normalize(file_name, raw):
    """Turn one flow-format case into a unit with numbered steps."""
    x = raw.get("x_dubakwi", {})
    if "steps" in x:
        steps = [
            {
                "step": s["step"],
                "body": s["body"],
                "expect": s.get("expect", {}),
                "assert": s.get("assert", []),
            }
            for s in x["steps"]
        ]
    elif "body" in raw:
        steps = [
            {
                "step": 1,
                "body": raw["body"],
                "expect": raw.get("expect", {}),
                "assert": x.get("assert", []),
            }
        ]
    else:
        steps = []
    return {
        "name": raw["name"],
        "id": x.get("id", raw["name"]),
        "file": file_name,
        "steps": steps,
        "before": raw.get("before", []),
        "after": raw.get("after", []),
        "requires": x.get("requires"),
        "manual_fault": x.get("manual_fault"),
        "expected_codes": x.get("expected_codes"),
        "checks": list(x.get("checks", [])),
        "manual": list(x.get("manual", [])),
    }


def load_cases(base, files, wanted):
    loaded = []
    for name in files:
        data = json.loads((base / name).read_text(encoding="utf-8"))
        units = [normalize(name, c) for c in data["cases"]]
        if wanted:
            units = [u for u in units if u["id"] in wanted or u["name"] in wanted]
        loaded.append(
            {
                "file": name,
                "webhook": data.get("webhook"),
                "before": data.get("before", []),
                "units": units,
            }
        )
    found = {u["id"] for f in loaded for u in f["units"]} | {
        u["name"] for f in loaded for u in f["units"]
    }
    missing = set(wanted or []) - found
    if missing:
        raise ValueError(f"unknown case ids: {sorted(missing)}")
    return loaded


# ---------- request preparation ----------


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
    request["request_id"] = f"{run_id}-{request['request_id']}"
    if len(request["request_id"]) > MAX_REQUEST_ID:
        raise ValueError(f"request_id longer than {MAX_REQUEST_ID}: {request['request_id']}")
    return request


def blocked_reason(unit, opts):
    if unit["requires"]:
        return f"requires: {unit['requires']}"
    if not unit["steps"]:
        return "no request to send (operator step)"
    if unit["manual_fault"] and not opts.manual_fault_ready:
        return f"manual fault: run '{unit['manual_fault']['before']}' then --manual-fault-ready"
    if (unit["before"] or unit["after"]) and not opts.hooks:
        return "fault hooks disabled (--no-hooks)"
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


def run_hooks(hooks, data_api, timeout):
    """POST before/after hooks (data-api reset/fault). Returns list of hook outcomes."""
    out = []
    for hook in hooks:
        url = hook["url"]
        if url.startswith(DEFAULT_DATA_API):
            url = data_api + url[len(DEFAULT_DATA_API) :]
        result = post_json(url, hook.get("body", {}), {}, timeout)
        ok = result["status"] is not None and 200 <= result["status"] < 300
        out.append(
            {
                "path": url[len(data_api) :] if url.startswith(data_api) else "<custom>",
                "body": hook.get("body", {}),
                "ok": ok,
                "status": result["status"],
            }
        )
    return out


# ---------- judging ----------


def judge_step(step, result, earlier_cases, step_results):
    expect, body = step["expect"], result["body"]
    out = []

    def add(kind, path, expected, passed):
        out.append(
            {
                "step": step["step"],
                "kind": kind,
                "path": path,
                "expected": None if expected is MISSING else expected,
                "passed": passed,
            }
        )

    if "status" in expect:
        add("status", "<http_status>", expect["status"], result["status"] == expect["status"])
    if "max_seconds" in expect:
        limit = expect["max_seconds"] * 1000
        add("max_seconds", "<elapsed_ms>", expect["max_seconds"], result["elapsed_ms"] <= limit)
    for path, value in expect.get("equals", {}).items():
        actual = resolve(body, path) if body is not None else MISSING
        add("equals", path, value, actual is not MISSING and actual == value)
    for path, values in expect.get("contains", {}).items():
        actual = resolve(body, path) if body is not None else MISSING
        for value in values:
            add("contains", path, value, flow_contains(actual, value))
    for path, values in expect.get("not_contains", {}).items():
        actual = resolve(body, path) if body is not None else MISSING
        for value in values:
            add("not_contains", path, value, not flow_contains(actual, value))
    for item in step["assert"]:
        value = item.get("value")
        if item["op"] == "same_as":
            if "case" in value:
                ref = earlier_cases.get(value["case"])
            else:
                ref = step_results.get(value["step"], {}).get("body")
            value = resolve(ref, value["path"]) if ref is not None else MISSING
        actual = resolve(body, item["path"]) if body is not None else MISSING
        add(f"x:{item['op']}", item["path"], value, check(item["op"], actual, value))
    return out


def global_checks(step_no, request, result):
    out = []
    body = result["body"]
    if body is not None:
        leaked = PHONE.search(_text(body)) or EMAIL.search(_text(body))
        out.append(("G03", step_no, "contact pattern absent", not leaked))
    if result["status"] == 200 and isinstance(body, dict):
        echoed = body.get("request_id") == request["request_id"]
        out.append(("G01", step_no, "request_id echoed", echoed))
        out.append(("G02", step_no, "route in common set", body.get("route") in ROUTES))
        if body.get("route") != HANDOFF:
            null_ticket = "ticket" in body and body["ticket"] is None
            out.append(("G05", step_no, "non-handoff ticket is null", null_ticket))
    return [{"id": i, "step": s, "check": c, "passed": p} for i, s, c, p in out]


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


def public_step(no, request, result):
    body = result["body"] if isinstance(result["body"], dict) else {}
    ticket = body.get("ticket") if isinstance(body.get("ticket"), dict) else None
    security = body.get("security") if isinstance(body.get("security"), dict) else {}
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
        "security_masked": security.get("masked"),
    }


def write_new(path, data):
    path.parent.mkdir(parents=True, exist_ok=False)
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def run_unit(unit, ctx):
    """Send one unit (with its hooks). Returns (public entry, raw entry or None)."""
    head = {"id": unit["id"], "name": unit["name"], "file": unit["file"]}
    reason = blocked_reason(unit, ctx["opts"])
    if reason:
        return head | {"status": "blocked", "reason": reason}, None
    requests, results, hooks = {}, {}, {}
    try:
        if ctx["opts"].dry_run:
            for step in unit["steps"]:
                try:
                    requests[step["step"]] = prepare_request(step["body"], ctx["run_id"], results)
                except LookupError as err:
                    return head | {"status": "blocked", "reason": f"dry run: {err}"}, None
            return head | {"status": "dry_run", "requests": requests}, None
        hooks["before"] = run_hooks(unit["before"], ctx["data_api"], ctx["timeout"])
        if not all(h["ok"] for h in hooks["before"]):
            return head | {
                "status": "blocked",
                "reason": "before hook failed",
                "hooks": hooks,
            }, None
        for step in unit["steps"]:
            try:
                request = prepare_request(step["body"], ctx["run_id"], results)
            except LookupError as err:
                return head | {"status": "blocked", "reason": str(err), "hooks": hooks}, None
            requests[step["step"]] = request
            results[step["step"]] = post_json(ctx["url"], request, ctx["headers"], ctx["timeout"])
    finally:
        if not ctx["opts"].dry_run and "before" in hooks:
            hooks["after"] = run_hooks(unit["after"], ctx["data_api"], ctx["timeout"])

    checks = []
    for step in unit["steps"]:
        checks += judge_step(step, results[step["step"]], ctx["case_bodies"], results)
    ctx["case_bodies"][unit["name"]] = results[unit["steps"][-1]["step"]]["body"]
    globals_ = [g for no in results for g in global_checks(no, requests[no], results[no])]
    unverified = list(unit["checks"])
    if unit["expected_codes"]:
        unverified.append(f"codes 문자열 대조 전: {unit['expected_codes']}")
    after_ok = all(h["ok"] for h in hooks.get("after", []))
    if not after_ok:
        unverified.append("after hook failed: 고장 해제를 수동으로 확인")
    status = case_status(checks, globals_, unverified, unit["manual"])
    public = head | {
        "status": status,
        "steps": [public_step(no, requests[no], results[no]) for no in sorted(results)],
        "checks": checks,
        "global_checks": globals_,
        "hooks": hooks,
        "unverified": unverified,
        "manual": unit["manual"],
    }
    return public, {
        "id": unit["id"],
        "name": unit["name"],
        "requests": requests,
        "results": results,
    }


def execute(args, base=ROOT, now=None):
    now = now or datetime.now(KST)
    files = args.cases_file or DEFAULT_CASE_FILES
    loaded = load_cases(base, files, args.case)
    run_id = make_run_id(args.env, args.desc, now, base)
    headers = {}
    names = [args.auth_token_env] if args.auth_token_env else DEFAULT_TOKEN_ENVS
    token_env = next((n for n in names if os.environ.get(n)), None)
    if token_env:
        headers[args.auth_header] = os.environ[token_env]
    elif args.auth_required:
        raise ValueError(f"environment variable {' or '.join(names)} is not set")

    ctx = {
        "opts": args,
        "run_id": run_id,
        "headers": headers,
        "timeout": args.timeout,
        "data_api": args.data_api.rstrip("/"),
        "case_bodies": {},
    }
    public_cases, raw_cases, file_hooks = [], [], {}
    for entry in loaded:
        webhook = args.webhook or entry["webhook"]
        ctx["url"] = f"{args.base_url.rstrip('/')}/webhook/{webhook}"
        if entry["before"] and args.hooks and not args.dry_run and entry["units"]:
            file_hooks[entry["file"]] = run_hooks(entry["before"], ctx["data_api"], args.timeout)
        for unit in entry["units"]:
            public, raw = run_unit(unit, ctx)
            public_cases.append(public)
            if raw:
                raw_cases.append(raw)

    counts = {}
    for item in public_cases:
        counts[item["status"]] = counts.get(item["status"], 0) + 1
    summary = {
        "run_id": run_id,
        "executed_at": now.isoformat(timespec="seconds"),
        "environment": args.env,
        "kind": "dry_run" if args.dry_run else "service_cases",
        "runner": "scripts/test/run_cases.py (not the kit flow.py)",
        "path": args.path,
        "auth_header_sent": bool(headers),
        "auth_token_env": token_env,
        "versions": {
            "git": git_info(base),
            "workflow": args.workflow_version,
            "config": args.config_version,
            "case_files": {name: sha256(base / name) for name in files},
            "python": platform.python_version(),
        },
        "file_hooks": file_hooks,
        "counts": counts,
        "meaning": "auto_pass_unverified = response checks passed but ticket/state/DLQ/alert/n8n "
        "or manual checks are still open; it is not a full pass",
        "cases": public_cases,
    }
    if args.dry_run:
        return summary, None
    public_path = base / "runs/public" / run_id / "summary.json"
    raw_path = base / "runs" / run_id / "raw.json"
    write_new(raw_path, {"run_id": run_id, "base_url": args.base_url, "cases": raw_cases})
    write_new(public_path, summary)
    return summary, public_path


def parse_args(argv):
    p = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    p.add_argument(
        "--base-url",
        default="http://localhost:5678",
        help="n8n base URL; kept only in private raw.json",
    )
    p.add_argument("--webhook", help="override the webhook name in the case files")
    p.add_argument(
        "--data-api", default=DEFAULT_DATA_API, help="data-api base used for before/after hooks"
    )
    p.add_argument("--env", required=True, help="environment label, e.g. local, vm")
    p.add_argument("--desc", required=True, help="short run description, e.g. p13-entry")
    p.add_argument(
        "--path",
        choices=["data-api", "jira", "mock"],
        required=True,
        help="ticket path in use; data-api results are not Jira evidence",
    )
    p.add_argument("--case", nargs="*", help="case ids or names to run (default: all)")
    p.add_argument("--cases-file", nargs="*", help="case files relative to repo root")
    p.add_argument(
        "--no-hooks",
        dest="hooks",
        action="store_false",
        help="do not call before/after hooks; cases that need them are blocked",
    )
    p.add_argument(
        "--manual-fault-ready",
        action="store_true",
        help="manual faults (e.g. flow.py llm down) were switched on by hand",
    )
    p.add_argument("--workflow-version", default="unrecorded")
    p.add_argument("--config-version", default="unrecorded")
    p.add_argument("--auth-header", default="X-Team-Key", help="webhook Header Auth name")
    p.add_argument(
        "--auth-token-env",
        default=None,
        help="environment variable holding the header value "
        "(default: FLOW_WEBHOOK_KEY as in flow.py, then DUBAKWI_WEBHOOK_TOKEN from .env.example)",
    )
    p.add_argument(
        "--auth-required", action="store_true", help="stop if the token variable is not set"
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
