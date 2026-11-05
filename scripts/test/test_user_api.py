import json
import tempfile
import threading
import unittest
import urllib.error
import urllib.request
from http.server import ThreadingHTTPServer
from pathlib import Path

from services.user_api import server


class UserApiTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.tempdir = tempfile.TemporaryDirectory()
        key_file = Path(cls.tempdir.name) / "internal-key"
        key_file.write_text("test-internal-key\n", encoding="utf-8")
        server.KEY_FILE = str(key_file)
        cls.httpd = ThreadingHTTPServer(("127.0.0.1", 0), server.Handler)
        cls.thread = threading.Thread(target=cls.httpd.serve_forever, daemon=True)
        cls.thread.start()
        cls.base = f"http://127.0.0.1:{cls.httpd.server_port}"

    @classmethod
    def tearDownClass(cls):
        cls.httpd.shutdown()
        cls.httpd.server_close()
        cls.tempdir.cleanup()

    def get(self, path: str, key: str | None = "test-internal-key"):
        headers = {} if key is None else {"X-Internal-Key": key}
        request = urllib.request.Request(f"{self.base}{path}", headers=headers)
        try:
            with urllib.request.urlopen(request, timeout=2) as response:
                return response.status, json.load(response)
        except urllib.error.HTTPError as exc:
            return exc.code, json.load(exc)

    def test_health_does_not_require_secret(self):
        self.assertEqual((200, {"ok": True}), self.get("/healthz", None))

    def test_user_response_has_only_authorization_fields(self):
        status, payload = self.get("/employees/citizen-a")
        self.assertEqual(200, status)
        self.assertEqual(
            {"id": "citizen-a", "role": "citizen", "access_levels": ["public"]},
            payload,
        )

    def test_support_user_has_restricted_access(self):
        status, payload = self.get("/employees/support-demo")
        self.assertEqual(200, status)
        self.assertEqual(["public", "restricted"], payload["access_levels"])

    def test_unknown_user_is_404(self):
        self.assertEqual(404, self.get("/employees/unregistered-zz")[0])

    def test_missing_or_wrong_key_is_401(self):
        self.assertEqual(401, self.get("/employees/citizen-a", None)[0])
        self.assertEqual(401, self.get("/employees/citizen-a", "wrong")[0])

    def test_owner_can_read_masked_record(self):
        status, payload = self.get("/records/T-DEMO-01?requester=citizen-a")
        self.assertEqual(200, status)
        self.assertEqual("citizen-a", payload["owner_id"])
        self.assertEqual("***-****-0001", payload["contact"]["phone"])
        self.assertNotIn("010-0000-0001", json.dumps(payload))

    def test_other_owner_is_denied(self):
        status, payload = self.get("/records/T-DEMO-02?requester=citizen-a")
        self.assertEqual(403, status)
        self.assertEqual("record_access_denied", payload["error"])


if __name__ == "__main__":
    unittest.main()
