"""n8n 가져오기용 워크플로우 사본을 만든다. 저장소 원본은 바꾸지 않는다.

저장소의 workflows/*.json에는 환경 값(Jira 주소, 역할별 담당 계정)을 쓰지 않고 자리표시자만 둔다.
가져오기 전에 이 도구로 값을 채운 사본을 Git 제외 경로(runs/ 아래)에 만든다.

    uv run --locked python scripts/dev/render_n8n_workflow.py \
        --source workflows/dubakwi-handoff.json \
        --jira-base https://<jira-host> \
        --assignee-map-file <git-밖-경로>/assignee-map.json \
        --output runs/private-render/dubakwi-handoff.json

assignee-map.json 예: {"support": "<계정 ID>", "security": "<계정 ID>"}
대상 생성 유형을 바꿀 때만 --jira-issue-type-id <조회한 숫자 ID>를 지정한다.
생략하면 원본 유형을 유지하며 다른 사이트의 유형 ID를 추정하지 않는다.
"""

from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path

JIRA_PLACEHOLDER = "__JIRA_BASE_URL__"
MAP_PLACEHOLDER = "__ASSIGNEE_MAP_JSON__"
SCOPE_PLACEHOLDER = "__DUBAKWI_SCOPE__"
AUTHORS_PLACEHOLDER = "__JIRA_CONTEXT_AUTHORS_JSON__"
# errors 워크플로우의 대입문만 치환한다. 같은 문자열이 비교식에도 있어 전체 치환하면 저장이 항상 막힌다.
SCOPE_ASSIGNMENT = re.compile(r"(const importedScope = ')" + SCOPE_PLACEHOLDER + r"(';)")
SAFE_TEXT = re.compile(r"^[A-Za-z0-9:_.\-]+$")
ROOT = Path(__file__).resolve().parents[2]


class RenderError(ValueError):
    """치환 값이 안전하지 않거나 입력이 잘못됐을 때."""


def validate_jira_base(value: str) -> str:
    base = value.strip().rstrip("/")
    if not re.fullmatch(r"https://[A-Za-z0-9.\-]+(:[0-9]+)?", base):
        raise RenderError("--jira-base는 https://호스트 형식이어야 한다(경로·따옴표 없음)")
    return base


def validate_assignee_map(raw: str) -> str:
    try:
        parsed = json.loads(raw)
    except json.JSONDecodeError as error:
        raise RenderError(f"담당 매핑이 JSON이 아니다: {error}") from error
    if not isinstance(parsed, dict):
        raise RenderError("담당 매핑은 {역할: 계정 ID} 객체여야 한다")
    for role, account in parsed.items():
        if not isinstance(role, str) or not SAFE_TEXT.match(role):
            raise RenderError("역할 이름에 허용되지 않는 문자가 있다")
        if not isinstance(account, str) or not SAFE_TEXT.match(account):
            raise RenderError("계정 ID에 허용되지 않는 문자가 있다(따옴표·공백·줄바꿈 금지)")
    return json.dumps(parsed, ensure_ascii=True, separators=(",", ":"))


def validate_scope(value: str) -> str:
    scope = value.strip()
    if not SAFE_TEXT.match(scope):
        raise RenderError("--scope에 허용되지 않는 문자가 있다(영문·숫자·: _ . - 만)")
    return scope


def render(
    text: str,
    jira_base: str | None,
    assignee_map: str | None,
    scope: str | None = None,
    context_authors: str | None = None,
    jira_issue_type_id: str | None = None,
) -> str:
    if jira_base is not None:
        text = text.replace(JIRA_PLACEHOLDER, validate_jira_base(jira_base))
    if assignee_map is not None:
        # JSON 문자열 안의 JS 소스에 들어가므로 JSON 이스케이프를 한 번 더 적용한다.
        escaped = json.dumps(validate_assignee_map(assignee_map))[1:-1]
        text = text.replace(MAP_PLACEHOLDER, escaped)
    if scope is not None:
        text, count = SCOPE_ASSIGNMENT.subn(
            lambda m: m.group(1) + validate_scope(scope) + m.group(2), text
        )
        if count != 1:
            raise RenderError(
                "importedScope 대입문을 정확히 1곳 찾지 못했다(errors 워크플로우가 아니거나 형식이 바뀜)"
            )
    if context_authors is not None:
        try:
            authors = json.loads(context_authors)
        except json.JSONDecodeError as error:
            raise RenderError("문맥 작성자 목록은 JSON 배열이어야 한다") from error
        if (
            not isinstance(authors, list)
            or not authors
            or not all(
                isinstance(author, str) and SAFE_TEXT.fullmatch(author) for author in authors
            )
        ):
            raise RenderError("문맥 작성자 목록에 비어 있거나 안전하지 않은 ID가 있다")
        escaped = json.dumps(json.dumps(authors, separators=(",", ":")))[1:-1]
        text = text.replace(AUTHORS_PLACEHOLDER, escaped)
    if jira_issue_type_id is not None:
        if not re.fullmatch(r"[1-9][0-9]{0,19}", jira_issue_type_id):
            raise RenderError("Jira 작업 유형 ID는 양의 정수 문자열이어야 한다")
        workflow = json.loads(text)
        nodes = [
            node
            for node in workflow.get("nodes", [])
            if node.get("name", "").startswith("H24 ") and node.get("type") == "n8n-nodes-base.code"
        ]
        if len(nodes) != 1:
            raise RenderError("H24 생성 계획 Code 노드를 정확히 1곳 찾지 못했다")
        code, count = re.subn(
            r"(issuetype:\{id:')[1-9][0-9]*('\})",
            lambda match: match.group(1) + jira_issue_type_id + match.group(2),
            nodes[0]["parameters"].get("jsCode", ""),
        )
        if count != 1:
            raise RenderError("H24의 Jira 작업 유형 ID를 정확히 1곳 찾지 못했다")
        nodes[0]["parameters"]["jsCode"] = code
        text = json.dumps(workflow, ensure_ascii=False, indent=2) + "\n"
    return text


