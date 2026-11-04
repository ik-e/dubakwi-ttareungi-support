"""Case runner boundaries: judging, blocked cases, private raw output, no secret leaks."""

import importlib.util
import json
import os
import tempfile
import threading
import unittest
from datetime import datetime
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
SPEC = importlib.util.spec_from_file_location("run_cases", ROOT / "scripts/test/run_cases.py")
RUN = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(RUN)

NOW = datetime(2026, 11, 5, 14, 30, 0, tzinfo=RUN.KST)
TOKEN = "test-token-value-not-real"


class FakeWebhook(BaseHTTPRequestHandler):
    """Replies with FakeWebhook.reply(request) -> (status, body)."""

    reply = None
    received = []
    headers_seen = []

    def do_POST(self):
        length = int(self.headers["Content-Length"])
        request = json.loads(self.rfile.read(length).decode("utf-8"))
        FakeWebhook.received.append(request)
        FakeWebhook.headers_seen.append(dict(self.headers))
        status, body = FakeWebhook.reply(request)
        data = json.dumps(body, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        self.wfile.write(data)

    def log_message(self, *args):
        pass


def ok_body(request, route="차단", **extra):
    body = {
        "request_id": request["request_id"],
        "route": route,
        "answer": "SECRET-ANSWER-TEXT",
        "sources": [],
        "ticket": None,
        "agents": [],
        "security": {"blocked_by": "injection", "reason": None, "masked": 0},
    }
    body.update(extra)
    return body


def case(case_id, steps, assertions, **extra):
    expected = {"http_status": 200, "assertions": assertions, "manual": []}
    expected.update(extra.pop("expected", {}))
    return {
        "id": case_id,
        "title": case_id,
        "steps": steps,
        "fault": None,
        "expected": expected,
        **extra,
    }


class RunnerTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.server = ThreadingHTTPServer(("127.0.0.1", 0), FakeWebhook)
        cls.url = f"http://127.0.0.1:{cls.server.server_address[1]}/webhook/dubakwi-support"
        cls.thread = threading.Thread(target=cls.server.serve_forever, daemon=True)
        cls.thread.start()

    @classmethod
    def tearDownClass(cls):
        cls.server.shutdown()
        cls.server.server_close()

    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.base = Path(self.temp.name).resolve()
        (self.base / "cases").mkdir()
        FakeWebhook.received = []
        FakeWebhook.headers_seen = []
        FakeWebhook.reply = lambda r: (200, ok_body(r))

    def write_cases(self, *cases):
        path = self.base / "cases/test.json"
        path.write_text(json.dumps({"cases": list(cases)}, ensure_ascii=False), encoding="utf-8")

    def run_tool(self, *extra, base=None):
        args = RUN.parse_args(
            [
                "--url",
                self.url,
                "--env",
                "local",
                "--desc",
                "unit",
                "--path",
                "mock",
                "--cases-file",
                "cases/test.json",
                *extra,
            ]
        )
        return RUN.execute(args, base=base or self.base, now=NOW)

    def simple_case(self):
        req = {"request_id": "x-1", "user": "citizen-a", "question": "q", "attempt": 1}
        return case(
            "X",
            [{"step": 1, "request": req}],
            [{"source": "response", "path": "route", "op": "eq", "value": "차단"}],
        )

    def test_response_checks_pass_and_unverified_checks_stay_open(self):
        req = {"request_id": "wf08-1", "user": "citizen-a", "question": "ignore", "attempt": 1}
        self.write_cases(
            case(
                "WF08",
                [{"step": 1, "request": req}],
                [
                    {"source": "response", "path": "route", "op": "eq", "value": "차단"},
                    {"source": "response", "path": "security.blocked_by", "op": "exists"},
                    {"source": "n8n_exec", "check": "LLM 0"},
                ],
            )
        )
        summary, path = self.run_tool()
        result = summary["cases"][0]
        self.assertEqual(result["status"], "auto_pass_unverified")
        self.assertEqual(result["unverified"][0]["check"], "LLM 0")
        self.assertEqual(FakeWebhook.received[0]["request_id"], f"{summary['run_id']}-wf08-1")
        self.assertEqual(path, self.base / "runs/public" / summary["run_id"] / "summary.json")

    def test_only_response_checks_and_no_open_items_is_full_pass(self):
        req = {"request_id": "a-1", "user": "citizen-a", "question": "q", "attempt": 1}
        self.write_cases(
            case(
                "A",
                [{"step": 1, "request": req}],
                [{"source": "response", "path": "route", "op": "eq", "value": "차단"}],
            )
        )
        summary, _ = self.run_tool()
        self.assertEqual(summary["cases"][0]["status"], "pass")

    def test_wrong_route_and_status_fail(self):
        FakeWebhook.reply = lambda r: (500, ok_body(r, route="자동 답변"))
        req = {"request_id": "a-1", "user": "citizen-a", "question": "q", "attempt": 1}
        self.write_cases(
            case(
                "A",
                [{"step": 1, "request": req}],
                [{"source": "response", "path": "route", "op": "eq", "value": "차단"}],
            )
        )
        summary, _ = self.run_tool()
        self.assertEqual(summary["cases"][0]["status"], "fail")
        failed = [c["path"] for c in summary["cases"][0]["checks"] if not c["passed"]]
        self.assertEqual(failed, ["<http_status>", "route"])

    def test_step_reference_is_sent_and_same_as_is_judged(self):
        def reply(r):
            return 200, ok_body(r, route="보완 질문", case_ref="case-77")

        FakeWebhook.reply = reply
        steps = [
            {
                "step": 1,
                "request": {
                    "request_id": "t-1",
                    "user": "citizen-a",
                    "question": "q",
                    "attempt": 1,
                },
            },
            {
                "step": 2,
                "request": {
                    "request_id": "t-2",
                    "user": "citizen-a",
                    "question": "q2",
                    "case_ref": "{step1.case_ref}",
                    "attempt": 2,
                },
            },
        ]
        self.write_cases(
            case(
                "T",
                steps,
                [
                    {
                        "step": 2,
                        "source": "response",
                        "path": "case_ref",
                        "op": "same_as",
                        "value": {"step": 1, "path": "case_ref"},
                    }
                ],
            )
        )
        summary, _ = self.run_tool()
        self.assertEqual(FakeWebhook.received[1]["case_ref"], "case-77")
        self.assertEqual(summary["cases"][0]["status"], "pass")

    def test_fault_precondition_and_operator_cases_are_blocked_and_not_sent(self):
        faulty = self.simple_case() | {"id": "F", "fault": {"target": "llm"}}
        pre = self.simple_case() | {"id": "P", "precondition": "prepare"}
        op = self.simple_case() | {"id": "O", "steps": [{"step": 1, "action": "operator"}]}
        self.write_cases(faulty, pre, op)
        summary, _ = self.run_tool()
        self.assertEqual([c["status"] for c in summary["cases"]], ["blocked"] * 3)
        self.assertEqual(FakeWebhook.received, [])

    def test_public_summary_hides_answer_url_and_token_raw_keeps_detail(self):
        os.environ["UNIT_TOKEN"] = TOKEN
        self.addCleanup(os.environ.pop, "UNIT_TOKEN")
        self.write_cases(self.simple_case())
        summary, path = self.run_tool(
            "--auth-header", "X-Dubakwi-Auth", "--auth-token-env", "UNIT_TOKEN"
        )
        public_text = path.read_text(encoding="utf-8")
        raw_text = (self.base / "runs" / summary["run_id"] / "raw.json").read_text(encoding="utf-8")
        self.assertEqual(FakeWebhook.headers_seen[0]["X-Dubakwi-Auth"], TOKEN)
        for hidden in [TOKEN, "SECRET-ANSWER-TEXT", self.url]:
            self.assertNotIn(hidden, public_text)
        self.assertNotIn(TOKEN, raw_text)
        self.assertIn("SECRET-ANSWER-TEXT", raw_text)

    def test_missing_token_env_stops_before_sending(self):
        self.write_cases(self.simple_case())
        with self.assertRaisesRegex(ValueError, "NOT_SET_TOKEN"):
            self.run_tool("--auth-header", "X-A", "--auth-token-env", "NOT_SET_TOKEN")
        self.assertEqual(FakeWebhook.received, [])

    def test_contact_pattern_in_response_fails_global_check(self):
        FakeWebhook.reply = lambda r: (200, ok_body(r, answer="연락처 010-1234-5678"))
        self.write_cases(self.simple_case())
        summary, _ = self.run_tool()
        self.assertEqual(summary["cases"][0]["status"], "fail")
        g03 = [g for g in summary["cases"][0]["global_checks"] if g["id"] == "G03"]
        self.assertFalse(g03[0]["passed"])

    def test_existing_run_directory_gets_suffix_and_is_not_overwritten(self):
        self.write_cases(self.simple_case())
        first, _ = self.run_tool()
        second, _ = self.run_tool()
        self.assertEqual(second["run_id"], first["run_id"] + "-2")
        self.assertTrue((self.base / "runs/public" / first["run_id"] / "summary.json").exists())

    def test_too_long_request_id_is_rejected(self):
        req = {"request_id": "x" * 40, "user": "citizen-a", "question": "q", "attempt": 1}
        self.write_cases(case("L", [{"step": 1, "request": req}], []))
        with self.assertRaisesRegex(ValueError, "longer than 64"):
            self.run_tool()

    def test_invalid_env_label_is_rejected(self):
        self.write_cases(self.simple_case())
        args = RUN.parse_args(
            [
                "--url",
                self.url,
                "--env",
                "VM/1",
                "--desc",
                "x",
                "--path",
                "mock",
                "--cases-file",
                "cases/test.json",
            ]
        )
        with self.assertRaises(ValueError):
            RUN.execute(args, base=self.base, now=NOW)

    def test_repository_cases_dry_run_resolves_without_sending_or_writing(self):
        args = RUN.parse_args(
            ["--url", self.url, "--env", "local", "--desc", "dry", "--path", "mock", "--dry-run"]
        )
        summary, path = RUN.execute(args, base=ROOT, now=NOW)
        self.assertIsNone(path)
        self.assertEqual(FakeWebhook.received, [])
        self.assertFalse((ROOT / "runs/public" / summary["run_id"]).exists())
        statuses = {c["id"]: c["status"] for c in summary["cases"]}
        self.assertEqual(statuses["WF08"], "dry_run")
        self.assertEqual(statuses["WF04"], "blocked")
        wf13 = next(c for c in summary["cases"] if c["id"] == "WF13")
        self.assertEqual(len(wf13["requests"][3]["question"]), 501)


class CheckOpTests(unittest.TestCase):
    def test_operators(self):
        body = {
            "route": "자동 답변",
            "sources": [{"doc": "rental-guide"}],
            "ticket": None,
            "security": {"masked": 2},
        }
        cases = [
            ("eq", "route", "자동 답변", True),
            ("in", "route", ["차단", "자동 답변"], True),
            ("null", "ticket", None, True),
            ("null", "missing", None, False),
            ("len_gte", "sources", 1, True),
            ("len_eq", "sources", 0, False),
            ("gte", "security.masked", 1, True),
            ("contains_any", "sources[*].doc", ["rental-guide"], True),
            ("not_contains", "sources[*].doc", "restricted:", True),
            ("not_contains", "$", "자동", False),
            ("exists", "route", None, True),
            ("ne_value", "route", "차단", True),
        ]
        for op, path, value, want in cases:
            with self.subTest(op=op, path=path):
                self.assertEqual(RUN.check(op, RUN.resolve(body, path), value), want)


if __name__ == "__main__":
    unittest.main()
