import copy
import json
import tempfile
import threading
import time
import unittest
from pathlib import Path

from services.user_api import case_context as cc
from services.user_api.records_provider import RecordsError, RecordsProvider, Settings

ROOT = Path(__file__).resolve().parents[2]


class ProviderTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.authors = Path(self.tmp.name) / "authors.json"
        self.authors.write_text('["service-test"]', encoding="utf-8")
        self.settings = Settings(
            "dubakwi-contract-v1",
            "https://jira.example.invalid",
            Path("unused-dsn"),
            Path("unused-auth"),
            self.authors,
        )
        self.snapshot = json.loads(
            (ROOT / "infra/contracts/jira-case-context-v1.example.json").read_text("utf-8")
        )
        self.binding = {k: self.snapshot[k] for k in cc.BINDING_KEYS}
        self.binding.update(
            ok=True,
            found=True,
            owner_match=True,
            latest_completed_request_id=self.snapshot["request_id"],
        )
        self.issue = {
            "key": self.snapshot["ticket_key"],
            "fields": {
                "labels": [cc.case_label(self.binding)],
                "description": "case_id: "
                + self.binding["case_id"]
                + "\nfirst_request_id: "
                + self.binding["first_request_id"],
                "status": {"statusCategory": {"key": "indeterminate"}},
            },
        }
        self.comment = {
            "body": cc.MARKER + "\n" + cc.compact(self.snapshot),
            "author": {"accountId": "service-test"},
        }
        self.calls = []

    def provider(self, binding=None, reader=None):
        def read(path, deadline):
            self.calls.append(path)
            if "/comment?" in path:
                return {"startAt": 0, "total": 1, "comments": [self.comment]}
            return copy.deepcopy(self.issue)

        return RecordsProvider(
            self.settings,
            binding_reader=lambda *_: self.binding if binding is None else binding,
            jira_reader=reader or read,
        )

    def lookup(self, provider):
        return provider.lookup(self.snapshot["ticket_key"], "citizen-a")

    def test_owner_reads_live_state_without_writes(self):
        record = self.lookup(self.provider())
        self.assertEqual(record["status"], "handed_off")
        self.assertEqual(record["owner_id"], "citizen-a")
        self.assertEqual(record["summary"], self.snapshot["facts"]["summary"])
        self.assertEqual(len(self.calls), 2)

    def test_other_missing_and_error_do_not_read_jira(self):
        for binding, code in [
            ({"ok": True, "found": False}, 404),
            ({"ok": True, "found": True, "owner_match": False}, 403),
            ({"ok": False, "error_code": "state_error"}, 503),
        ]:
            with self.subTest(code=code), self.assertRaises(RecordsError) as err:
                self.lookup(self.provider(binding))
            self.assertEqual(err.exception.status, code)
        self.assertEqual(self.calls, [])

    def test_staff_closed_is_current_closed_not_refund_claim(self):
        self.issue["fields"]["status"]["statusCategory"]["key"] = "done"
        self.assertEqual(self.lookup(self.provider())["status"], "closed")

    def test_legacy_or_unfinished_binding_is_unavailable(self):
        self.binding["latest_completed_request_id"] = None
        with self.assertRaises(RecordsError) as err:
            self.lookup(self.provider())
        self.assertEqual(err.exception.status, 503)
        self.assertEqual(self.calls, [])

    def test_author_mismatch_and_incomplete_pages_are_not_denied_or_success(self):
        self.comment["author"]["accountId"] = "citizen"
        with self.assertRaises(RecordsError) as err:
            self.lookup(self.provider())
        self.assertEqual(err.exception.status, 503)

        def incomplete(path, deadline):
            return {"startAt": 0, "total": 2, "comments": []} if "/comment?" in path else self.issue

        with self.assertRaises(RecordsError) as err:
            self.lookup(self.provider(reader=incomplete))
        self.assertEqual(err.exception.status, 503)

    def test_exceptions_do_not_echo_credentials(self):
        def bad_reader(*_):
            raise RuntimeError("secret-dsn-example")

        with self.assertRaises(RecordsError) as err:
            self.lookup(self.provider(reader=bad_reader))
        self.assertEqual(str(err.exception), "lookup_error")

    def test_stuck_read_returns_unavailable_and_does_not_queue_more_work(self):
        unblock = threading.Event()
        started = threading.Event()
        provider = self.provider()
        provider._slots = threading.BoundedSemaphore(1)
        provider.RESPONSE_BUDGET = 0.04

        def stuck(*_):
            started.set()
            unblock.wait(1)
            return self.binding

        provider.binding_reader = stuck
        try:
            begin = time.monotonic()
            with self.assertRaises(RecordsError) as err:
                self.lookup(provider)
            self.assertEqual(err.exception.status, 503)
            self.assertTrue(started.is_set())
            self.assertLess(time.monotonic() - begin, 0.3)
            with self.assertRaises(RecordsError):
                self.lookup(provider)
            self.assertEqual(self.calls, [])
        finally:
            unblock.set()
            self.assertTrue(provider._slots.acquire(timeout=1))
            provider._slots.release()

    def test_configuration_rejects_credentials_paths_and_non_https(self):
        env = {
            "DUBAKWI_SCOPE": "test",
            "DUBAKWI_DB_DSN_FILE": "dsn",
            "DUBAKWI_JIRA_AUTH_FILE": "auth",
            "DUBAKWI_JIRA_CONTEXT_AUTHORS_FILE": "authors",
        }
        for base in [
            "http://jira.invalid",
            "https://x@y.invalid",
            "https://jira.invalid/path",
            "https://jira.invalid?key=secret",
            "https://jira.invalid#secret",
        ]:
            with self.subTest(base=base), self.assertRaises(RecordsError):
                Settings.from_env(env | {"DUBAKWI_JIRA_BASE": base})


if __name__ == "__main__":
    unittest.main()
