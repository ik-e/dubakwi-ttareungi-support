"""VM P19 연결 시험용 support 사본과 전용 mock을 만든다.

사용법:
  uv run --locked python scripts/test/make_vm_p19_bundle.py --output-dir <새 폴더>

실제 사용자 조회·검색·모델은 그대로 두고 state·handoff·dlq만 전용 mock으로 바꾼다.
원본 workflows/dubakwi-support.json과 scripts/test/mocks 원본은 바꾸지 않는다.
Credential은 이름만 넣는다. 실제 ID는 환경 값이라 파일에 넣지 않고, 필요하면 옵션으로 넘긴다.
"""

import argparse
import hashlib
import json
import subprocess
import uuid
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
SUPPORT = ROOT / "workflows" / "dubakwi-support.json"
MOCKS = ROOT / "scripts" / "test" / "mocks"
NAMESPACE = uuid.UUID("85023d09-4f5d-5739-bfc5-d5226093f837")

SUPPORT_ID = "dubakwiP19Support"
SUPPORT_PATH = "dubakwi-support-p19-mock"
HANDOFF_ID = "dubakwiP19Handoff"
HANDOFF_PATH = "dubakwi-p19-mock-handoff"
STATE_ID = "dubakwiP19State"
DLQ_ID = "dubakwiP19Dlq"
SUPPORT_NAME = "dubakwi-support-p19-mock"
STATE_NAME = "dubakwi-p19-mock-state"
DLQ_NAME = "dubakwi-p19-mock-dlq"
HANDOFF_NAME = "dubakwi-p19-mock-handoff"
ORIGINAL_STATE_ID = "dubakwiState01"
ORIGINAL_DLQ_ID = "dubakwiDlq0001"
ORIGINAL_HANDOFF_URL = "http://127.0.0.1:5678/webhook/dubakwi-handoff"
HANDOFF_URL = f"http://127.0.0.1:5678/webhook/{HANDOFF_PATH}"
SEARCH_URL = "http://127.0.0.1:5678/webhook/dubakwi-search"
USER_API_URL = (
    "=http://dubakwi-user-api:8801/employees/{{ encodeURIComponent($json.request.user) }}"
)
OPENAI_NAME = "dubakwi-openai"
TEAM_KEY_NAME = "dubakwi-team-key"
INTERNAL_KEY_NAME = "dubakwi-internal-key"
FORBIDDEN = (
    ORIGINAL_STATE_ID,
    ORIGINAL_DLQ_ID,
    ORIGINAL_HANDOFF_URL,
    "openAiCourse0001",
    "OpenAI (.env)",
)


def read_json(path: Path) -> dict:
    return json.loads(path.read_text(encoding="utf-8"))


def header_auth(name: str, credential_id: str | None) -> dict:
    return {"httpHeaderAuth": with_id(name, credential_id)}


def with_id(name: str, credential_id: str | None) -> dict:
    return {"id": credential_id, "name": name} if credential_id else {"name": name}


def require_url(nodes: dict, name: str, expected: str) -> None:
    actual = nodes[name]["parameters"]["url"]
    if actual != expected:
        raise ValueError(f"{name} 주소가 예상과 다릅니다: {actual}")


def use_user_api(node: dict, internal_id: str | None) -> None:
    node["parameters"].update(
        url=USER_API_URL,
        authentication="genericCredentialType",
        genericAuthType="httpHeaderAuth",
    )
    node["credentials"] = header_auth(INTERNAL_KEY_NAME, internal_id)


