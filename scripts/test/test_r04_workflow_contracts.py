"""R04 state/DLQ가 계약 거절 결과를 호출자에게 반환하는지 정적으로 확인한다."""

import json
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]


class R04WorkflowContractsTest(unittest.TestCase):
    def assert_false_branch_returns(self, filename: str, if_node: str, return_node: str) -> None:
        workflow = json.loads((ROOT / "workflows" / filename).read_text(encoding="utf-8"))
        nodes = {node["name"]: node for node in workflow["nodes"]}

        self.assertEqual(nodes[return_node]["type"], "n8n-nodes-base.noOp")
        false_branch = workflow["connections"][if_node]["main"][1]
        self.assertEqual(
            false_branch,
            [{"node": return_node, "type": "main", "index": 0}],
        )

    def test_state_invalid_contract_is_returned(self) -> None:
        self.assert_false_branch_returns(
            "dubakwi-state.json",
            "S03 실제 저장 호출 여부",
            "S06 계약 거절 반환",
        )

    def test_dlq_invalid_contract_is_returned(self) -> None:
        self.assert_false_branch_returns(
            "dubakwi-dlq.json",
            "D03 실제 DLQ 호출 여부",
            "D06 계약 거절 반환",
        )

    def test_postgres_nodes_reference_the_credential_by_name(self) -> None:
        for filename in ("dubakwi-state.json", "dubakwi-dlq.json"):
            workflow = json.loads((ROOT / "workflows" / filename).read_text(encoding="utf-8"))
            nodes = [n for n in workflow["nodes"] if n["type"] == "n8n-nodes-base.postgres"]
            self.assertTrue(nodes, filename)
            for node in nodes:
                self.assertEqual(
                    node.get("credentials"),
                    {"postgres": {"name": "dubakwi-postgres"}},
                    f"{filename} {node['name']}",
                )


if __name__ == "__main__":
    unittest.main()
