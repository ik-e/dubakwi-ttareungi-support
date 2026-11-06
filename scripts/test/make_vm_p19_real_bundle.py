"""VM P19 실제 연결 시험용 support 사본과 대조 목록을 만든다.

사용법:
  uv run --locked python scripts/test/make_vm_p19_real_bundle.py --output-dir <새 폴더> \
      --scope <R01이 정한 VM scope> [--state-workflow-id <ID>] [--dlq-workflow-id <ID>] \
      [--handoff-url <URL>] [--errors-ref <errors 커밋>] [--r04-ref <state·DLQ·handoff 커밋>]

--errors-ref를 주면 그 커밋의 errors로 같은 scope의 errors 사본도 만든다. E02의 importedScope 대입값만
치환하고(자리표시자 전체 일괄 치환은 비교식까지 바꿔 저장을 막는다), $env가 막힌 상태로 E02를 실행해
support와 같은 scope로 저장 준비가 되는지 확인한다.

manifest의 dependencies는 실제로 함께 반입할 원본을 적는다. 기본값은 R01이 확정한 기준이며,
--r04-ref와 --errors-ref를 주면 그 커밋으로 바꿔 적고 기본 기준과 다른지(default_differs)도 남긴다.

사용자 조회·state·DLQ·handoff를 실제 대상으로 연결한다. 원본 workflows/dubakwi-support.json은 바꾸지 않는다.
환경 ID와 Credential ID는 비밀이 아니어도 공개 기록에 남기지 않으므로 옵션으로만 받는다.
옵션 없이 만든 파일은 저장소 기본 ID를 쓰며 그대로 VM에 게시할 수 없을 수 있다.
"""

