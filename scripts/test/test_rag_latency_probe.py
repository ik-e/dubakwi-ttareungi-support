"""Exercise the local-only timing probe without an n8n service or credentials."""

import importlib.util
import json
import threading
import unittest
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

path = Path(__file__).resolve().parents[1] / "dev" / "rag_latency_probe.py"
spec = importlib.util.spec_from_file_location("rag_latency_probe", path)
probe = importlib.util.module_from_spec(spec)
spec.loader.exec_module(probe)


class Handler(BaseHTTPRequestHandler):
    mode = "ok"

    def log_message(self, *args):
        pass

    def do_POST(self):
        length = int(self.headers["Content-Length"])
        data = json.loads(self.rfile.read(length))
        if self.mode == "redirect":
            self.send_response(302)
            self.send_header("Location", "http://example.invalid/")
            self.end_headers()
            return
        evidence = [{"doc": "rental-guide", "access_level": "public"}]
        if self.mode == "leak":
            evidence = [{"doc": "handoff-policy", "access_level": "restricted"}]
        body = json.dumps({"request_id": data["request_id"], "status": "ok", "evidence": evidence})
        self.send_response(200)
        self.end_headers()
        self.wfile.write(body.encode())


class ProbeTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.server = ThreadingHTTPServer(("127.0.0.1", 0), Handler)
        cls.thread = threading.Thread(target=cls.server.serve_forever, daemon=True)
        cls.thread.start()
        cls.url = f"http://127.0.0.1:{cls.server.server_port}/webhook/dubakwi-search"

    @classmethod
    def tearDownClass(cls):
        cls.server.shutdown()
        cls.server.server_close()
        cls.thread.join()

    def test_success_and_no_secret_in_report(self):
        Handler.mode = "ok"
        report = probe.measure(self.url, "secret-test-key", 2)
        self.assertEqual(report["summary"]["ok_count"], 2)
        self.assertFalse(report["summary"]["leak_detected"])
        self.assertNotIn("secret-test-key", json.dumps(report))
        self.assertNotIn(probe.QUERY, json.dumps(report, ensure_ascii=False))

    def test_restricted_result_is_detected(self):
        Handler.mode = "leak"
        self.assertTrue(probe.measure(self.url, "key", 1)["summary"]["leak_detected"])

    def test_redirect_is_not_followed_and_leak_is_unknown(self):
        Handler.mode = "redirect"
        report = probe.measure(self.url, "key", 1)
        self.assertEqual(report["summary"]["leak_unchecked_count"], 1)
        self.assertEqual(report["summary"]["ok_count"], 0)

    def test_non_loopback_is_rejected(self):
        with self.assertRaises(ValueError):
            probe.local_search_url("http://example.invalid/webhook/dubakwi-search")


if __name__ == "__main__":
    unittest.main()
