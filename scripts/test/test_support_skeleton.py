"""support 워크플로우의 로컬 시험과 TC08 시험 사본을 확인한다."""

import json
import shutil
import subprocess
import unittest
from pathlib import Path

from make_verifier_fault import MODEL, SOURCE, VERIFIER, WRITER, WRITER_MODEL, build

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


if __name__ == "__main__":
    unittest.main()
