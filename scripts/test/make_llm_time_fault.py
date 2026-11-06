"""LLM·시간 고장 시험용 support 사본을 만든다.

사용법:
  uv run --locked python scripts/test/make_llm_time_fault.py --source <실제 연결 사본 JSON> \
      --output <새 파일> --mode <모드>

--source는 make_vm_p19_real_bundle.py가 만든 dubakwi-support-p19-real.json(환경 ID 포함)이다.
사본은 ID dubakwiP19Fault, 경로 /webhook/dubakwi-support-p19-fault를 써서 정상 사본과 동시에 게시할 수 있다.
모드는 같은 경로를 쓰므로 한 번에 하나만 게시한다. 원본 workflows/dubakwi-support.json과 정상 사본은 바꾸지 않는다.
하위 기능(state·handoff·DLQ·errors)과 scope는 정상 사본 그대로라 Jira·DB 효과가 실제로 생긴다.
"""

import argparse
import hashlib
import json
import re
import uuid
from pathlib import Path

FAULT_ID = "dubakwiP19Fault"
FAULT_NAME = "dubakwi-support-p19-fault"
FAULT_PATH = "dubakwi-support-p19-fault"
NAMESPACE = uuid.UUID("5b8f7c1e-2d34-4c6a-9e8b-0f1a2b3c4d5e")
BAD_MODEL = "dubakwi-fault-no-such-model"
DEADLINE = re.compile(r"const DEADLINE_MS = (\d+);")

# 모드: 바꾸는 곳, 기대 결과 요약(시험 안내 표와 같아야 한다)
MODES = {
    "llm_down_triage": "L01 모델 이름을 없는 이름으로 → 분류 실패 → llm_down 이관",
    "llm_down_writer": "L02 모델 이름을 없는 이름으로 → 답변 작성 실패 → llm_down 이관",
    "llm_timeout_writer": "L02 제한 시간을 1ms로 → 작성 시간 초과 → llm_down 이관",
    "deadline_at_triage": "전체 시한 9초로 → 분류 뒤 B11 시간 조건 → 검색 없이 deadline_exceeded",
    "deadline_at_answer": "전체 시한 15초로 → 검색 뒤 B17 시간 조건 → 답변 없이 deadline_exceeded",
}


def node(workflow: dict, name: str) -> dict:
    return next(item for item in workflow["nodes"] if item["name"] == name)


def set_model(workflow: dict, name: str) -> None:
    model = node(workflow, name)["parameters"]["model"]
    if not isinstance(model, dict) or "value" not in model:
        raise ValueError(f"{name}의 model 형식이 예상과 다릅니다")
    model["value"] = BAD_MODEL


def set_deadline(workflow: dict, ms: int) -> None:
    b02 = node(workflow, "B02 입력 검사")
    code = b02["parameters"]["jsCode"]
    if len(DEADLINE.findall(code)) != 1:
        raise ValueError("B02의 DEADLINE_MS를 찾지 못했습니다")
    b02["parameters"]["jsCode"] = DEADLINE.sub(f"const DEADLINE_MS = {ms};", code)


def build(source: dict, mode: str) -> dict:
    if mode not in MODES:
        raise ValueError(f"알 수 없는 모드: {mode}")
    copy = json.loads(json.dumps(source))
    if mode == "llm_down_triage":
        set_model(copy, "L01 분류 모델")
    elif mode == "llm_down_writer":
        set_model(copy, "L02 답변 모델")
    elif mode == "llm_timeout_writer":
        node(copy, "L02 답변 모델")["parameters"]["options"]["timeout"] = 1
    elif mode == "deadline_at_triage":
        set_deadline(copy, 9000)
    elif mode == "deadline_at_answer":
        set_deadline(copy, 15000)
    webhook = next(item for item in copy["nodes"] if item["type"].endswith(".webhook"))
    webhook["parameters"]["path"] = FAULT_PATH
    webhook["webhookId"] = str(uuid.uuid5(NAMESPACE, FAULT_PATH))
    copy.update(id=FAULT_ID, name=f"{FAULT_NAME} ({mode})", active=False)
    return copy


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--source", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--mode", choices=sorted(MODES), required=True)
    args = parser.parse_args()
    source = json.loads(args.source.read_text(encoding="utf-8"))
    text = json.dumps(build(source, args.mode), ensure_ascii=False, indent=2) + "\n"
    with args.output.open("x", encoding="utf-8") as file:
        file.write(text)
    digest = hashlib.sha256(text.encode("utf-8")).hexdigest()
    print(f"mode={args.mode} path=/webhook/{FAULT_PATH} sha256={digest}")
    print(MODES[args.mode])


if __name__ == "__main__":
    main()
