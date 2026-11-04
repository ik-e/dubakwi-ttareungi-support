"""R05 사례 문장을 게시된 support에 반복 호출해 경로를 대조한다.

사용법:
  SUPPORT_TEAM_KEY=<시험 키> uv run --locked python scripts/test/support_route_compare.py \
      --url <Webhook URL> --git-ref <R05 브랜치> --output runs/public/<실행묶음ID>/summary.json

mock 하위 기능과 과정 data-api 직원으로 분류 경로만 본다. sources·티켓·저장과
공통 WF 공식 판정을 대신하지 않는다. 키는 결과에 남기지 않는다.
"""

import argparse
import json
import os
import subprocess
import time
import urllib.error
import urllib.request
from pathlib import Path

SKIPPED = {
    "WF-03": "실제 검색 필요",
    "WF-04": "고장 주입 필요",
    "WF-09": "실제 저장 필요",
    "WF-10": "LLM 고장 필요",
    "WF-11": "지연 주입 필요",
    "TC03": "실제 저장 필요",
}
USERS = {"citizen-a": "박서연", "citizen-b": "한지훈"}
REPEAT = 3


def load_cases(ref: str) -> list[dict]:
    cases = []
    for name in ("cases/common.json", "cases/team.json"):
        text = subprocess.run(
            ["git", "show", f"{ref}:{name}"], capture_output=True, text=True, check=True
        ).stdout
        cases.extend(json.loads(text)["cases"])
    return [
        case
        for case in cases
        if case.get("body") and not any(case["name"].startswith(key) for key in SKIPPED)
    ]


def call(url: str, key: str, body: dict) -> tuple[int, dict, float]:
    data = json.dumps(body, ensure_ascii=False).encode("utf-8")
    headers = {"Content-Type": "application/json", "X-Team-Key": key}
    request = urllib.request.Request(url, data=data, headers=headers, method="POST")
    started = time.monotonic()
    try:
        with urllib.request.urlopen(request, timeout=40) as response:
            status, raw = response.status, response.read()
    except urllib.error.HTTPError as error:
        status, raw = error.code, error.read()
    try:
        payload = json.loads(raw)
    except ValueError:
        payload = {}
    return status, payload, round(time.monotonic() - started, 1)


def run_case(url: str, key: str, case: dict) -> dict:
    expect = case["expect"]
    equals = expect.get("equals") or {}
    row = {
        "name": case["name"],
        "expected_status": expect.get("status", 200),
        "expected_route": equals.get("route"),
        "expected_priority": equals.get("ticket.priority"),
        "runs": [],
    }
    for run in range(1, REPEAT + 1):
        body = dict(case["body"])
        body["request_id"] = f"r{run}-{body['request_id']}"
        body["user"] = USERS.get(body.get("user"), body.get("user"))
        status, payload, seconds = call(url, key, body)
        row["runs"].append(
            {
                "status": status,
                "route": payload.get("route"),
                "reason": payload.get("reason"),
                "priority": (payload.get("ticket") or {}).get("priority"),
                "has_sources": bool(payload.get("sources")),
                "seconds": seconds,
            }
        )
    row["route_match"] = sum(
        item["status"] == row["expected_status"]
        and (row["expected_route"] is None or item["route"] == row["expected_route"])
        for item in row["runs"]
    )
    return row


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--url", required=True)
    parser.add_argument("--git-ref", required=True)
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--label", default="route-compare")
    parser.add_argument("--settle-seconds", type=int, default=0)
    args = parser.parse_args()
    key = os.environ["SUPPORT_TEAM_KEY"]
    time.sleep(args.settle_seconds)
    results = []
    for case in load_cases(args.git_ref):
        row = run_case(args.url, key, case)
        routes = [item["route"] or item["status"] for item in row["runs"]]
        seconds = [item["seconds"] for item in row["runs"]]
        print(f"{row['route_match']}/{REPEAT} {case['name'][:32]} {routes} {seconds}")
        results.append(row)
    commit = subprocess.run(
        ["git", "rev-parse", args.git_ref], capture_output=True, text=True, check=True
    ).stdout.strip()
    summary = {
        "label": args.label,
        "scope": "분류 경로 대조. search·state·handoff·dlq는 mock이며 공식 판정이 아니다.",
        "environment": "local n8n 2.42.6, course data-api, gpt-4.1-mini",
        "cases_commit": commit,
        "user_substitution": USERS,
        "skipped": SKIPPED,
        "not_executed": ["실제 지식 검색", "Jira", "VM", "flow.py", "run_cases.py"],
        "results": results,
    }
    args.output.parent.mkdir(parents=True, exist_ok=True)
    with args.output.open("x", encoding="utf-8") as file:
        json.dump(summary, file, ensure_ascii=False, indent=2)
        file.write("\n")


if __name__ == "__main__":
    main()
