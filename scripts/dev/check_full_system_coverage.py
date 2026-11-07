"""Audit planning coverage, not runtime success. No HTTP/DB/Jira/VM calls.

Run: uv run --locked python scripts/dev/check_full_system_coverage.py
Use --output with a new evidence filename; historic evidence is never overwritten.
"""

import argparse
import hashlib
import json
import re
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
MAPPING = "infra/design-implementation-mapping.md"
COVERAGE = "infra/contracts/full-system-coverage.json"
FIXTURE = "infra/contracts/jira-case-context-v1.example.json"


def source_rows(text):
    return {
        cells[0]: cells
        for line in text.splitlines()
        if re.match(r"^\| [CBJSREO]\d{2} \|", line)
        for cells in [[part.strip() for part in line.split("|")[1:-1]]]
    }


def validate(plan, rows, fixture):
    errors = []
    items = plan.get("items", [])
    packages = plan.get("packages", [])
    pmap = {p["id"]: p for p in packages}
    ids = [item["id"] for item in items]
    tests = [item["acceptance_test"]["id"] for item in items]
    if len(ids) != len(set(ids)) or len(tests) != len(set(tests)):
        errors.append("duplicate requirement or acceptance ID")
    if len(pmap) != len(packages):
        errors.append("duplicate package ID")
    if set(ids) != set(rows):
        errors.append(
            f"coverage mismatch: missing={sorted(set(rows) - set(ids))}, "
            f"extra={sorted(set(ids) - set(rows))}"
        )
    if len(rows) != 64:
        errors.append("audited baseline changed from 64; update plan version and evidence")
    visiting, visited = set(), set()

    def visit(key):
        if key in visiting:
            errors.append(f"cyclic live dependency: {key}")
            return
        if key in visited:
            return
        if key not in pmap:
            errors.append(f"unknown dependency: {key}")
            return
        visiting.add(key)
        for dependency in pmap[key]["live_dependencies"]:
            visit(dependency)
        visiting.remove(key)
        visited.add(key)

    for key in pmap:
        visit(key)
    for item in items:
        key = item["id"]
        if key not in rows:
            continue
        original = rows[key]
        if item["requirement"] != original[1]:
            errors.append(f"changed source requirement: {key}")
        if item["original_completion_condition"] != original[4]:
            errors.append(f"completion condition lost: {key}")
        package = pmap.get(item["package"])
        if not package or item["task_lead"] != package["lead"]:
            errors.append(f"invalid work assignment: {key}")
        elif item["live_dependencies"] != package["live_dependencies"]:
            errors.append(f"dependency drift: {key}")
        test = item["acceptance_test"]
        if test["id"] != f"AC-{key}" or test["status"] != "planned":
            errors.append(f"test not a unique planned acceptance: {key}")
        if test["expected"] != original[4] or not test["required_evidence"]:
            errors.append(f"missing expected result or effect evidence: {key}")
        if not item["action"] or not item["delivery"]:
            errors.append(f"missing action or handoff: {key}")
        if item["execution_status"] != "not_run_in_this_plan":
            errors.append(f"planning document implies execution: {key}")
        for path in item["contract_sections"] + [item["source"]]:
            if not (ROOT / path).is_file():
                errors.append(f"missing source: {path}")
        expected_policy = "known_limit_not_implemented" if key == "S10" else "required_evidence"
        if item["closure_policy"] != expected_policy:
            errors.append(f"unexpected exemption: {key}")
    f = fixture
    support = f["support"]
    if (
        f["schema_version"] != 1
        or type(f["revision"]) is not int
        or f["revision"] < 1
        or support["version"] is not None
    ):
        errors.append("context schema/revision mismatch")
    for field in ["case_id", "owner_id", "first_request_id"]:
        if f[field] != support[field]:
            errors.append(f"context binding mismatch: {field}")
    if f["ticket_key"] != support["ticket_id"]:
        errors.append("context ticket mismatch")
    event = json.dumps(
        [f["scope"], f["case_id"], f["request_id"], f["phase"]],
        ensure_ascii=False,
        separators=(",", ":"),
    )
    if f["event_id"] != hashlib.sha256(event.encode("utf-8")).hexdigest():
        errors.append("context event hash mismatch")
    if f["phase"] not in ["wait", "handoff", "followup", "close", "save"]:
        errors.append("context phase invalid")
    if support["status"] == "handed_off" and (
        support["assignee_role"] not in ["support", "security"]
        or support["priority"] not in ["normal", "high"]
    ):
        errors.append("handed_off context lacks role/priority")
    body = "[dubakwi-case-context:v1]\n" + json.dumps(f, ensure_ascii=False)
    if json.loads(body.split("\n", 1)[1]) != f:
        errors.append("context text JSON round-trip failed")
    return errors


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output", type=Path)
    args = parser.parse_args()
    plan = json.loads((ROOT / COVERAGE).read_text(encoding="utf-8"))
    rows = source_rows((ROOT / MAPPING).read_text(encoding="utf-8"))
    fixture = json.loads((ROOT / FIXTURE).read_text(encoding="utf-8"))
    errors = validate(plan, rows, fixture)
    report = {
        "environment": "local plan/fixture structure audit only; no service execution",
        "baseline": plan["baseline"],
        "plan_version": plan["version"],
        "mapped_requirements": len(plan["items"]),
        "packages": len(plan["packages"]),
        "planned_acceptance_tests": len(plan["items"]),
        "planned_by_area": dict(Counter(item["id"][0] for item in plan["items"])),
        "runtime_tests_executed": 0,
        "known_limit": ["S10/TC07 automatic replay not implemented"],
        "errors": errors,
        "source_sha256_lf": {
            path: hashlib.sha256((ROOT / path).read_bytes().replace(b"\r\n", b"\n")).hexdigest()
            for path in [MAPPING, COVERAGE, FIXTURE]
        },
    }
    if args.output:
        args.output.parent.mkdir(parents=True, exist_ok=True)
        with args.output.open("x", encoding="utf-8") as handle:
            handle.write(json.dumps(report, ensure_ascii=False, indent=2) + "\n")
    print(json.dumps(report, ensure_ascii=False))
    return bool(errors)


if __name__ == "__main__":
    raise SystemExit(main())