def ensure_untracked_output(output: Path) -> None:
    resolved = output.resolve()
    runs = (ROOT / "runs").resolve()
    public = (ROOT / "runs" / "public").resolve()
    inside_runs = runs in resolved.parents
    inside_public = public in resolved.parents
    if not inside_runs or inside_public:
        raise RenderError("출력은 Git 제외 경로인 runs/ 아래(runs/public 제외)여야 한다")


def configure_alert_api(text: str, origin: str, credential_id: str) -> str:
    """Keep the Discord secret outside workflow JSON; preserve HTTP effect normalization."""
    if not re.fullmatch(r"http://[A-Za-z0-9_.-]+(?::[0-9]{1,5})?", origin):
        raise RenderError("알림 API는 경로/인증정보 없는 내부 HTTP origin이어야 한다")
    if not SAFE_TEXT.fullmatch(credential_id):
        raise RenderError("내부 Credential ID 형식 오류")
    workflow = json.loads(text)
    targets = [
        n
        for n in workflow.get("nodes", [])
        if n.get("name", "").split(" ")[0] in {"H11", "X04", "E09"}
    ]
    if len(targets) != 1 or targets[0]["type"] != "n8n-nodes-base.httpRequest":
        raise RenderError("지원하는 알림 HTTP 노드를 정확히 1곳 찾지 못했다")
    target = targets[0]
    if target["parameters"].get("url") not in {
        "http://data-api:8800/alerts",
        "={{ $json.req.url }}",
    }:
        raise RenderError("알림 URL 원본이 예상과 다르다")
    target["parameters"].update(
        url=origin + "/alerts",
        authentication="genericCredentialType",
        genericAuthType="httpHeaderAuth",
    )
    target["credentials"] = {
        "httpHeaderAuth": {"id": credential_id, "name": "dubakwi-internal-key"}
    }
    if target["name"].startswith("H11 "):
        plans = [n for n in workflow["nodes"] if n["name"].startswith("H20 ")]
        if (
            len(plans) != 1
            or plans[0]["parameters"]["jsCode"].count("http://data-api:8800/alerts") != 1
        ):
            raise RenderError("H20 알림 계획 원본이 예상과 다르다")
        plans[0]["parameters"]["jsCode"] = plans[0]["parameters"]["jsCode"].replace(
            "http://data-api:8800/alerts", origin + "/alerts"
        )
    return json.dumps(workflow, ensure_ascii=False, indent=2) + "\n"


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(
        description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter
    )
    parser.add_argument("--source", required=True, type=Path)
    parser.add_argument("--output", required=True, type=Path)
    parser.add_argument("--jira-base")
    parser.add_argument(
        "--jira-issue-type-id",
        help="대상 Jira 프로젝트에서 조회한 생성 유형 ID; 생략하면 원본 유지",
    )
    parser.add_argument("--assignee-map-file", type=Path)
    parser.add_argument("--context-authors-file", type=Path)
    parser.add_argument("--alert-api-origin", help="선택 UX 알림 API 내부 origin; Discord URL 아님")
    parser.add_argument("--alert-internal-credential-id")
    parser.add_argument(
        "--scope", help="errors 워크플로우의 importedScope 대입값(support와 같은 값)"
    )
    args = parser.parse_args(argv)

    try:
        ensure_untracked_output(args.output)
        assignee = (
            args.assignee_map_file.read_text(encoding="utf-8") if args.assignee_map_file else None
        )
        rendered = render(
            args.source.read_text(encoding="utf-8"),
            args.jira_base,
            assignee,
            args.scope,
            args.context_authors_file.read_text("utf-8") if args.context_authors_file else None,
            args.jira_issue_type_id,
        )
        if bool(args.alert_api_origin) != bool(args.alert_internal_credential_id):
            raise RenderError("알림 API origin과 내부 Credential ID를 함께 지정해야 한다")
        if args.alert_api_origin:
            rendered = configure_alert_api(
                rendered, args.alert_api_origin, args.alert_internal_credential_id
            )
        json.loads(rendered)  # 결과가 여전히 올바른 JSON인지 확인
    except (RenderError, OSError, json.JSONDecodeError) as error:
        print(f"실패: {error}", file=sys.stderr)
        return 1

    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(rendered, encoding="utf-8")
    left = [
        name
        for name in (JIRA_PLACEHOLDER, MAP_PLACEHOLDER, AUTHORS_PLACEHOLDER)
        if name in rendered
    ]
    if args.scope is None and SCOPE_PLACEHOLDER in rendered:
        left.append(SCOPE_PLACEHOLDER)
    print(f"작성: {args.output} (남은 자리표시자: {', '.join(left) if left else '없음'})")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
