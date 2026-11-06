"""R04 workflow 묶음의 반입 전 구조·비밀·DB 조건을 읽기 전용 검사한다."""

import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
WORKFLOWS = {
    "state": ("workflows/dubakwi-state.json", "dubakwiState01"),
    "dlq": ("workflows/dubakwi-dlq.json", "dubakwiDlq0001"),
    "handoff": ("workflows/dubakwi-handoff.json", None),
}
EXPECTED_PLACEHOLDERS = {
    "__JIRA_BASE_URL__",
    "__ASSIGNEE_MAP_JSON__",
}
SECRET_PATTERNS = [
    re.compile(r"(?i)(api[_-]?key|token|password|secret)\s*[:=]\s*['\"][^'\"]{8,}"),
    re.compile(r"(?i)bearer\s+[a-z0-9._-]{12,}"),
]


def main() -> int:
    findings: list[str] = []
    placeholders: set[str] = set()
    for label, (relative, expected_id) in WORKFLOWS.items():
        path = ROOT / relative
        workflow = json.loads(path.read_text(encoding="utf-8"))
        if expected_id and workflow.get("id") != expected_id:
            findings.append(f"{label}: workflow id mismatch")
        nodes = {node["name"]: node for node in workflow.get("nodes", [])}
        targets = {
            edge["node"]
            for connection in workflow.get("connections", {}).values()
            for output in connection.get("main", [])
            for edge in (output or [])
        }
        unknown = sorted(targets - nodes.keys())
        if unknown:
            findings.append(f"{label}: unknown edge targets {unknown}")
        text = path.read_text(encoding="utf-8")
        placeholders.update(re.findall(r"__[A-Z0-9_]+__", text))
        if any(pattern.search(text) for pattern in SECRET_PATTERNS):
            findings.append(f"{label}: possible embedded secret")

    unexpected = placeholders - EXPECTED_PLACEHOLDERS
    if unexpected:
        findings.append(f"unexpected placeholders: {sorted(unexpected)}")

    migration = (ROOT / "infra/db/migrations/001-create-service-storage.sql").read_text(
        encoding="utf-8"
    )
    if "request_state_one_active_case_idx" not in migration:
        findings.append("active case unique index missing")

    handoff = json.loads((ROOT / WORKFLOWS["handoff"][0]).read_text(encoding="utf-8"))
    handoff_nodes = {node["name"]: node for node in handoff["nodes"]}
    for name in ["H29 Jira 기존 건 조회", "H50 Jira 알림 성공 표식"]:
        if name not in handoff_nodes:
            findings.append(f"handoff: {name} missing")
    print(
        json.dumps(
            {
                "ok": not findings,
                "workflow_count": len(WORKFLOWS),
                "expected_deployment_placeholders": sorted(placeholders),
                "findings": findings,
                "limits": [
                    "placeholder values and credentials are checked by R01 outside Git",
                    "this is not a VM, Jira, PostgreSQL runtime, or S1 test",
                ],
            },
            ensure_ascii=False,
        )
    )
    return 0 if not findings else 1


if __name__ == "__main__":
    raise SystemExit(main())