def build_support(workflow: dict, ids: dict, user_api: bool = False) -> dict:
    copy = json.loads(json.dumps(workflow))
    nodes = {node["name"]: node for node in copy["nodes"]}
    require_url(nodes, "B14 RAG 검색", SEARCH_URL)
    if not nodes["B04 사용자 확인"]["parameters"]["url"].startswith("=http://data-api:8800/"):
        raise ValueError("B04가 data-api를 가리키지 않습니다")

    if user_api:
        use_user_api(nodes["B04 사용자 확인"], ids["internal"])

    targets = {ORIGINAL_STATE_ID: (STATE_ID, STATE_NAME), ORIGINAL_DLQ_ID: (DLQ_ID, DLQ_NAME)}
    for node in copy["nodes"]:
        reference = node["parameters"].get("workflowId")
        if isinstance(reference, dict):
            reference["value"], reference["cachedResultName"] = targets[reference["value"]]
        if node["type"].endswith("lmChatOpenAi"):
            node["credentials"] = {"openAiApi": with_id(OPENAI_NAME, ids["openai"])}

    for name in ("B15 본인 기록 조회", "B27 티켓 생성·처리"):
        require_url(nodes, name, ORIGINAL_HANDOFF_URL)
        nodes[name]["parameters"]["url"] = HANDOFF_URL
    for name in ("B14 RAG 검색", "B15 본인 기록 조회", "B27 티켓 생성·처리"):
        nodes[name]["credentials"] = header_auth(INTERNAL_KEY_NAME, ids["internal"])

    webhook = nodes["B01 문의 수신"]
    webhook["parameters"]["path"] = SUPPORT_PATH
    webhook["webhookId"] = str(uuid.uuid5(NAMESPACE, SUPPORT_PATH))
    webhook["credentials"] = header_auth(TEAM_KEY_NAME, ids["team"])
    copy.update(id=SUPPORT_ID, name=SUPPORT_NAME, active=False)
    return copy


def build_trigger_mock(source: str, workflow_id: str, name: str) -> dict:
    copy = read_json(MOCKS / source)
    copy.update(id=workflow_id, name=name, active=False)
    return copy


def build_handoff(internal_id: str | None) -> dict:
    copy = build_trigger_mock("dubakwi-mock-handoff.json", HANDOFF_ID, HANDOFF_NAME)
    webhook = next(node for node in copy["nodes"] if node["type"].endswith(".webhook"))
    webhook["parameters"].update(path=HANDOFF_PATH, authentication="headerAuth")
    webhook["webhookId"] = str(uuid.uuid5(NAMESPACE, HANDOFF_PATH))
    webhook["credentials"] = header_auth(INTERNAL_KEY_NAME, internal_id)
    return copy


def build_all(ids: dict, user_api: bool = False) -> dict[str, dict]:
    return {
        f"{SUPPORT_NAME}.json": build_support(read_json(SUPPORT), ids, user_api),
        f"{STATE_NAME}.json": build_trigger_mock("dubakwi-mock-state.json", STATE_ID, STATE_NAME),
        f"{DLQ_NAME}.json": build_trigger_mock("dubakwi-mock-dlq.json", DLQ_ID, DLQ_NAME),
        f"{HANDOFF_NAME}.json": build_handoff(ids["internal"]),
    }


def base_commit() -> dict:
    def git(*args: str) -> str:
        return subprocess.run(
            ["git", *args], cwd=ROOT, capture_output=True, text=True, check=True
        ).stdout.strip()

    return {"commit": git("rev-parse", "HEAD"), "dirty": bool(git("status", "--porcelain"))}


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output-dir", type=Path, required=True)
    parser.add_argument("--openai-credential-id")
    parser.add_argument("--team-credential-id")
    parser.add_argument("--internal-credential-id")
    parser.add_argument(
        "--user-api",
        action="store_true",
        help="B04를 과정 data-api 대신 팀 사용자 API로 호출한다. R01 배포 뒤 사용한다",
    )
    args = parser.parse_args()
    ids = {
        "openai": args.openai_credential_id,
        "team": args.team_credential_id,
        "internal": args.internal_credential_id,
    }

    files = build_all(ids, args.user_api)
    args.output_dir.mkdir(parents=True, exist_ok=False)
    digests = {}
    for name, workflow in files.items():
        text = json.dumps(workflow, ensure_ascii=False, indent=2) + "\n"
        leftover = [word for word in FORBIDDEN if word in text and word != ids["openai"]]
        if leftover:
            raise ValueError(f"{name}에 원본 대상이 남았습니다: {leftover}")
        (args.output_dir / name).write_text(text, encoding="utf-8")
        digests[name] = hashlib.sha256(text.encode("utf-8")).hexdigest()

    manifest = {
        "base": base_commit(),
        "credential_ids_included": any(ids.values()),
        "user_lookup": "dubakwi-user-api" if args.user_api else "data-api",
        "sha256": digests,
        "publish_order": [
            f"{STATE_NAME}.json",
            f"{DLQ_NAME}.json",
            f"{HANDOFF_NAME}.json",
            f"{SUPPORT_NAME}.json",
        ],
    }
    with (args.output_dir / "manifest.json").open("x", encoding="utf-8") as file:
        json.dump(manifest, file, ensure_ascii=False, indent=2)
        file.write("\n")
    print(json.dumps(manifest, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