import argparse
import hashlib
import json
import re
import shutil
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
ERRORS_PATH = "workflows/dubakwi-errors.json"
ERRORS_ID = "dubakwiP19RealErrors"
ERRORS_NAME = "dubakwi-errors-p19-real"
SCOPE_PLACEHOLDER = "__DUBAKWI_SCOPE__"
IMPORTED_SCOPE_LINE = f"const importedScope = '{SCOPE_PLACEHOLDER}';"
SCOPE_PATTERN = re.compile(r"^[A-Za-z0-9:_.-]+$")
# 기본 기준: #27·#28이 병합된 main(2026-11-06). 파일은 state·DLQ 86d78e7, handoff a930e24, errors 8c53cf7과 같다.
DEPENDENCIES = {
    "state": ("workflows/dubakwi-state.json", "c6dd178"),
    "dlq": ("workflows/dubakwi-dlq.json", "c6dd178"),
    "handoff": ("workflows/dubakwi-handoff.json", "c6dd178"),
    "errors": ("workflows/dubakwi-errors.json", "c6dd178"),
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


def build_errors(workflow: dict, options: dict) -> dict:
    """errors 사본: E02 importedScope 대입값만 scope로 바꾸고 state·DLQ 대상을 support와 맞춘다."""
    copy = json.loads(json.dumps(workflow))
    e02 = next(node for node in copy["nodes"] if node["name"].startswith("E02"))
    code = e02["parameters"]["jsCode"]
    if code.count(IMPORTED_SCOPE_LINE) != 1:
        raise ValueError(
            "E02에 importedScope 대입 줄이 정확히 한 번 있어야 합니다(이 errors는 반입 치환 미지원)"
        )
    e02["parameters"]["jsCode"] = code.replace(
        IMPORTED_SCOPE_LINE, f"const importedScope = '{options['scope']}';"
    )
    targets = {
        ORIGINAL_STATE_ID: (options["state_id"], "dubakwi-state"),
        ORIGINAL_DLQ_ID: (options["dlq_id"], "dubakwi-dlq"),
    }
    for node in copy["nodes"]:
        reference = node["parameters"].get("workflowId")
        if isinstance(reference, dict):
            reference["value"], reference["cachedResultName"] = targets[reference["value"]]
    copy.update(id=ERRORS_ID, name=ERRORS_NAME, active=False)
    return copy


def check_errors_scope(errors: dict, scope: str) -> bool | None:
    """$env가 막힌 n8n 기본 설정을 흉내 내 E02를 실행한다. node가 없으면 None."""
    node = shutil.which("node")
    if not node:
        return None
    code = next(n for n in errors["nodes"] if n["name"].startswith("E02"))["parameters"]["jsCode"]
    script = (
        "const code = require('fs').readFileSync(0, 'utf8');"
        "const env = new Proxy({}, {get() { throw new Error('access to env vars denied'); }});"
        "const sample = {execution: {id: 'check-1', lastNodeExecuted: 'B27'}, workflow: {id: 'support'}};"
        "const out = new Function('$json', '$env', code)(sample, env)[0].json;"
        "process.stdout.write(JSON.stringify({ready: out.storage_ready, scope: out.scope}));"
    )
    result = subprocess.run(
        [node, "-e", script], input=code, capture_output=True, text=True, check=True
    )
    data = json.loads(result.stdout)
    return data["ready"] is True and data["scope"] == scope


def git(*args: str) -> str:
    return subprocess.run(
        ["git", *args], cwd=ROOT, capture_output=True, text=True, check=True
    ).stdout


def dependency_hashes(refs: dict | None = None) -> dict:
    """함께 반입할 원본의 커밋과 SHA-256. refs가 없으면 R01 확정 기준(DEPENDENCIES)."""
    refs = refs or {}
    result = {}
    for key, (path, default_ref) in DEPENDENCIES.items():
        ref = refs.get(key) or default_ref
        text = git("show", f"{ref}:{path}")
        result[key] = {
            "path": path,
            "ref": git("rev-parse", "--short", ref).strip(),
            "sha256": hashlib.sha256(text.encode("utf-8")).hexdigest(),
            "default_ref": default_ref,
            "default_differs": text != git("show", f"{default_ref}:{path}"),
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
        help="R01이 정한 VM scope. errors 사본의 importedScope와 같은 값",
    )
    parser.add_argument("--errors-ref", help="같은 scope의 errors 사본을 만들 errors 커밋")
    parser.add_argument(
        "--r04-ref", help="함께 반입할 state·DLQ·handoff 원본 커밋(manifest 기록용)"
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

    if not SCOPE_PATTERN.match(args.scope):
        parser.error("--scope는 영문·숫자·:_.- 만 쓸 수 있습니다(errors E02와 같은 규칙)")
    errors = None
    if args.errors_ref:
        errors = build_errors(json.loads(git("show", f"{args.errors_ref}:{ERRORS_PATH}")), options)
        if not options["error_workflow_id"]:
            options["error_workflow_id"] = ERRORS_ID
        if check_errors_scope(errors, args.scope) is False:
            raise ValueError("errors 사본이 support와 같은 scope로 저장 준비되지 않습니다")
    support = build_support(read_json(SUPPORT), options)
    args.output_dir.mkdir(parents=True, exist_ok=False)
    text = json.dumps(support, ensure_ascii=False, indent=2) + "\n"
    (args.output_dir / f"{SUPPORT_NAME}.json").write_text(text, encoding="utf-8")
    errors_info = None
    if errors is not None:
        errors_text = json.dumps(errors, ensure_ascii=False, indent=2) + "\n"
        (args.output_dir / f"{ERRORS_NAME}.json").write_text(errors_text, encoding="utf-8")
        errors_info = {
            "ref": args.errors_ref,
            "sha256": hashlib.sha256(errors_text.encode("utf-8")).hexdigest(),
            "scope_matches_support": check_errors_scope(errors, args.scope),
            "support_error_workflow": options["error_workflow_id"],
        }
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
        "errors_copy": errors_info,
        "dependencies": dependency_hashes(
            {
                "state": args.r04_ref,
                "dlq": args.r04_ref,
                "handoff": args.r04_ref,
                "errors": args.errors_ref,
            }
        ),
    }
    with (args.output_dir / "manifest.json").open("x", encoding="utf-8") as file:
        json.dump(manifest, file, ensure_ascii=False, indent=2)
        file.write("\n")
    print(json.dumps(manifest, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
