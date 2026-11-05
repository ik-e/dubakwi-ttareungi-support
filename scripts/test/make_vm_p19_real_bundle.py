"""VM P19 실제 연결 시험용 support 사본과 대조 목록을 만든다.

사용법:
  uv run --locked python scripts/test/make_vm_p19_real_bundle.py --output-dir <새 폴더> \
      --scope <R01이 정한 VM scope> [--state-workflow-id <ID>] [--dlq-workflow-id <ID>] \
      [--handoff-url <URL>]

사용자 조회·state·DLQ·handoff를 실제 대상으로 연결한다. 원본 workflows/dubakwi-support.json은 바꾸지 않는다.
환경 ID와 Credential ID는 비밀이 아니어도 공개 기록에 남기지 않으므로 옵션으로만 받는다.
옵션 없이 만든 파일은 저장소 기본 ID를 쓰며 그대로 VM에 게시할 수 없을 수 있다.
"""

import argparse
import hashlib
import json
import subprocess
import uuid
from pathlib import Path

from make_vm_p19_bundle import (
    INTERNAL_KEY_NAME,
    NAMESPACE,
    OPENAI_NAME,
    ORIGINAL_DLQ_ID,
    ORIGINAL_HANDOFF_URL,
    ORIGINAL_STATE_ID,
    ROOT,
    SEARCH_URL,
    SUPPORT,
    TEAM_KEY_NAME,
    header_auth,
    read_json,
    require_url,
    use_user_api,
    with_id,
)

SUPPORT_ID = "dubakwiP19RealSupport"
SUPPORT_NAME = "dubakwi-support-p19-real"
SUPPORT_PATH = "dubakwi-support-p19-real"
SOURCE_SCOPE = "dubakwi-dev"
SCOPE_NODES = ("B07a BeginRequest 구성", "X06a 실패 상태 명령", "X03a DLQ 요청 구성")
DEPENDENCIES = {
    "state": ("workflows/dubakwi-state.json", "1b83d18"),
    "dlq": ("workflows/dubakwi-dlq.json", "1b83d18"),
    "handoff": ("workflows/dubakwi-handoff.json", "1b83d18"),
    "errors": ("workflows/dubakwi-errors.json", "ff19178"),
}


def build_support(workflow: dict, options: dict) -> dict:
    copy = json.loads(json.dumps(workflow))
    nodes = {node["name"]: node for node in copy["nodes"]}
    require_url(nodes, "B14 RAG 검색", SEARCH_URL)
    use_user_api(nodes["B04 사용자 확인"], options["internal"])

    targets = {
        ORIGINAL_STATE_ID: (options["state_id"], "dubakwi-state"),
        ORIGINAL_DLQ_ID: (options["dlq_id"], "dubakwi-dlq"),
    }
    for node in copy["nodes"]:
        reference = node["parameters"].get("workflowId")
        if isinstance(reference, dict):
            reference["value"], reference["cachedResultName"] = targets[reference["value"]]
        if node["type"].endswith("lmChatOpenAi"):
            node["credentials"] = {"openAiApi": with_id(OPENAI_NAME, options["openai"])}

    for name in ("B15 본인 기록 조회", "B27 티켓 생성·처리"):
        require_url(nodes, name, ORIGINAL_HANDOFF_URL)
        nodes[name]["parameters"]["url"] = options["handoff_url"]
    for name in ("B14 RAG 검색", "B15 본인 기록 조회", "B27 티켓 생성·처리"):
        nodes[name]["credentials"] = header_auth(INTERNAL_KEY_NAME, options["internal"])

    for name in SCOPE_NODES:
        output = nodes[name]["parameters"]["jsonOutput"]
        if SOURCE_SCOPE not in output:
            raise ValueError(f"{name}에 scope가 없습니다")
        nodes[name]["parameters"]["jsonOutput"] = output.replace(SOURCE_SCOPE, options["scope"])
    if options["scope"] != SOURCE_SCOPE and SOURCE_SCOPE in json.dumps(copy, ensure_ascii=False):
        raise ValueError(f"원본 scope {SOURCE_SCOPE}가 남았습니다")

    webhook = nodes["B01 문의 수신"]
    webhook["parameters"]["path"] = SUPPORT_PATH
    webhook["webhookId"] = str(uuid.uuid5(NAMESPACE, SUPPORT_PATH))
    webhook["credentials"] = header_auth(TEAM_KEY_NAME, options["team"])
    if options["error_workflow_id"]:
        copy.setdefault("settings", {})["errorWorkflow"] = options["error_workflow_id"]
    copy.update(id=SUPPORT_ID, name=SUPPORT_NAME, active=False)
    return copy


def git(*args: str) -> str:
    return subprocess.run(
        ["git", *args], cwd=ROOT, capture_output=True, text=True, check=True
    ).stdout


def dependency_hashes() -> dict:
    result = {}
    for key, (path, ref) in DEPENDENCIES.items():
        text = git("show", f"{ref}:{path}") if ref else (ROOT / path).read_text(encoding="utf-8")
        result[key] = {
            "path": path,
            "ref": ref or "기준 커밋",
            "sha256": hashlib.sha256(text.encode("utf-8")).hexdigest(),
        }
    return result


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output-dir", type=Path, required=True)
    parser.add_argument("--state-workflow-id", default=ORIGINAL_STATE_ID)
    parser.add_argument("--dlq-workflow-id", default=ORIGINAL_DLQ_ID)
    parser.add_argument("--handoff-url", default=ORIGINAL_HANDOFF_URL)
    parser.add_argument(
        "--scope",
        required=True,
        help="R01이 정한 VM scope. errors의 DUBAKWI_SCOPE와 같은 값",
    )
    parser.add_argument("--error-workflow-id")
    parser.add_argument("--openai-credential-id")
    parser.add_argument("--team-credential-id")
    parser.add_argument("--internal-credential-id")
    args = parser.parse_args()
    options = {
        "state_id": args.state_workflow_id,
        "dlq_id": args.dlq_workflow_id,
        "handoff_url": args.handoff_url,
        "scope": args.scope,
        "error_workflow_id": args.error_workflow_id,
        "openai": args.openai_credential_id,
        "team": args.team_credential_id,
        "internal": args.internal_credential_id,
    }

    support = build_support(read_json(SUPPORT), options)
    args.output_dir.mkdir(parents=True, exist_ok=False)
    text = json.dumps(support, ensure_ascii=False, indent=2) + "\n"
    (args.output_dir / f"{SUPPORT_NAME}.json").write_text(text, encoding="utf-8")
    manifest = {
        "base": {
            "commit": git("rev-parse", "HEAD").strip(),
            "dirty": bool(git("status", "--porcelain").strip()),
        },
        "support_sha256": hashlib.sha256(text.encode("utf-8")).hexdigest(),
        "environment_values_included": any(
            value
            for key, value in options.items()
            if key in ("error_workflow_id", "openai", "team", "internal")
        )
        or args.state_workflow_id != ORIGINAL_STATE_ID
        or args.dlq_workflow_id != ORIGINAL_DLQ_ID
        or args.handoff_url != ORIGINAL_HANDOFF_URL,
        "scope": args.scope,
        "dependencies": dependency_hashes(),
    }
    with (args.output_dir / "manifest.json").open("x", encoding="utf-8") as file:
        json.dump(manifest, file, ensure_ascii=False, indent=2)
        file.write("\n")
    print(json.dumps(manifest, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
