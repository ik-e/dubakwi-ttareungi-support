"""Same adversarial Jira fixtures against Python and embedded n8n JS source."""

import copy
import json
import subprocess
import unittest
from pathlib import Path

from services.user_api import case_context as cc

ROOT = Path(__file__).resolve().parents[2]


class ContextTests(unittest.TestCase):
    def setUp(self):
        self.snapshot = json.loads(
            (ROOT / "infra/contracts/jira-case-context-v1.example.json").read_text("utf-8")
        )
        self.binding = {k: self.snapshot[k] for k in cc.BINDING_KEYS}

    def comment(self, snapshot=None, author="service-test"):
        return {
            "body": cc.MARKER + "\n" + cc.compact(snapshot or self.snapshot),
            "author": {"accountId": author},
        }

    def test_python_javascript_adversarial_parity(self):
        cases = []

        def add(name, comments, code=None, request=None, binding=None):
            cases.append(
                {
                    "name": name,
                    "comments": comments,
                    "binding": binding or self.binding,
                    "authors": ["service-test"],
                    "request_id": request,
                    "expected": code,
                }
            )

        add("valid", [self.comment()])
        api_fact = copy.deepcopy(self.snapshot)
        api_fact["facts"]["confirmed"] = [{"key": "status", "value": "open", "origin": "api"}]
        add("optional_api_reference", [self.comment(api_fact)])
        add("identical_retry", [self.comment(), self.comment()])
        add("missing", [], "context_missing")
        add("untrusted_author", [self.comment(author="citizen")], "context_author_denied")
        add("missing_request", [self.comment()], "context_missing", "another-request")
        for field in cc.BINDING_KEYS:
            bad = copy.deepcopy(self.snapshot)
            bad[field] = "mismatch"
            add(field, [self.comment(bad)], "context_not_linked")
        for name, field, value in [
            ("revision", "revision", 0),
            ("event", "event_id", "0" * 64),
            ("phase", "phase", "unsupported"),
            ("request", "request_id", "x" * 65),
        ]:
            bad = copy.deepcopy(self.snapshot)
            bad[field] = value
            add(name, [self.comment(bad)], "context_invalid")
        for name, update in [
            ("physical_version", {"version": 2}),
            ("handed_role", {"assignee_role": None}),
            ("attempt", {"attempt": 0}),
        ]:
            bad = copy.deepcopy(self.snapshot)
            bad["support"].update(update)
            add(name, [self.comment(bad)], "context_invalid")
        for name, value in [("phone", "010-1234-5678"), ("email", "a@example.invalid")]:
            bad = copy.deepcopy(self.snapshot)
            bad["facts"]["summary"] = value
            add(name, [self.comment(bad)], "context_unmasked")
        bad = copy.deepcopy(self.snapshot)
        bad["facts"]["summary"] = "different"
        add("event_conflict", [self.comment(), self.comment(bad)], "context_conflict")
        bad = copy.deepcopy(self.snapshot)
        bad["request_id"] = "newer-unfinished"
        bad["revision"] = 3
        bad["event_id"] = cc.event_id(bad)
        add(
            "restore_completed_only",
            [self.comment(bad), self.comment()],
            request=self.snapshot["request_id"],
        )
        comment = self.comment()
        marker, payload = comment["body"].split("\n", 1)
        comment["body"] = {
            "type": "doc",
            "version": 1,
            "content": [
                {"type": "paragraph", "content": [{"type": "text", "text": marker}]},
                {"type": "paragraph", "content": [{"type": "text", "text": payload}]},
            ],
        }
        add("adf", [comment])
        script = """
const lib = require('./services/user_api/case_context.js')();
const fs = require('fs');
const cases = JSON.parse(fs.readFileSync(0, 'utf8'));
const result = cases.map(c => {
  try { return {snapshot: lib.selectSnapshot(c.comments, c.binding, c.authors, c.request_id)}; }
  catch(e) { return {error: e.message}; }
});
process.stdout.write(JSON.stringify(result));
"""
        proc = subprocess.run(
            ["node", "-e", script],
            cwd=ROOT,
            input=json.dumps(cases, ensure_ascii=False),
            text=True,
            encoding="utf-8",
            capture_output=True,
            check=True,
        )
        observed = json.loads(proc.stdout)
        for case, js in zip(cases, observed, strict=True):
            with self.subTest(case=case["name"]):
                try:
                    py = {
                        "snapshot": cc.select_snapshot(
                            case["comments"],
                            case["binding"],
                            set(case["authors"]),
                            request_id=case["request_id"],
                        )
                    }
                except cc.ContextError as exc:
                    py = {"error": str(exc)}
                self.assertEqual(py, js)
                self.assertEqual(py.get("error"), case["expected"])

    def test_issue_binding_and_label_hash(self):
        issue = {
            "key": self.binding["ticket_key"],
            "fields": {
                "labels": [cc.case_label(self.binding)],
                "description": "case_id: "
                + self.binding["case_id"]
                + "\nfirst_request_id: "
                + self.binding["first_request_id"],
            },
        }
        cc.validate_issue(issue, self.binding)
        issue["fields"]["labels"] = []
        with self.assertRaisesRegex(cc.ContextError, "context_not_linked"):
            cc.validate_issue(issue, self.binding)

    def test_javascript_complete_pagination_and_unicode(self):
        script = """
const a = require('assert/strict'), crypto = require('crypto');
const lib = require('./services/user_api/case_context.js')();
a.equal(lib.digest(['한글','😀']), crypto.createHash('sha256').update(JSON.stringify(['한글','😀'])).digest('hex'));
a.deepEqual(lib.readPages([{startAt:0,total:2,comments:[{id:1}]},{startAt:1,total:2,comments:[{id:2}]}]),[{id:1},{id:2}]);
a.throws(()=>lib.readPages([{startAt:0,total:2,comments:[{id:1}]}]),/context_incomplete/);
a.throws(()=>lib.readPages([{startAt:1,total:1,comments:[]}]),/context_incomplete/);
a.throws(()=>lib.readPages([{startAt:0,total:1,comments:[{}]},{startAt:1,total:2,comments:[{}]}]),/context_incomplete/);
"""
        subprocess.run(["node", "-e", script], cwd=ROOT, check=True, capture_output=True)


if __name__ == "__main__":
    unittest.main()
