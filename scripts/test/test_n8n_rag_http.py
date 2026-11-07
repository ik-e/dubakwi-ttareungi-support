"""Exercise a running local educational RAG API (uses OpenAI API credits).

Set DUBAKWI_INTERNAL_KEY and optionally DUBAKWI_SEARCH_URL in the process
before running. The key is never printed or written by this script.
"""

import json
import os
import unittest
from urllib.error import HTTPError
from urllib.request import Request, urlopen

URL = os.environ.get("DUBAKWI_SEARCH_URL", "http://127.0.0.1:5678/webhook/dubakwi-search")
KEY = os.environ.get("DUBAKWI_INTERNAL_KEY")
DEADLINE = "2099-01-01T00:00:00Z"


def call(request_id, query, levels, *, enabled=True, deadline=DEADLINE, auth=True):
    payload = {
        "request_id": request_id,
        "enabled": enabled,
        "query": query,
        "access_levels": levels,
        "deadline_at": deadline,
    }
    headers = {"Content-Type": "application/json"}
    if auth:
        headers["X-Internal-Key"] = KEY
    request = Request(URL, json.dumps(payload).encode("utf-8"), headers)
    with urlopen(request, timeout=30) as response:
        return json.load(response)


@unittest.skipUnless(KEY, "DUBAKWI_INTERNAL_KEY is required")
class LocalRagHttpTest(unittest.TestCase):
    def test_authentication(self):
        with self.assertRaises(HTTPError) as caught:
            call("auth", "", ["public"], enabled=False, auth=False)
        self.assertEqual(caught.exception.code, 401)

    def test_skip_and_invalid_permissions(self):
        result = call("skip", "", ["public"], enabled=False)
        self.assertEqual(
            (result["request_id"], result["status"], result["evidence"]), ("skip", "skipped", [])
        )
        result = call("invalid", "test", ["restricted"])
        self.assertEqual((result["status"], result["error_code"]), ("error", "invalid_request"))
        result = call("expired", "test", ["public"], deadline="2000-01-01T00:00:00Z")
        self.assertEqual((result["status"], result["error_code"]), ("error", "deadline_exceeded"))

    def test_citizen_evidence_and_no_restricted_leak(self):
        result = call(
            "wf01", "\ub530\ub989\uc774 QR \uc778\uc2dd\uc774 \uc548\ub3fc\uc694", ["public"]
        )
        self.assertEqual(result["status"], "ok")
        self.assertIn("rental-guide", [x["doc"] for x in result["evidence"]])
        for item in result["evidence"]:
            self.assertEqual(item["access_level"], "public")
            self.assertTrue(
                all(item.get(k) for k in ("doc", "section", "chunk_id", "text", "version"))
            )
            self.assertIsInstance(item["score"], (float, int))
            self.assertTrue(
                item["text"].startswith(
                    ("[\uc2e4\uc81c \uc548\ub0b4]", "[\uac00\uc0c1 \uc124\uc815]")
                )
            )
        self.assertNotIn("DUBAKWI-RESTRICTED-CANARY", json.dumps(result))

    def test_staff_can_retrieve_restricted_and_citizen_cannot(self):
        query = "\ub0b4\ubd80 \ub2f4\ub2f9\uc790 \ubb38\uc758 \uc774\uad00"
        staff = call("staff", query, ["public", "restricted"])
        self.assertEqual(staff["status"], "ok")
        self.assertIn("restricted", [x["access_level"] for x in staff["evidence"]])
        citizen = call("citizen", query, ["public"])
        self.assertTrue(all(x["access_level"] == "public" for x in citizen["evidence"]))
        self.assertNotIn("DUBAKWI-RESTRICTED-CANARY", json.dumps(citizen))

    def test_unrelated_wf03_is_empty(self):
        query = "\ub530\ub989\uc774\ub97c \ud574\uc678 \uc5ec\ud589\uc5d0 \uac00\uc838\uac00\uc11c \ud55c \ub2ec \ub3d9\uc548 \uc368\ub3c4 \ub418\ub098\uc694?"
        result = call("wf03", query, ["public"])
        self.assertEqual((result["status"], result["evidence"]), ("empty", []))

    def test_rental_failure_and_lost_item_retrieval(self):
        cases = [
            (
                "rental-failure",
                "\ub300\uc5ec\uac00 \uc548 \ub3fc\uc694",
                "rental-guide",
                "\uc5f0\uacb0\uacfc \ub300\uc5ec \uc2e4\ud328",
            ),
            (
                "lost-property",
                "\ubc14\uad6c\ub2c8\uc5d0 \ubb3c\uac74\uc744 \ub193\uace0 \uc654\uc5b4\uc694",
                "support-followup",
                "\ubd84\uc2e4\ubb3c\xb7\uc2b5\ub4dd\ubb3c",
            ),
        ]
        for case, query, doc, section in cases:
            with self.subTest(case=case):
                result = call(case, query, ["public"])
                self.assertEqual(result["status"], "ok")
                self.assertEqual(
                    (result["evidence"][0]["doc"], result["evidence"][0]["section"]), (doc, section)
                )

    def test_topics(self):
        cases = [
            (
                "return",
                "\ubc18\ub0a9\uc774 \uc548\ub3fc\uc11c \ub300\uc5ec \uc911\uc73c\ub85c \ub5a0\uc694",
                "return-guide",
            ),
            (
                "refund",
                "\uc774\uc6a9\uad8c \ud658\ubd88 \uc2e0\uccad\uc740 \uc5b4\ub5bb\uac8c \ud558\ub098\uc694?",
                "fees-refund-guide",
            ),
            (
                "security",
                "\uacc4\uc815\uc774 \ud574\ud0b9\ub2f9\ud55c \uac83 \uac19\uc740\ub370 \uc5b4\ub5bb\uac8c \ud574\uc57c \ud558\ub098\uc694?",
                "privacy-security-guide",
            ),
        ]
        for case, query, expected in cases:
            with self.subTest(case=case):
                result = call(case, query, ["public"])
                self.assertEqual(result["status"], "ok")
                self.assertEqual(result["evidence"][0]["doc"], expected)


if __name__ == "__main__":
    unittest.main(verbosity=2)
