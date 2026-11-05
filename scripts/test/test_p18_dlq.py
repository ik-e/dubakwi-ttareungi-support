"""P18 DLQ 워크플로우의 고정 식별자를 확인한다."""

import json
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
WORKFLOW = ROOT / "workflows" / "dubakwi-dlq.json"


class P18DlqTest(unittest.TestCase):
    def test_workflow_has_agreed_id(self) -> None:
        workflow = json.loads(WORKFLOW.read_text(encoding="utf-8"))
        self.assertEqual(workflow["id"], "dubakwiDlq0001")
        self.assertFalse(workflow["active"])


if __name__ == "__main__":
    unittest.main()
