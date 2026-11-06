"""Local fake of POST /webhook/dubakwi-support for Discord adapter tests.

Not a deployment dependency. It touches no n8n, Jira, or database.

Run:  uv run --locked python scripts/test/fake_support_server.py
Then point the bot at http://127.0.0.1:8765/webhook/dubakwi-support.

Question prefixes select a canned reply:
  (none)          200 with a fixed answer, case_ref=CASE-TEST, ticket_id=TEST-1
  !409:<code>     409 with {"error": "...", "codes": ["<code>"]}
  !500            500 with a non-JSON body
  !slow           waits 15 seconds, then answers (timeout check)
Same request_id sent twice is reported in the answer as a repeat.
Only request_id and status are printed; question text and the key are never logged.
"""

from __future__ import annotations

import json
import os
import time
from http.server import BaseHTTPRequestHandler, HTTPServer

HOST = "127.0.0.1"
PORT = int(os.getenv("FAKE_SUPPORT_PORT", "8765"))
EXPECTED_KEY = os.getenv("FAKE_SUPPORT_TEAM_KEY", "")
SEEN: set[str] = set()


class Handler(BaseHTTPRequestHandler):
    def _send(self, status: int, body: bytes, content_type: str = "application/json") -> None:
        self.send_response(status)
        self.send_header("Content-Type", content_type)
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_POST(self) -> None:  # noqa: N802
        if self.path != "/webhook/dubakwi-support":
            self._send(404, b"{}")
            return
        if EXPECTED_KEY and self.headers.get("X-Team-Key") != EXPECTED_KEY:
            print("403 bad team key")
            self._send(403, b'{"error":"forbidden"}')
            return
        length = int(self.headers.get("Content-Length", "0"))
        try:
            body = json.loads(self.rfile.read(length).decode("utf-8"))
        except ValueError:
            self._send(400, b'{"error":"bad json"}')
            return
        request_id = str(body.get("request_id", ""))
        question = str(body.get("question", ""))
        repeat = request_id in SEEN
        SEEN.add(request_id)
        print(f"request_id={request_id} channel={body.get('channel')} repeat={repeat}")

        if question.startswith("!409:"):
            code = question.split(":", 1)[1].strip()
            payload = {"error": "fake conflict", "codes": [code]}
            self._send(409, json.dumps(payload).encode("utf-8"))
        elif question.startswith("!500"):
            self._send(500, b"<html>fake failure</html>", "text/html")
        else:
            if question.startswith("!slow"):
                time.sleep(15)
            answer = "가짜 본체의 시험 답변입니다." + (" (같은 요청 재전달)" if repeat else "")
            payload = {
                "answer": answer,
                "case_ref": "CASE-TEST",
                "ticket": {"ticket_id": "TEST-1", "priority": "normal", "duplicate": False},
            }
            self._send(200, json.dumps(payload, ensure_ascii=False).encode("utf-8"))

    def log_message(self, format: str, *args: object) -> None:  # noqa: A002
        return


if __name__ == "__main__":
    print(f"fake support on http://{HOST}:{PORT}/webhook/dubakwi-support (Ctrl+C to stop)")
    HTTPServer((HOST, PORT), Handler).serve_forever()
