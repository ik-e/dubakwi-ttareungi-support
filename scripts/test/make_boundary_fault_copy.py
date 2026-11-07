"""Create inactive, single-boundary fault copies; never change credentials.

Only render to a new private runs/ path. Does not publish or execute anything.
Normal sources and common P11/P19 copies remain unchanged. The caller must bind
all dependencies to an isolated, same-scope test bundle before execution.
"""

from __future__ import annotations

import argparse
import copy
import hashlib
import json
import uuid
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
MODES = {
    "create": ("handoff", "H05"),
    "bind": ("handoff", "H17"),
    "context": ("handoff", "H58"),
    "close": ("handoff", "H08"),
    "assign": ("handoff", "H09"),
    "alert": ("handoff", "H11"),
    "save": ("state", "S10"),
    "state_fail": ("state", "S04"),
    "dlq": ("dlq", "D04"),
    "unexpected": ("support", "B10"),
}


def build(source: dict, mode: str) -> dict:
    kind, prefix = MODES[mode]
    result = copy.deepcopy(source)
    target = next(n for n in result["nodes"] if n["name"].startswith(prefix + " "))
    if mode == "state_fail":
        # Only fail the operator/error fail request; normal begin/bind/finish stay SQL.
        target = next(n for n in result["nodes"] if n["name"].startswith("S02 "))
        target["parameters"]["jsCode"] = (
            "if ($json.op==='fail') return [{json:{request_id:$json.state_ref?.request_id??null,"
            "ok:false,skipped:false,state_ref:$json.state_ref??null,error_code:'state_error'}}];\n"
            + target["parameters"]["jsCode"]
        )
    else:
        code = "return [{json:{statusCode:503,body:{error:'synthetic_fault'}}}];"
        if mode == "bind":
            code = (
                "return [{json:{ok:false,skipped:false,state_ref:null,error_code:'state_error'}}];"
            )
        elif mode == "save":
            code = (
                "const r=$('S01 상태 명령 수신').item.json;return [{json:{request_id:"
                "r.state_ref.request_id,ok:false,state_ref:r.state_ref,error_code:'state_error',"
                "recovery:{version:1,mode:'manual_required',action:'finish',args:null,"
                "reference:null,reason:'synthetic save fault'}}}];"
            )
        elif mode == "dlq":
            code = "return [{json:{request_id:$json.request_id??null,ok:false,dlq_id:null,deduplicated:false,error_code:'dlq_error'}}];"
        elif mode == "unexpected":
            code = "throw new Error('synthetic unexpected failure');"
        target["type"] = "n8n-nodes-base.code"
        target["typeVersion"] = 2
        target["parameters"] = {"jsCode": code}
        for field in ("credentials", "retryOnFail", "onError", "continueOnFail"):
            target.pop(field, None)
        # Remove the LLM resource connection to a node replaced by Code.
        for ports in result["connections"].values():
            for key, outputs in list(ports.items()):
                if key == "main":
                    continue
                ports[key] = [
                    [e for e in edges if e["node"] != target["name"]] for edges in outputs
                ]
    name = f"dubakwi-{kind}-fault-{mode}"
    result.update(
        id="fault" + uuid.uuid5(uuid.NAMESPACE_URL, name).hex[:20], name=name, active=False
    )
    for n in result["nodes"]:
        if n["type"] == "n8n-nodes-base.webhook":
            n["parameters"]["path"] = name
            n["webhookId"] = str(uuid.uuid5(uuid.NAMESPACE_URL, name))
    return result


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--source", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--mode", choices=MODES, required=True)
    args = parser.parse_args()
    dest = args.output.resolve()
    private = (ROOT / "runs").resolve()
    public = private / "public"
    if private not in dest.parents or public in dest.parents:
        parser.error("output must be a new private runs/ file")
    rendered = (
        json.dumps(
            build(json.loads(args.source.read_text("utf-8")), args.mode),
            ensure_ascii=False,
            indent=2,
        )
        + "\n"
    )
    dest.parent.mkdir(parents=True, exist_ok=True)
    with dest.open("x", encoding="utf-8") as stream:
        stream.write(rendered)
    print(f"inactive mode={args.mode} sha256={hashlib.sha256(rendered.encode()).hexdigest()}")


if __name__ == "__main__":
    main()
