"""handoff 사본에서 Jira 종료 전환만 실패시키는 시험용 사본을 만든다. 저장소 원본은 바꾸지 않는다.

생성·bind·조회·담당 지정은 원본과 같고, H33이 보내는 종료 전환 요청의 전환 ID만 존재하지 않는 값으로
바꾼다. Jira가 400으로 거절하면 H36이 closed=failed, partial_effect, 복구 캡슐(close)을 남긴다.

    uv run --locked python scripts/dev/make_close_fault_copy.py \
        --output runs/private-render/dubakwi-handoff-close-fault.json

주입: 이 사본을 별도 시험용 워크플로우로 가져와 시험한다(공유 사본·운영 사본에 가져오지 않는다).
해제: 시험이 끝나면 그 시험 사본을 비활성으로 두거나 삭제하고, 원본 workflows/dubakwi-handoff.json을
다시 렌더링해 가져온다. 이 도구는 원본에 아무것도 쓰지 않으므로 별도 해제 작업이 필요 없다.
Jira 주소 등은 render_n8n_workflow.py로 이어서 치환한다.
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
CLOSE_NODE_PREFIX = "H33"
ORIGINAL_FRAGMENT = "body:{transition:{id:t.id}"
FAULT_FRAGMENT = "body:{transition:{id:'0'}"
FAULT_NAME_SUFFIX = " close-fault"


class FaultCopyError(ValueError):
    """원본 형식이 달라 주입 위치를 정확히 1곳 찾지 못했을 때."""


def make_fault_copy(workflow: dict) -> dict:
    nodes = [
        n for n in workflow.get("nodes", []) if n.get("name", "").startswith(CLOSE_NODE_PREFIX)
    ]
    if len(nodes) != 1:
        raise FaultCopyError("종료 계획 노드(H33)를 정확히 1개 찾지 못했다")
    code = nodes[0]["parameters"].get("jsCode", "")
    if code.count(ORIGINAL_FRAGMENT) != 1:
        raise FaultCopyError("종료 전환 요청 위치를 정확히 1곳 찾지 못했다(handoff 형식이 바뀜)")
    nodes[0]["parameters"]["jsCode"] = code.replace(ORIGINAL_FRAGMENT, FAULT_FRAGMENT)
    workflow["name"] = str(workflow.get("name", "dubakwi-handoff")) + FAULT_NAME_SUFFIX
    workflow["active"] = False
    return workflow


def ensure_untracked_output(output: Path) -> None:
    resolved = output.resolve()
    runs = (ROOT / "runs").resolve()
    public = (ROOT / "runs" / "public").resolve()
    if runs not in resolved.parents or public in resolved.parents:
        raise FaultCopyError("출력은 Git 제외 경로인 runs/ 아래(runs/public 제외)여야 한다")


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(
        description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter
    )
    parser.add_argument("--source", type=Path, default=ROOT / "workflows" / "dubakwi-handoff.json")
    parser.add_argument("--output", required=True, type=Path)
    args = parser.parse_args(argv)
    try:
        ensure_untracked_output(args.output)
        workflow = json.loads(args.source.read_text(encoding="utf-8"))
        result = make_fault_copy(workflow)
    except (FaultCopyError, OSError, json.JSONDecodeError) as error:
        print(f"실패: {error}", file=sys.stderr)
        return 1
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(
        json.dumps(result, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )
    print(f"작성: {args.output} (종료 전환만 실패하도록 주입, 이름: {result['name']})")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
