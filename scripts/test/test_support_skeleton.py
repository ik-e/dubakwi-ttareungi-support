"""support 워크플로우의 로컬 시험과 TC08 시험 사본을 확인한다."""

import json
import shutil
import subprocess
import unittest
from pathlib import Path

from make_verifier_fault import MODEL, SOURCE, VERIFIER, WRITER, WRITER_MODEL, build
from make_vm_p19_bundle import FORBIDDEN, HANDOFF_URL, SEARCH_URL, SUPPORT_PATH, build_all
from make_vm_p19_real_bundle import SCOPE_NODES
from make_vm_p19_real_bundle import build_support as build_real_support

ROOT = Path(__file__).resolve().parents[2]
SCRIPT = ROOT / "scripts" / "test" / "support-skeleton-cases.js"


class SupportSkeletonTest(unittest.TestCase):
    @unittest.skipUnless(shutil.which("node"), "Node.js가 없어 Code 노드를 실행할 수 없음")
    def test_code_nodes_pass_local_cases(self) -> None:
        result = subprocess.run(
            ["node", str(SCRIPT)],
            cwd=ROOT,
            capture_output=True,
            text=True,
            encoding="utf-8",
            check=False,
        )
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)

    def test_verifier_fault_copy_keeps_source_clean(self) -> None:
        workflow = json.loads(SOURCE.read_text(encoding="utf-8"))
        original = json.dumps(workflow)
        copy = build(workflow, "grounded")
        node = next(item for item in copy["nodes"] if item["name"] == VERIFIER)
        self.assertEqual(node["type"], "n8n-nodes-base.code")
        self.assertIn("grounded", node["parameters"]["jsCode"])
        self.assertNotIn(MODEL, copy["connections"])
        self.assertEqual(json.dumps(workflow), original)
        hook = next(item for item in copy["nodes"] if item["type"].endswith(".webhook"))
        source_hook = next(item for item in workflow["nodes"] if item["type"].endswith(".webhook"))
        self.assertEqual(hook["parameters"]["path"], "dubakwi-support-tc08")
        self.assertNotEqual(hook["webhookId"], source_hook["webhookId"])
        self.assertEqual(copy["id"], "dubakwiSupportTc08")
        source = next(item for item in workflow["nodes"] if item["name"] == VERIFIER)
        self.assertTrue(source["type"].endswith("chainLlm"))

    def test_unknown_chunk_copy_changes_writer_only_for_citation(self) -> None:
        workflow = json.loads(SOURCE.read_text(encoding="utf-8"))
        copy = build(workflow, "unknown_chunk")
        nodes = {item["name"]: item for item in copy["nodes"]}
        self.assertIn("tc08-unknown-chunk", nodes[WRITER]["parameters"]["jsCode"])
        self.assertIn("grounded", nodes[VERIFIER]["parameters"]["jsCode"])
        self.assertNotIn(WRITER_MODEL, nodes)
        self.assertNotIn(MODEL, nodes)
        self.assertNotIn(WRITER_MODEL, copy["connections"])
        source = {item["name"]: item for item in workflow["nodes"]}
        self.assertTrue(source[WRITER]["type"].endswith("chainLlm"))

    def test_vm_bundle_isolates_mocks_and_keeps_real_calls(self) -> None:
        original = SOURCE.read_text(encoding="utf-8")
        files = build_all({"openai": None, "team": None, "internal": None})
        self.assertEqual(SOURCE.read_text(encoding="utf-8"), original)
        for workflow in files.values():
            text = json.dumps(workflow, ensure_ascii=False)
            self.assertFalse([word for word in FORBIDDEN if word in text])
            self.assertFalse(workflow["active"])
        support = files["dubakwi-support-p19-mock.json"]
        nodes = {item["name"]: item for item in support["nodes"]}
        self.assertEqual(nodes["B01 문의 수신"]["parameters"]["path"], SUPPORT_PATH)
        self.assertEqual(nodes["B14 RAG 검색"]["parameters"]["url"], SEARCH_URL)
        self.assertEqual(nodes["B27 티켓 생성·처리"]["parameters"]["url"], HANDOFF_URL)
        self.assertIn("data-api:8800", nodes["B04 사용자 확인"]["parameters"]["url"])
        handoff = files["dubakwi-p19-mock-handoff.json"]
        hook = next(item for item in handoff["nodes"] if item["type"].endswith(".webhook"))
        self.assertEqual(hook["parameters"]["authentication"], "headerAuth")
        self.assertNotIn("id", hook["credentials"]["httpHeaderAuth"])

    def test_vm_bundle_can_use_team_user_api(self) -> None:
        files = build_all({"openai": None, "team": None, "internal": None}, user_api=True)
        nodes = {item["name"]: item for item in files["dubakwi-support-p19-mock.json"]["nodes"]}
        lookup = nodes["B04 사용자 확인"]
        self.assertIn("dubakwi-user-api:8801/employees/", lookup["parameters"]["url"])
        self.assertEqual(lookup["credentials"]["httpHeaderAuth"]["name"], "dubakwi-internal-key")

    def test_real_bundle_connects_real_targets_without_changing_source(self) -> None:
        workflow = json.loads(SOURCE.read_text(encoding="utf-8"))
        original = json.dumps(workflow)
        copy = build_real_support(
            workflow,
            {
                "state_id": "state-x",
                "dlq_id": "dlq-x",
                "handoff_url": "http://handoff-x",
                "scope": "scope-x",
                "error_workflow_id": "errors-x",
                "openai": None,
                "team": None,
                "internal": None,
            },
        )
        self.assertEqual(json.dumps(workflow), original)
        text = json.dumps(copy, ensure_ascii=False)
        for word in ("dubakwiState01", "dubakwiDlq0001", "dubakwi-handoff", "openAiCourse0001"):
            self.assertNotIn(word, text)
        nodes = {item["name"]: item for item in copy["nodes"]}
        self.assertIn("dubakwi-user-api", nodes["B04 사용자 확인"]["parameters"]["url"])
        self.assertEqual(nodes["B27 티켓 생성·처리"]["parameters"]["url"], "http://handoff-x")
        self.assertEqual(
            nodes["B07 요청 문맥 읽기"]["parameters"]["workflowId"]["value"], "state-x"
        )
        self.assertEqual(nodes["X03 실패 보관"]["parameters"]["workflowId"]["value"], "dlq-x")
        for name in SCOPE_NODES:
            self.assertIn("scope-x", nodes[name]["parameters"]["jsonOutput"])
        self.assertEqual(copy["settings"]["errorWorkflow"], "errors-x")
        self.assertFalse(copy["active"])


if __name__ == "__main__":
    unittest.main()
