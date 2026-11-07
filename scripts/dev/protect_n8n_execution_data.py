"""Apply no-history settings to an authenticated Webhook import copy.

This doesn't strip request headers before execution or erase old/soft-deleted data.
No n8n/API calls. Output must be a new private runs/ file, never the source.
"""

import argparse
import copy
import json
import os
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
POLICY = {
    "saveDataErrorExecution": "none",
    "saveDataSuccessExecution": "none",
    "saveManualExecutions": False,
    "saveExecutionProgress": False,
}


def protect(workflow):
    if not isinstance(workflow, dict) or not isinstance(workflow.get("nodes"), list):
        raise ValueError("expected one exported workflow object")
    if not any(
        node.get("type") == "n8n-nodes-base.webhook"
        and node.get("parameters", {}).get("authentication") == "headerAuth"
        for node in workflow["nodes"]
    ):
        raise ValueError("no Header Auth Webhook; refusing an unrelated workflow")
    result = copy.deepcopy(workflow)
    result.setdefault("settings", {}).update(POLICY)
    return result


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--source", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()
    target = args.output.resolve()
    private_runs = ROOT / "runs"
    if (
        not target.is_relative_to(private_runs)
        or target.is_relative_to(private_runs / "public")
        or target == args.source.resolve()
    ):
        parser.error("output must be a new file in private runs/, outside runs/public")
    try:
        result = protect(json.loads(args.source.read_text(encoding="utf-8-sig")))
        target.parent.mkdir(parents=True, exist_ok=True)
        descriptor = os.open(target, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
        with os.fdopen(descriptor, "w", encoding="utf-8") as handle:
            json.dump(result, handle, ensure_ascii=False, indent=2)
            handle.write("\n")
    except (OSError, ValueError) as error:
        parser.exit(1, f"execution settings guard failed: {error}\n")
    print(json.dumps({"settings": POLICY, "business_nodes_unchanged": True}))


if __name__ == "__main__":
    main()
