import json
import unittest
from pathlib import Path

from make_llm_time_fault import BAD_MODEL, FAULT_ID, FAULT_PATH, MODES, build

ROOT = Path(__file__).resolve().parents[2]
SOURCE = ROOT / "workflows" / "dubakwi-support.json"


def nodes(workflow: dict) -> dict:
    return {item["name"]: item for item in workflow["nodes"]}


class LlmTimeFaultTest(unittest.TestCase):
    def setUp(self) -> None:
        self.source = json.loads(SOURCE.read_text(encoding="utf-8"))
        self.original = json.dumps(self.source, sort_keys=True)

    def check_isolated(self, copy: dict) -> None:
        self.assertEqual(json.dumps(self.source, sort_keys=True), self.original)
        self.assertEqual(copy["id"], FAULT_ID)
        self.assertFalse(copy["active"])
        hook = next(item for item in copy["nodes"] if item["type"].endswith(".webhook"))
        self.assertEqual(hook["parameters"]["path"], FAULT_PATH)
        self.assertEqual(copy["connections"], self.source["connections"])

    def changed_nodes(self, copy: dict) -> list[str]:
        before, after = nodes(self.source), nodes(copy)
        return sorted(
            name for name in after if name != "B01 문의 수신" and after[name] != before[name]
        )

    def test_each_mode_changes_only_its_target(self) -> None:
        targets = {
            "llm_down_triage": ["L01 분류 모델"],
            "llm_down_writer": ["L02 답변 모델"],
            "llm_timeout_writer": ["L02 답변 모델"],
            "deadline_at_triage": ["B02 입력 검사"],
            "deadline_at_answer": ["B02 입력 검사"],
        }
        self.assertEqual(sorted(targets), sorted(MODES))
        for mode, expected in targets.items():
            with self.subTest(mode=mode):
                copy = build(self.source, mode)
                self.check_isolated(copy)
                self.assertEqual(self.changed_nodes(copy), expected)

    def test_values(self) -> None:
        triage = nodes(build(self.source, "llm_down_triage"))["L01 분류 모델"]
        self.assertEqual(triage["parameters"]["model"]["value"], BAD_MODEL)
        timeout = nodes(build(self.source, "llm_timeout_writer"))["L02 답변 모델"]
        self.assertEqual(timeout["parameters"]["options"]["timeout"], 1)
        code = nodes(build(self.source, "deadline_at_answer"))["B02 입력 검사"]
        self.assertIn("const DEADLINE_MS = 15000;", code["parameters"]["jsCode"])

    def test_unknown_mode_rejected(self) -> None:
        with self.assertRaises(ValueError):
            build(self.source, "nope")


if __name__ == "__main__":
    unittest.main()
