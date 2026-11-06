"""Case runner boundaries: flow-format judging, hooks, blocked cases, private raw output."""

import importlib.util
import json
import os
import tempfile
import threading
import time
import unittest
from datetime import datetime
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from unittest import mock

ROOT = Path(__file__).resolve().parents[2]
SPEC = importlib.util.spec_from_file_location("run_cases", ROOT / "scripts/test/run_cases.py")
RUN = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(RUN)

NOW = datetime(2026, 11, 5, 14, 30, 0, tzinfo=RUN.KST)
TOKEN = "test-token-value-not-real"


class FakeServer(BaseHTTPRequestHandler):
    """Webhook and data-api stand-in. Webhook replies come from FakeServer.reply(request)."""

    reply = None
    calls = []
    headers_seen = []
    logs = []
    hook_fail_paths = set()
    log_mode = "b35"  # b35: write a B35-like entry per webhook reply; leak; off; broken

    def do_GET(self):
        if self.path != "/logs" or FakeServer.log_mode == "broken":
            self._send(500, {"error": "down"})
            return
        self._send(200, FakeServer.logs)

    def do_POST(self):
        length = int(self.headers["Content-Length"])
        body = json.loads(self.rfile.read(length).decode("utf-8"))
        FakeServer.calls.append((self.path, body))
        FakeServer.headers_seen.append(dict(self.headers))
        if self.path.startswith("/webhook/"):
            status, out = FakeServer.reply(body)
            if FakeServer.log_mode in ("b35", "leak"):
                entry = {"request_id": body.get("request_id"), "node": "B33"}
                entry |= {"route": out.get("route"), "status": status, "masked": 0}
                if FakeServer.log_mode == "leak":
                    entry["question"] = body.get("question")
                FakeServer.logs.append(entry)
        else:
            status = 503 if self.path in FakeServer.hook_fail_paths else 200
            out = {"ok": status == 200}
        self._send(status, out)

    def _send(self, status, out):
        data = json.dumps(out, ensure_ascii=False).encode("utf-8")
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


def flow_case(name, body, expect, **x):
    case = {"name": name, "body": body, "expect": expect}
    hooks = {k: x.pop(k) for k in ("before", "after") if k in x}
    case.update(hooks)
    case["x_dubakwi"] = {"id": name, **x}
    return case


def req(rid="a1", user="citizen-a", question="q"):
    return {"request_id": rid, "user": user, "question": question, "attempt": 1}


class RunnerTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.server = ThreadingHTTPServer(("127.0.0.1", 0), FakeServer)
        cls.base_url = f"http://127.0.0.1:{cls.server.server_address[1]}"
        threading.Thread(target=cls.server.serve_forever, daemon=True).start()

    @classmethod
    def tearDownClass(cls):
        cls.server.shutdown()
        cls.server.server_close()

    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.base = Path(self.temp.name).resolve()
        (self.base / "cases").mkdir()
        FakeServer.calls, FakeServer.headers_seen = [], []
        FakeServer.logs, FakeServer.log_mode = [], "b35"
        FakeServer.hook_fail_paths = set()
        FakeServer.reply = lambda r: (200, ok_body(r))

    def write_cases(self, *cases, before=None):
        data = {"webhook": "dubakwi-support", "cases": list(cases)}
        if before is not None:
            data["before"] = before
        path = self.base / "cases/test.json"
        path.write_text(json.dumps(data, ensure_ascii=False), encoding="utf-8")

    def run_tool(self, *extra):
        args = RUN.parse_args(
            [
                "--base-url",
                self.base_url,
                "--data-api",
                self.base_url,
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
        return RUN.execute(args, base=self.base, now=NOW)

    def webhook_calls(self):
        return [b for p, b in FakeServer.calls if p.startswith("/webhook/")]

    def simple(self, name="A", **x):
        return flow_case(name, req(), {"status": 200, "equals": {"route": "차단"}}, **x)

    def write_search(self, *cases):
        guard = {"restricted_docs": ["handoff-policy"], "canary_prefix": "TEST-CANARY"}
        data = {"webhook": "dubakwi-search", "x_dubakwi": {"search_guard": guard}}
        data["cases"] = list(cases)
        path = self.base / "cases/test.json"
        path.write_text(json.dumps(data, ensure_ascii=False), encoding="utf-8")

    @staticmethod
    def search_case(name, levels, expect=None):
        body = {"request_id": name.lower(), "enabled": True, "query": "q"}
        body |= {"access_levels": levels, "deadline_at": "2099-01-01T00:00:00Z"}
        return flow_case(name, body, expect or {"status": 200, "equals": {"status": "ok"}})

    @staticmethod
    def search_reply(*evidence):
        def reply(request):
            items = [
                {"doc": d, "section": "s", "access_level": a, "score": 0.5, "text": t}
                for d, a, t in evidence
            ]
            body = {"request_id": request["request_id"], "status": "ok", "evidence": items}
            return 200, body

        return reply

    def test_search_guard_passes_public_evidence_and_skips_support_checks(self):
        FakeServer.reply = self.search_reply(("rental-guide", "public", "SECRET-EVIDENCE-TEXT"))
        self.write_search(self.search_case("P", ["public"]))
        summary, path = self.run_tool()
        case = summary["cases"][0]
        self.assertEqual(case["status"], "pass")
        ids = [g["id"] for g in case["global_checks"]]
        self.assertEqual(ids, ["G03", "G01", "S01", "S02", "S03", "G06"])
        step = case["steps"][0]
        self.assertEqual(step["search_status"], "ok")
        self.assertEqual(
            step["evidence"][0],
            {"doc": "rental-guide", "section": "s", "access_level": "public", "score": 0.5},
        )
        self.assertNotIn("SECRET-EVIDENCE-TEXT", path.read_text(encoding="utf-8"))

    def test_search_guard_fails_on_restricted_level_canary_or_doc_for_public_request(self):
        leaks = [
            (("x", "restricted", "t"), "S01"),
            (("x", "public", "has TEST-CANARY-01"), "S02"),
            (("handoff-policy", "public", "t"), "S03"),
        ]
        for evidence, expected in leaks:
            with self.subTest(leak=expected):
                FakeServer.reply = self.search_reply(evidence)
                self.write_search(self.search_case("L", ["public"]))
                summary, _ = self.run_tool()
                case = summary["cases"][0]
                failed = [g["id"] for g in case["global_checks"] if not g["passed"]]
                self.assertEqual((case["status"], failed), ("fail", [expected]))

    def test_search_guard_is_not_applied_when_restricted_access_is_requested(self):
        FakeServer.reply = self.search_reply(("handoff-policy", "restricted", "TEST-CANARY-01"))
        self.write_search(self.search_case("S", ["public", "restricted"]))
        summary, _ = self.run_tool()
        case = summary["cases"][0]
        self.assertEqual(case["status"], "pass")
        self.assertEqual([g["id"] for g in case["global_checks"]], ["G03", "G01", "G06"])

    def test_file_reset_failure_blocks_current_and_later_files_without_webhook(self):
        reset = [{"url": "http://localhost:8800/tickets-reset", "body": {}}]
        self.write_cases(self.simple("A"), before=reset)
        other = {"webhook": "dubakwi-support", "cases": [self.simple("B")]}
        (self.base / "cases/other.json").write_text(json.dumps(other), encoding="utf-8")
        FakeServer.hook_fail_paths = {"/tickets-reset"}
        summary, _ = self.run_tool("--cases-file", "cases/test.json", "cases/other.json")
        self.assertEqual(summary["counts"], {"blocked": 2})
        self.assertEqual(self.webhook_calls(), [])
        self.assertEqual([p for p, _ in FakeServer.calls], ["/tickets-reset"])
        self.assertFalse(summary["file_hooks"]["cases/test.json"][0]["ok"])

    def test_case_prepare_failure_attempts_cleanup_and_blocks_later_case(self):
        on = [{"url": "http://localhost:8800/fault-on", "body": {}}]
        off = [{"url": "http://localhost:8800/fault-off", "body": {}}]
        self.write_cases(self.simple("A", before=on, after=off), self.simple("B"))
        FakeServer.hook_fail_paths = {"/fault-on"}
        summary, _ = self.run_tool()
        self.assertEqual(summary["counts"], {"blocked": 2})
        self.assertEqual(self.webhook_calls(), [])
        self.assertEqual([p for p, _ in FakeServer.calls], ["/fault-on", "/fault-off"])

    def test_cleanup_failure_fails_current_and_blocks_later_file(self):
        off = [{"url": "http://localhost:8800/fault-off", "body": {}}]
        self.write_cases(self.simple("A", after=off))
        other = {"webhook": "dubakwi-support", "cases": [self.simple("B")]}
        (self.base / "cases/other.json").write_text(json.dumps(other), encoding="utf-8")
        FakeServer.hook_fail_paths = {"/fault-off"}
        summary, _ = self.run_tool("--cases-file", "cases/test.json", "cases/other.json")
        self.assertEqual(summary["counts"], {"fail": 1, "blocked": 1})
        self.assertEqual(len(self.webhook_calls()), 1)
        self.assertEqual(
            [p for p, _ in FakeServer.calls], ["/webhook/dubakwi-support", "/fault-off"]
        )
        failed = [c["id"] for c in summary["cases"][0]["global_checks"] if not c["passed"]]
        self.assertIn("H01", failed)

    def test_flow_checks_pass_and_open_checks_stay_unverified(self):
        self.write_cases(self.simple(checks=["LLM 0"]))
        summary, path = self.run_tool()
        result = summary["cases"][0]
        self.assertEqual(result["status"], "auto_pass_unverified")
        self.assertEqual(result["unverified"], ["LLM 0"])
        self.assertEqual(self.webhook_calls()[0]["request_id"], f"{summary['run_id']}-a1")
        self.assertEqual(FakeServer.calls[0][0], "/webhook/dubakwi-support")
        self.assertEqual(path, self.base / "runs/public" / summary["run_id"] / "summary.json")

    def test_no_open_items_is_full_pass(self):
        self.write_cases(self.simple())
        summary, _ = self.run_tool()
        self.assertEqual(summary["cases"][0]["status"], "pass")

    def test_wrong_status_and_route_fail(self):
        FakeServer.reply = lambda r: (500, ok_body(r, route="자동 답변"))
        self.write_cases(self.simple())
        summary, _ = self.run_tool()
        result = summary["cases"][0]
        self.assertEqual(result["status"], "fail")
        failed = [(c["kind"], c["path"]) for c in result["checks"] if not c["passed"]]
        self.assertEqual(failed, [("status", "<http_status>"), ("equals", "route")])

    def test_contains_matches_source_doc_and_not_contains_blocks_text(self):
        FakeServer.reply = lambda r: (
            200,
            ok_body(
                r,
                route="자동 답변",
                sources=[{"doc": "rental-guide", "section": "s", "score": 0.9}],
                answer="5자리 번호 입력",
            ),
        )
        expect = {
            "status": 200,
            "contains": {"sources": ["rental-guide"]},
            "not_contains": {"answer": ["010-0000-"]},
            "equals": {"ticket": None},
        }
        self.write_cases(flow_case("A", req(), expect))
        summary, _ = self.run_tool()
        self.assertEqual(summary["cases"][0]["status"], "pass")
        FakeServer.reply = lambda r: (200, ok_body(r, route="자동 답변", answer="010-0000-1234"))
        summary, _ = self.run_tool()
        failed = [c["kind"] for c in summary["cases"][0]["checks"] if not c["passed"]]
        self.assertEqual(failed, ["contains", "not_contains"])

    def test_dotted_equals_and_x_assert(self):
        FakeServer.reply = lambda r: (
            200,
            ok_body(
                r,
                route="담당자 이관",
                ticket={"ticket_id": "T-9", "priority": "high", "duplicate": False},
                security={"blocked_by": None, "reason": None, "masked": 2},
            ),
        )
        expect = {"status": 200, "equals": {"ticket.priority": "high"}}
        x_assert = [
            {"path": "security.masked", "op": "gte", "value": 1},
            {"path": "ticket.ticket_id", "op": "ne_value", "value": "T-DEMO-02"},
        ]
        self.write_cases(flow_case("A", req(), expect, **{"assert": x_assert}))
        summary, _ = self.run_tool()
        self.assertEqual(summary["cases"][0]["status"], "pass")

    def test_multi_step_reference_is_sent_and_judged(self):
        FakeServer.reply = lambda r: (200, ok_body(r, route="보완 질문", case_ref="case-77"))
        steps = [
            {"step": 1, "body": req("t1"), "expect": {"status": 200}},
            {
                "step": 2,
                "body": req("t2") | {"case_ref": "{step1.case_ref}"},
                "expect": {"status": 200},
                "assert": [
                    {"path": "case_ref", "op": "same_as", "value": {"step": 1, "path": "case_ref"}}
                ],
            },
        ]
        self.write_cases({"name": "T", "x_dubakwi": {"id": "T", "steps": steps}})
        summary, path = self.run_tool()
        self.assertEqual(self.webhook_calls()[1]["case_ref"], "case-77")
        self.assertEqual(summary["cases"][0]["status"], "pass")
        same_as = [c for c in summary["cases"][0]["checks"] if c["kind"] == "x:same_as"][0]
        self.assertEqual(same_as["expected"], {"same_as": "step1", "path": "case_ref"})
        self.assertNotIn("case-77", path.read_text(encoding="utf-8"))

    def test_failed_same_as_does_not_publish_earlier_value(self):
        replies = iter([("case-secret-1", "보완 질문"), ("case-other-2", "보완 질문")])

        def reply(request):
            case_ref, route = next(replies)
            return 200, ok_body(request, route=route, case_ref=case_ref)

        FakeServer.reply = reply
        same = {"path": "case_ref", "op": "same_as", "value": {"step": 1, "path": "case_ref"}}
        steps = [
            {"step": 1, "body": req("f1"), "expect": {"status": 200}},
            {"step": 2, "body": req("f2"), "expect": {"status": 200}, "assert": [same]},
        ]
        self.write_cases({"name": "F", "x_dubakwi": {"id": "F", "steps": steps}})
        summary, path = self.run_tool()
        self.assertEqual(summary["cases"][0]["status"], "fail")
        public = path.read_text(encoding="utf-8")
        self.assertNotIn("case-secret-1", public)
        self.assertNotIn("case-other-2", public)

    def test_same_as_across_cases_compares_earlier_case_response(self):
        tickets = iter(
            [
                {"ticket_id": "T-1", "priority": "normal", "duplicate": False},
                {"ticket_id": "T-1", "priority": "normal", "duplicate": True},
            ]
        )
        FakeServer.reply = lambda r: (200, ok_body(r, route="담당자 이관", ticket=next(tickets)))
        first = flow_case("D 1/2", req("d"), {"status": 200})
        second = flow_case(
            "D 2/2",
            req("d"),
            {"status": 200, "equals": {"ticket.duplicate": True}},
            **{
                "assert": [
                    {
                        "path": "ticket",
                        "op": "same_as",
                        "value": {"case": "D 1/2", "path": "ticket"},
                    }
                ]
            },
        )
        self.write_cases(first, second)
        summary, _ = self.run_tool()
        self.assertEqual(summary["cases"][1]["status"], "fail")
        failed = [c["kind"] for c in summary["cases"][1]["checks"] if not c["passed"]]
        self.assertEqual(failed, ["x:same_as"])

    def test_requires_operator_manual_fault_and_disabled_hooks_are_blocked(self):
        hooked = self.simple(
            "H", before=[{"url": "http://localhost:8800/admin/fault", "body": {"tickets": "error"}}]
        )
        self.write_cases(
            self.simple("R", requires="R04 switch"),
            {"name": "O", "x_dubakwi": {"id": "O", "steps": []}},
            self.simple("M", manual_fault={"before": "llm down", "after": "llm up"}),
            hooked,
        )
        summary, _ = self.run_tool("--no-hooks")
        self.assertEqual([c["status"] for c in summary["cases"]], ["blocked"] * 4)
        self.assertEqual(FakeServer.calls, [])

    def test_test_copy_case_is_blocked_without_mode_and_sent_to_copy_with_mode(self):
        copy = {"webhook": "dubakwi-support-tc08", "modes": ["grounded", "unparsable"]}
        self.write_cases(self.simple("T", test_copy=copy), self.simple("N"))
        summary, _ = self.run_tool()
        self.assertEqual([c["status"] for c in summary["cases"]], ["blocked", "pass"])
        self.assertIsNone(summary["versions"]["test_copy"])

        FakeServer.calls = []
        digest = "a" * 64
        summary, path = self.run_tool("--test-copy-mode", "grounded", "--test-copy-sha256", digest)
        paths = [p for p, _ in FakeServer.calls]
        self.assertEqual(paths, ["/webhook/dubakwi-support-tc08", "/webhook/dubakwi-support"])
        self.assertEqual(summary["cases"][0]["status"], "pass")
        recorded = {"webhook": "dubakwi-support-tc08", "mode": "grounded", "sha256": digest}
        self.assertEqual(summary["cases"][0]["test_copy"], recorded)
        self.assertEqual(summary["versions"]["test_copy"], {"mode": "grounded", "sha256": digest})
        self.assertIn(digest, path.read_text(encoding="utf-8"))

        FakeServer.calls = []
        summary, _ = self.run_tool("--test-copy-mode", "other", "--test-copy-sha256", digest)
        self.assertEqual(summary["cases"][0]["status"], "blocked")
        self.assertEqual([p for p, _ in FakeServer.calls], ["/webhook/dubakwi-support"])

    def test_test_copy_options_must_come_together_with_valid_hash(self):
        self.write_cases(self.simple())
        with self.assertRaisesRegex(ValueError, "together"):
            self.run_tool("--test-copy-mode", "grounded")
        with self.assertRaisesRegex(ValueError, "64 lowercase hex"):
            self.run_tool("--test-copy-mode", "grounded", "--test-copy-sha256", "XYZ")
        self.assertEqual(FakeServer.calls, [])

    def test_wf09_style_replay_passes_when_only_duplicate_flag_differs(self):
        def reply(request):
            replay = request["request_id"].endswith("-2")
            ticket = {"ticket_id": "T-1", "priority": "normal", "duplicate": replay}
            return 200, ok_body(request, route="담당자 이관", ticket=ticket)

        FakeServer.reply = reply
        same = [
            {"path": p, "op": "same_as", "value": {"case": "D 1/2", "path": p}}
            for p in ("ticket.ticket_id", "ticket.priority")
        ]
        first = flow_case("D 1/2", req("d-1"), {"status": 200})
        second = flow_case(
            "D 2/2",
            req("d-2"),
            {"status": 200, "equals": {"ticket.duplicate": True}},
            **{"assert": same},
        )
        self.write_cases(first, second)
        summary, _ = self.run_tool()
        self.assertEqual(summary["cases"][1]["status"], "pass")

    def test_check_logs_matches_b35_entry_and_flags_missing_leak_or_unreadable(self):
        self.write_cases(self.simple())
        summary, _ = self.run_tool("--check-logs")
        case = summary["cases"][0]
        self.assertTrue(summary["log_check"])
        self.assertEqual(case["status"], "pass")
        self.assertEqual([c["id"] for c in case["log_checks"]], ["L01", "L02", "L03"])

        FakeServer.log_mode = "leak"
        summary, _ = self.run_tool("--check-logs")
        failed = [c["id"] for c in summary["cases"][0]["log_checks"] if not c["passed"]]
        self.assertEqual((summary["cases"][0]["status"], failed), ("fail", ["L03"]))

        FakeServer.logs, FakeServer.log_mode = [], "off"
        summary, _ = self.run_tool("--check-logs")
        failed = [c["id"] for c in summary["cases"][0]["log_checks"] if not c["passed"]]
        self.assertEqual((summary["cases"][0]["status"], failed), ("fail", ["L01"]))

        FakeServer.log_mode = "broken"
        summary, _ = self.run_tool("--check-logs")
        case = summary["cases"][0]
        self.assertEqual(case["status"], "auto_pass_unverified")
        self.assertIn("log read failed: data-api /logs를 읽지 못함", case["unverified"])

    def test_logs_are_not_read_without_option(self):
        self.write_cases(self.simple())
        summary, _ = self.run_tool()
        self.assertEqual(summary["cases"][0]["log_checks"], [])
        self.assertFalse(summary["log_check"])

    def test_manual_fault_ready_sends_case(self):
        self.write_cases(self.simple("M", manual_fault={"before": "llm down", "after": "llm up"}))
        summary, _ = self.run_tool("--manual-fault-ready")
        self.assertEqual(summary["cases"][0]["status"], "pass")

    def test_hooks_run_in_order_and_after_always_runs(self):
        fault_on = {"url": "http://localhost:8800/admin/fault", "body": {"tickets": "error"}}
        fault_off = {"url": "http://localhost:8800/admin/fault", "body": {"tickets": "ok"}}
        FakeServer.reply = lambda r: (500, ok_body(r))
        reset = [{"url": "http://localhost:8800/tickets-reset", "body": {}}]
        self.write_cases(self.simple("H", before=[fault_on], after=[fault_off]), before=reset)
        summary, _ = self.run_tool()
        paths = [(p, b) for p, b in FakeServer.calls]
        self.assertEqual(paths[0], ("/tickets-reset", {}))
        self.assertEqual(paths[1], ("/admin/fault", {"tickets": "error"}))
        self.assertTrue(paths[2][0].startswith("/webhook/"))
        self.assertEqual(paths[3], ("/admin/fault", {"tickets": "ok"}))
        self.assertEqual(summary["cases"][0]["status"], "fail")
        self.assertTrue(summary["cases"][0]["hooks"]["after"][0]["ok"])

    def test_public_summary_hides_answer_url_and_token_raw_keeps_detail(self):
        os.environ["UNIT_TOKEN"] = TOKEN
        self.addCleanup(os.environ.pop, "UNIT_TOKEN")
        self.write_cases(self.simple())
        summary, path = self.run_tool("--auth-token-env", "UNIT_TOKEN")
        public_text = path.read_text(encoding="utf-8")
        raw_text = (self.base / "runs" / summary["run_id"] / "raw.json").read_text(encoding="utf-8")
        self.assertEqual(FakeServer.headers_seen[0]["X-Team-Key"], TOKEN)
        self.assertTrue(summary["auth_header_sent"])
        for hidden in [TOKEN, "SECRET-ANSWER-TEXT", self.base_url]:
            self.assertNotIn(hidden, public_text)
        self.assertNotIn(TOKEN, raw_text)
        self.assertIn("SECRET-ANSWER-TEXT", raw_text)

    def test_auth_required_without_token_stops_before_sending(self):
        self.write_cases(self.simple())
        with self.assertRaisesRegex(ValueError, "NOT_SET_TOKEN"):
            self.run_tool("--auth-token-env", "NOT_SET_TOKEN", "--auth-required")
        self.assertEqual(FakeServer.calls, [])

    def test_default_token_env_prefers_flow_key_then_env_example_name(self):
        self.write_cases(self.simple())
        cleared = {name: "" for name in RUN.DEFAULT_TOKEN_ENVS}
        with mock.patch.dict(os.environ, cleared | {"DUBAKWI_WEBHOOK_TOKEN": TOKEN}):
            summary, _ = self.run_tool()
        self.assertEqual(summary["auth_token_env"], "DUBAKWI_WEBHOOK_TOKEN")
        self.assertEqual(FakeServer.headers_seen[-1]["X-Team-Key"], TOKEN)
        both = {"FLOW_WEBHOOK_KEY": "flow-key-not-real", "DUBAKWI_WEBHOOK_TOKEN": TOKEN}
        with mock.patch.dict(os.environ, both):
            summary, _ = self.run_tool()
        self.assertEqual(summary["auth_token_env"], "FLOW_WEBHOOK_KEY")
        self.assertEqual(FakeServer.headers_seen[-1]["X-Team-Key"], "flow-key-not-real")
        with (
            mock.patch.dict(os.environ, cleared),
            self.assertRaisesRegex(ValueError, "FLOW_WEBHOOK_KEY or DUBAKWI_WEBHOOK_TOKEN"),
        ):
            self.run_tool("--auth-required")

    def test_response_limit_g06_fails_slow_response_and_target_only_records(self):
        def slow(request):
            time.sleep(0.3)
            return 200, ok_body(request)

        FakeServer.reply = slow
        self.write_cases(self.simple("T", target_seconds=0.1))
        summary, _ = self.run_tool("--response-limit", "5")
        case = summary["cases"][0]
        g06 = [g for g in case["global_checks"] if g["id"] == "G06"]
        self.assertEqual([g["passed"] for g in g06], [True])
        self.assertEqual(case["status"], "auto_pass_unverified")
        self.assertTrue(any(u.startswith("목표 시간 초과: step1") for u in case["unverified"]))

        summary, _ = self.run_tool("--response-limit", "0.1")
        case = summary["cases"][0]
        failed = [g["id"] for g in case["global_checks"] if not g["passed"]]
        self.assertEqual((case["status"], failed), ("fail", ["G06"]))

    def run_with_prompt(self, answers, *extra):
        asked = []

        def prompt(message):
            asked.append(message)
            return answers.pop(0) if answers else None

        args = RUN.parse_args(
            ["--base-url", self.base_url, "--data-api", self.base_url, "--env", "local"]
            + ["--desc", "unit", "--path", "mock", "--cases-file", "cases/test.json", *extra]
        )
        summary, _ = RUN.execute(args, base=self.base, now=NOW, prompt=prompt)
        return summary, asked

    def paused_case(self, name="P"):
        return {
            "name": name,
            "x_dubakwi": {
                "id": name,
                "requires": "시험 사본 준비",
                "steps": [
                    {"step": 1, "body": req("p-1"), "expect": {"status": 200}},
                    {
                        "step": 2,
                        "pause": "고장 해제 확인",
                        "body": req("p-1"),
                        "expect": {"status": 200},
                    },
                ],
            },
        }

    def test_requires_unblocks_only_with_ready_and_pause_continues_on_enter(self):
        self.write_cases(self.paused_case())
        summary, asked = self.run_with_prompt([""])
        self.assertEqual(summary["cases"][0]["status"], "blocked")
        self.assertEqual(asked, [])

        summary, asked = self.run_with_prompt([""], "--ready", "P")
        self.assertEqual(summary["cases"][0]["status"], "pass")
        self.assertEqual(len(asked), 1)
        self.assertIn("[P step2] 고장 해제 확인", asked[0])
        self.assertEqual(len(self.webhook_calls()), 2)
        self.assertEqual(summary["ready"], ["P"])

    def test_stop_at_pause_halts_the_case_and_later_cases(self):
        self.write_cases(self.paused_case("P"), self.simple("Later"))
        summary, _ = self.run_with_prompt(["stop"], "--ready", "P")
        by_id = {c["id"]: c for c in summary["cases"]}
        self.assertEqual(by_id["P"]["status"], "halted")
        self.assertEqual([s["step"] for s in by_id["P"]["steps"]], [1])
        self.assertEqual(by_id["Later"]["status"], "blocked")
        self.assertIn("P operator stopped before step2", by_id["Later"]["reason"])
        self.assertEqual(len(self.webhook_calls()), 1)

    def test_not_implemented_is_not_sent_and_counts_are_split_by_category(self):
        self.write_cases(
            self.simple("N"),
            self.simple("F", category="failure_handling"),
            self.simple("R", category="recovery", not_implemented="재개 기능 없음"),
        )
        summary, _ = self.run_tool()
        by_id = {c["id"]: c for c in summary["cases"]}
        self.assertEqual(by_id["R"]["status"], "not_implemented")
        self.assertEqual(by_id["R"]["reason"], "재개 기능 없음")
        self.assertEqual(len(self.webhook_calls()), 2)
        self.assertEqual(
            summary["counts_by_category"],
            {
                "normal": {"pass": 1},
                "failure_handling": {"pass": 1},
                "recovery": {"not_implemented": 1},
            },
        )
        self.assertNotIn("fail", summary["counts"])

    def test_default_response_limit_is_25_seconds(self):
        self.write_cases(self.simple())
        summary, _ = self.run_tool()
        g06 = [g for g in summary["cases"][0]["global_checks"] if g["id"] == "G06"]
        self.assertEqual((g06[0]["check"], g06[0]["passed"]), ("response within 25s", True))
        self.assertEqual(summary["cases"][0]["status"], "pass")

    def test_contact_pattern_in_response_fails_global_check(self):
        FakeServer.reply = lambda r: (200, ok_body(r, answer="연락처 010-1234-5678"))
        self.write_cases(self.simple())
        summary, _ = self.run_tool()
        self.assertEqual(summary["cases"][0]["status"], "fail")
        g03 = [g for g in summary["cases"][0]["global_checks"] if g["id"] == "G03"]
        self.assertFalse(g03[0]["passed"])

    def test_existing_run_directory_gets_suffix(self):
        self.write_cases(self.simple())
        first, _ = self.run_tool()
        second, _ = self.run_tool()
        self.assertEqual(second["run_id"], first["run_id"] + "-2")
        self.assertTrue((self.base / "runs/public" / first["run_id"] / "summary.json").exists())

    def test_too_long_request_id_is_rejected(self):
        self.write_cases(flow_case("L", req("x" * 40), {"status": 200}))
        with self.assertRaisesRegex(ValueError, "longer than 64"):
            self.run_tool()

    def test_invalid_env_label_is_rejected(self):
        self.write_cases(self.simple())
        args = RUN.parse_args(
            ["--env", "VM/1", "--desc", "x", "--path", "mock", "--cases-file", "cases/test.json"]
        )
        with self.assertRaises(ValueError):
            RUN.execute(args, base=self.base, now=NOW)

    def test_repository_cases_dry_run_resolves_without_sending_or_writing(self):
        args = RUN.parse_args(
            [
                "--base-url",
                self.base_url,
                "--env",
                "local",
                "--desc",
                "dry",
                "--path",
                "mock",
                "--dry-run",
            ]
        )
        summary, path = RUN.execute(args, base=ROOT, now=NOW)
        self.assertIsNone(path)
        self.assertEqual(FakeServer.calls, [])
        self.assertFalse((ROOT / "runs/public" / summary["run_id"]).exists())
        by_id = {c["id"]: c for c in summary["cases"]}
        self.assertEqual(by_id["WF08"]["status"], "dry_run")
        self.assertEqual(by_id["WF04"]["status"], "dry_run")
        self.assertEqual(by_id["WF10"]["status"], "blocked")
        self.assertEqual(by_id["TC05"]["status"], "blocked")
        self.assertIn("test copy", by_id["TC08"]["reason"])
        self.assertEqual(len(by_id["WF13c"]["requests"][1]["question"]), 501)
        self.assertEqual(len(by_id["TC09c"]["requests"][1]["question"]), 500)


class CaseFileTests(unittest.TestCase):
    """Repository case files keep the flow.py shape and the 14 shared types."""

    def load(self, name):
        return json.loads((ROOT / name).read_text(encoding="utf-8"))

    def test_common_cases_cover_14_types_with_flow_fields(self):
        data = self.load("cases/common.json")
        self.assertEqual(data["webhook"], "dubakwi-support")
        names = [c["name"] for c in data["cases"]]
        for wf in [
            "01",
            "02",
            "02b",
            "03",
            "04",
            "05",
            "06",
            "07",
            "08",
            "09",
            "10",
            "11",
            "12",
            "13",
        ]:
            self.assertTrue(any(n.startswith(f"WF-{wf} ") for n in names), wf)
        for case in data["cases"]:
            with self.subTest(case=case["name"]):
                self.assertIn("body", case)
                self.assertIn("status", case["expect"])

    def test_wf09_replay_compares_ticket_id_and_priority_not_whole_ticket(self):
        data = self.load("cases/common.json")
        second = next(c for c in data["cases"] if c["name"] == "WF-09 중복 요청 2/2")
        self.assertIs(second["expect"]["equals"]["ticket.duplicate"], True)
        paths = [a["path"] for a in second["x_dubakwi"]["assert"] if a["op"] == "same_as"]
        self.assertEqual(paths, ["ticket.ticket_id", "ticket.priority"])

    def test_tc08_uses_test_copy_webhook_instead_of_requires(self):
        data = self.load("cases/team-extended.json")
        tc08 = next(c for c in data["cases"] if c["x_dubakwi"]["id"] == "TC08")
        self.assertNotIn("requires", tc08["x_dubakwi"])
        self.assertEqual(tc08["x_dubakwi"]["test_copy"]["webhook"], "dubakwi-support-tc08")
        self.assertEqual(tc08["x_dubakwi"]["test_copy"]["modes"], ["grounded", "unparsable"])

    def test_demo_requests_reuse_case_questions_and_turn_faults_off(self):
        demo = self.load("requests/demo-sequence.json")
        cases = {}
        for name in ("cases/common.json", "cases/team.json"):
            for case in self.load(name)["cases"]:
                cases[case["x_dubakwi"]["id"]] = case
        sent = [s for s in demo["steps"] if s["request"]]
        self.assertEqual([s["step"] for s in demo["steps"]], list(range(1, 8)))
        for step in sent:
            with self.subTest(step=step["step"]):
                body = self.load(step["request"])
                case_body = cases[step["case"]]["body"]
                self.assertEqual(body["question"], case_body["question"])
                self.assertEqual(body["user"], case_body["user"])
                self.assertRegex(body["request_id"], r"^demo-\d-r\d+$")
                if "fault_on" in step:
                    self.assertIn("fault_off", step)
        self.assertEqual(len({self.load(s["request"])["request_id"] for s in sent}), len(sent))

    def test_recovery_is_marked_not_implemented_and_tc18_splits_three_outcomes(self):
        data = self.load("cases/team-extended.json")
        by_id = {c["x_dubakwi"]["id"]: c["x_dubakwi"] for c in data["cases"]}
        self.assertEqual(by_id["TC07"]["category"], "recovery")
        self.assertIn("미구현", by_id["TC07"]["not_implemented"])
        steps = by_id["TC18"]["steps"]
        self.assertEqual(steps[0]["body"]["request_id"], steps[1]["body"]["request_id"])
        self.assertEqual(steps[1]["expect"]["contains"]["codes"], ["request_requires_review"])
        self.assertEqual(steps[2]["body"]["case_ref"], "{step1.case_ref}")
        self.assertEqual(steps[2]["expect"]["contains"]["codes"], ["case_busy"])
        self.assertNotIn("case_ref", steps[3]["body"])
        self.assertEqual(steps[3]["expect"]["status"], 200)
        self.assertIn("복구 성공이 아니다", by_id["TC18"]["judgment"]["new_inquiry_ok"])

    def test_wf01_eight_seconds_is_a_target_not_a_pass_limit(self):
        data = self.load("cases/common.json")
        wf01 = next(c for c in data["cases"] if c["x_dubakwi"]["id"] == "WF01")
        self.assertNotIn("max_seconds", wf01["expect"])
        self.assertEqual(wf01["x_dubakwi"]["target_seconds"], 8)
        wf11 = next(c for c in data["cases"] if c["x_dubakwi"]["id"] == "WF11")
        self.assertEqual(wf11["expect"]["max_seconds"], 6)
        self.assertIn("25초", data["x_dubakwi"]["time_policy"]["upper_bound"])

    def test_search_cases_guard_public_requests_and_pair_staff_controls(self):
        self.assertNotIn("cases/search.json", RUN.DEFAULT_CASE_FILES)
        data = self.load("cases/search.json")
        self.assertEqual(data["webhook"], "dubakwi-search")
        guard = data["x_dubakwi"]["search_guard"]
        self.assertEqual(guard["restricted_docs"], ["handoff-policy", "ticket-lifecycle"])
        manifest = self.load("knowledge/manifest.json")
        restricted = [
            d["doc_id"] for d in manifest["documents"] if d["access_level"] == "restricted"
        ]
        self.assertEqual(sorted(restricted), sorted(guard["restricted_docs"]))
        for doc in restricted:
            text = (ROOT / f"knowledge/restricted/{doc}.md").read_text(encoding="utf-8")
            self.assertIn(guard["canary_prefix"], text)
        cases = {c["x_dubakwi"]["id"]: c for c in data["cases"]}
        for case in data["cases"]:
            with self.subTest(case=case["name"]):
                for key in ("request_id", "enabled", "query", "access_levels", "deadline_at"):
                    self.assertIn(key, case["body"])
                self.assertEqual(case["expect"]["status"], 200)
        for citizen, staff in (("SR-R01", "SR-STAFF01"), ("SR-R02", "SR-STAFF02")):
            self.assertEqual(cases[citizen]["body"]["query"], cases[staff]["body"]["query"])
            self.assertEqual(cases[citizen]["body"]["access_levels"], ["public"])
            self.assertIn("restricted", cases[staff]["body"]["access_levels"])

    def test_p11_entry_case_is_separate_and_expects_skeleton_mock(self):
        self.assertNotIn("cases/p11-entry.json", RUN.DEFAULT_CASE_FILES)
        data = self.load("cases/p11-entry.json")
        team = {c["x_dubakwi"]["id"]: c for c in self.load("cases/team.json")["cases"]}
        skeleton = {"route": "담당자 이관", "reason": "skeleton_mock", "ticket": None}
        for case in data["cases"]:
            with self.subTest(case=case["name"]):
                self.assertEqual(case["body"]["user"], "citizen-a")
                equals = case["expect"]["equals"]
                self.assertEqual({k: equals[k] for k in skeleton}, skeleton)
        by_id = {c["x_dubakwi"]["id"]: c for c in data["cases"]}
        for p11, tc in (("P11-02", "TC09a"), ("P11-03", "TC09b")):
            self.assertEqual(by_id[p11]["body"]["question"], team[tc]["body"]["question"])
            self.assertIsNone(by_id[p11]["expect"]["equals"]["security.blocked_by"])

    def test_fault_cases_switch_fault_off_after(self):
        data = self.load("cases/common.json")
        for case in data["cases"]:
            if case.get("before"):
                with self.subTest(case=case["name"]):
                    self.assertTrue(case.get("after"))

    def test_team_cases_are_single_send_flow_cases(self):
        data = self.load("cases/team.json")
        self.assertGreaterEqual(len({c["x_dubakwi"]["id"].rstrip("abc") for c in data["cases"]}), 5)
        for case in data["cases"]:
            with self.subTest(case=case["name"]):
                self.assertIn("body", case)
                self.assertNotIn("steps", case["x_dubakwi"])
                self.assertNotIn("requires", case["x_dubakwi"])


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
            ("not_contains", "sources[*].doc", "restricted", True),
            ("not_contains", "$", "자동", False),
            ("exists", "route", None, True),
            ("ne_value", "route", "차단", True),
        ]
        for op, path, value, want in cases:
            with self.subTest(op=op, path=path):
                self.assertEqual(RUN.check(op, RUN.resolve(body, path), value), want)

    def test_flow_contains(self):
        self.assertTrue(RUN.flow_contains([{"doc": "a"}], "a"))
        self.assertTrue(RUN.flow_contains(["invalid_input"], "invalid_input"))
        self.assertTrue(RUN.flow_contains("010-0000-1234", "010-0000-"))
        self.assertFalse(RUN.flow_contains([{"doc": "ab"}], "a"))
        self.assertFalse(RUN.flow_contains(RUN.MISSING, "a"))


if __name__ == "__main__":
    unittest.main()
