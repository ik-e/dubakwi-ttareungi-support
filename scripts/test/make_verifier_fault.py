"""TC08 시험용 support 사본을 만든다. 검증 단계를 고정 실패 출력으로 바꾼다.

사용법: uv run --locked python scripts/test/make_verifier_fault.py --output <새 파일> [--mode grounded|unparsable]

운영 원본 workflows/dubakwi-support.json에는 시험 스위치를 넣지 않는다.
이 사본은 시험 환경에만 게시하고 시험 뒤 원본을 다시 게시한다.
"""

import argparse
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
SOURCE = ROOT / "workflows" / "dubakwi-support.json"
VERIFIER = "B20 답변 검증"
MODEL = "L03 검증 모델"
OUTPUTS = {
    "grounded": '{"grounded":false,"policy_ok":true,"issues":["시험 고장"]}',
    "unparsable": "시험 고장: JSON 아님",
}


def build(workflow: dict, mode: str) -> dict:
    copy = json.loads(json.dumps(workflow))
    node = next(item for item in copy["nodes"] if item["name"] == VERIFIER)
    text = json.dumps(OUTPUTS[mode], ensure_ascii=False)
    node.update(
        type="n8n-nodes-base.code",
        typeVersion=2,
        parameters={
            "mode": "runOnceForEachItem",
            "jsCode": f"return {{ json: {{ text: {text} }} }};\n",
        },
    )
    node.pop("onError", None)
    copy["nodes"] = [item for item in copy["nodes"] if item["name"] != MODEL]
    del copy["connections"][MODEL]
    copy["name"] = f"{copy['name']} (TC08 {mode})"
    return copy


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--mode", choices=sorted(OUTPUTS), default="grounded")
    args = parser.parse_args()
    workflow = json.loads(SOURCE.read_text(encoding="utf-8"))
    with args.output.open("x", encoding="utf-8") as file:
        json.dump(build(workflow, args.mode), file, ensure_ascii=False, indent=2)
        file.write("\n")


if __name__ == "__main__":
    main()
