"""로컬 예행 전용 가짜 Jira. 실제 Jira를 호출하지 않고 handoff·state가 쓰는 API만 흉내 낸다.

사용법: python scripts/test/fake_jira.py [포트]
POST /__fault {"close": 500} 같은 요청으로 다음 호출들의 실패를 켠다. 빈 객체는 해제다.
GET /__issues 는 저장된 이슈를 돌려준다. 결과는 실제 Jira 통과 증거가 아니다.
"""

import json
import sys
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import parse_qs, unquote, urlparse

ISSUES: dict[str, dict] = {}
FAULTS: dict[str, int] = {}
ISSUE_PATH = "/rest/api/2/issue/"


def category(issue: dict) -> str:
    return "done" if issue["closed"] else "new"


def public_issue(issue: dict) -> dict:
    comments = [{"body": body} for body in issue["comments"]]
    return {
        "id": issue["id"],
        "key": issue["key"],
        "fields": {
            "labels": issue["labels"],
            "description": issue["description"],
            "comment": {"comments": comments},
            "status": {"statusCategory": {"key": category(issue)}},
        },
    }


class Handler(BaseHTTPRequestHandler):
    def log_message(self, format: str, *args: object) -> None:
        return

    def send(self, status: int, payload: object = None) -> None:
        body = b"" if payload is None else json.dumps(payload, ensure_ascii=False).encode()
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def body(self) -> dict:
        size = int(self.headers.get("Content-Length") or 0)
        return json.loads(self.rfile.read(size) or b"{}")

    def fault(self, name: str) -> bool:
        if name in FAULTS:
            self.send(FAULTS[name], {"errorMessages": [f"fake {name}"]})
            return True
        return False

    def issue_from_path(self, path: str) -> dict | None:
        key = unquote(path.removeprefix(ISSUE_PATH).split("/")[0])
        return ISSUES.get(key)

    def do_GET(self) -> None:  # noqa: N802
        parsed = urlparse(self.path)
        path = parsed.path
        if path == "/__issues":
            self.send(200, list(ISSUES.values()))
        elif path == "/rest/api/2/search/jql":
            if not self.fault("search"):
                jql = parse_qs(parsed.query).get("jql", [""])[0]
                label = jql.split('labels = "')[-1].rstrip('"')
                found = [public_issue(i) for i in ISSUES.values() if label in i["labels"]]
                self.send(200, {"issues": found})
        elif path == "/rest/api/2/user/assignable/search":
            account = {"accountId": "fake-agent", "active": True, "accountType": "atlassian"}
            self.send(200, [account])
        elif path.endswith("/transitions"):
            resolution = {"required": True, "allowedValues": [{"id": "1", "name": "Done"}]}
            transition = {
                "id": "31",
                "name": "Resolved",
                "to": {"name": "Resolved"},
                "fields": {"resolution": resolution},
            }
            self.send(200, {"transitions": [transition]})
        elif path.startswith(ISSUE_PATH):
            if not self.fault("read"):
                issue = self.issue_from_path(path)
                self.send(200, public_issue(issue)) if issue else self.send(404, {})
        else:
            self.send(404, {})

    def do_POST(self) -> None:  # noqa: N802
        path = urlparse(self.path).path
        data = self.body()
        if path == "/__fault":
            FAULTS.clear()
            FAULTS.update(data)
            self.send(200, FAULTS)
        elif path == "/rest/api/2/issue":
            if not self.fault("create"):
                number = len(ISSUES) + 1
                key = f"JBYS-{number}"
                fields = data["fields"]
                ISSUES[key] = {
                    "id": str(10000 + number),
                    "key": key,
                    "labels": fields.get("labels", []),
                    "description": fields.get("description", ""),
                    "comments": [],
                    "closed": False,
                    "assignee": None,
                }
                self.send(201, {"id": ISSUES[key]["id"], "key": key})
        elif path.endswith("/transitions"):
            if not self.fault("close"):
                issue = self.issue_from_path(path)
                if not issue:
                    self.send(404, {})
                    return
                issue["closed"] = True
                for item in data.get("update", {}).get("comment", []):
                    issue["comments"].append(item.get("add", {}).get("body", ""))
                self.send(204)
        elif path.endswith("/comment"):
            issue = self.issue_from_path(path)
            if not issue:
                self.send(404, {})
                return
            issue["comments"].append(data.get("body", ""))
            self.send(201, {"id": "1"})
        else:
            self.send(404, {})

    def do_PUT(self) -> None:  # noqa: N802
        path = urlparse(self.path).path
        data = self.body()
        if self.fault("assign"):
            return
        issue = self.issue_from_path(path)
        if not issue:
            self.send(404, {})
            return
        issue["assignee"] = data.get("fields", {}).get("assignee")
        for item in data.get("update", {}).get("comment", []):
            issue["comments"].append(item.get("add", {}).get("body", ""))
        self.send(204)


if __name__ == "__main__":
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 9000
    ThreadingHTTPServer(("0.0.0.0", port), Handler).serve_forever()
