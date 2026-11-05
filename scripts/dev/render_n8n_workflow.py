"""n8n 가져오기용 워크플로우 사본을 만든다. 저장소 원본은 바꾸지 않는다.

저장소의 workflows/*.json에는 환경 값(Jira 주소, 역할별 담당 계정)을 쓰지 않고 자리표시자만 둔다.
가져오기 전에 이 도구로 값을 채운 사본을 Git 제외 경로(runs/ 아래)에 만든다.

    uv run --locked python scripts/dev/render_n8n_workflow.py \
        --source workflows/dubakwi-handoff.json \
        --jira-base https://<jira-host> \
        --assignee-map-file <git-밖-경로>/assignee-map.json \
        --output runs/private-render/dubakwi-handoff.json

assignee-map.json 예: {"support": "<계정 ID>", "security": "<계정 ID>"}
"""

from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path

JIRA_PLACEHOLDER = "__JIRA_BASE_URL__"
MAP_PLACEHOLDER = "__ASSIGNEE_MAP_JSON__"
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


def render(text: str, jira_base: str | None, assignee_map: str | None) -> str:
    if jira_base is not None:
        text = text.replace(JIRA_PLACEHOLDER, validate_jira_base(jira_base))
    if assignee_map is not None:
        # JSON 문자열 안의 JS 소스에 들어가므로 JSON 이스케이프를 한 번 더 적용한다.
        escaped = json.dumps(validate_assignee_map(assignee_map))[1:-1]
        text = text.replace(MAP_PLACEHOLDER, escaped)
    return text


def ensure_untracked_output(output: Path) -> None:
    resolved = output.resolve()
    runs = (ROOT / "runs").resolve()
    public = (ROOT / "runs" / "public").resolve()
    inside_runs = runs in resolved.parents
    inside_public = public in resolved.parents
    if not inside_runs or inside_public:
        raise RenderError("출력은 Git 제외 경로인 runs/ 아래(runs/public 제외)여야 한다")


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(
        description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter
    )
    parser.add_argument("--source", required=True, type=Path)
    parser.add_argument("--output", required=True, type=Path)
    parser.add_argument("--jira-base")
    parser.add_argument("--assignee-map-file", type=Path)
    args = parser.parse_args(argv)

    try:
        ensure_untracked_output(args.output)
        assignee = (
            args.assignee_map_file.read_text(encoding="utf-8") if args.assignee_map_file else None
        )
        rendered = render(args.source.read_text(encoding="utf-8"), args.jira_base, assignee)
        json.loads(rendered)  # 결과가 여전히 올바른 JSON인지 확인
    except (RenderError, OSError, json.JSONDecodeError) as error:
        print(f"실패: {error}", file=sys.stderr)
        return 1

    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(rendered, encoding="utf-8")
    left = [name for name in (JIRA_PLACEHOLDER, MAP_PLACEHOLDER) if name in rendered]
    print(f"작성: {args.output} (남은 자리표시자: {', '.join(left) if left else '없음'})")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
