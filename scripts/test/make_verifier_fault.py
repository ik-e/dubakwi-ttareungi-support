"""TC08 시험용 support 사본을 만든다. 답변·검증 단계를 고정 출력으로 바꾼다.

사용법: uv run --locked python scripts/test/make_verifier_fault.py --output <새 파일> [--mode grounded|unparsable|unknown_chunk]

unknown_chunk는 TC08-v1용이다. 검증은 통과로 두고 답변만 없는 chunk_id를 인용해 B21 Code 검사를 확인한다.
운영 원본 workflows/dubakwi-support.json에는 시험 스위치를 넣지 않는다.
사본은 경로 dubakwi-support-tc08, 별도 워크플로우 ID와 webhookId를 써서 원본과 동시에 게시할 수 있다.
두 모드는 같은 경로를 쓰므로 한 번에 하나만 게시한다. 파일 SHA-256을 출력하니 시험 결과에 함께 남긴다.
"""

import argparse
import hashlib
import json
import uuid
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
SOURCE = ROOT / "workflows" / "dubakwi-support.json"
VERIFIER = "B20 답변 검증"
MODEL = "L03 검증 모델"
FAULT_PATH = "dubakwi-support-tc08"
FAULT_ID = "dubakwiSupportTc08"
WEBHOOK_NAMESPACE = uuid.UUID("85023d09-4f5d-5739-bfc5-d5226093f837")
OUTPUTS = {
    "grounded": '{"grounded":false,"policy_ok":true,"issues":["시험 고장"]}',
    "unparsable": "시험 고장: JSON 아님",
    "unknown_chunk": '{"grounded":true,"policy_ok":true,"issues":[]}',
}
MODES = sorted(OUTPUTS)
WRITER = "B19 답변 생성"
WRITER_MODEL = "L02 답변 모델"
UNKNOWN_CHUNK_ANSWER = (
    '{"answer":"TC08 시험 답변입니다.","cited_source_ids":["tc08-unknown-chunk"]}'
)


def fixed_text(node: dict, text: str) -> None:
    code = f"return {{ json: {{ text: {json.dumps(text, ensure_ascii=False)} }} }};\n"
    node.update(
        type="n8n-nodes-base.code",
        typeVersion=2,
        parameters={"mode": "runOnceForEachItem", "jsCode": code},
    )
    node.pop("onError", None)


def build(workflow: dict, mode: str) -> dict:
    copy = json.loads(json.dumps(workflow))
    node = next(item for item in copy["nodes"] if item["name"] == VERIFIER)
    fixed_text(node, OUTPUTS[mode])
    removed = {MODEL}
    if mode == "unknown_chunk":
        writer = next(item for item in copy["nodes"] if item["name"] == WRITER)
        fixed_text(writer, UNKNOWN_CHUNK_ANSWER)
        removed.add(WRITER_MODEL)
    copy["nodes"] = [item for item in copy["nodes"] if item["name"] not in removed]
    for name in removed:
        del copy["connections"][name]
    webhook = next(item for item in copy["nodes"] if item["type"].endswith(".webhook"))
    webhook["parameters"]["path"] = FAULT_PATH
    webhook["webhookId"] = str(uuid.uuid5(WEBHOOK_NAMESPACE, FAULT_PATH))
    copy["id"] = FAULT_ID
    copy["active"] = False
    copy["name"] = f"{copy['name']} (TC08 {mode})"
    return copy


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--mode", choices=MODES, default="grounded")
    args = parser.parse_args()
    workflow = json.loads(SOURCE.read_text(encoding="utf-8"))
    with args.output.open("x", encoding="utf-8") as file:
        json.dump(build(workflow, args.mode), file, ensure_ascii=False, indent=2)
        file.write("\n")
    digest = hashlib.sha256(args.output.read_bytes()).hexdigest()
    print(f"mode={args.mode} path=/webhook/{FAULT_PATH} sha256={digest}")


if __name__ == "__main__":
    main()
