"""종료 실패 주입 사본 도구가 종료 전환만 바꾸는지 확인한다."""

import copy
import importlib.util
import json
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
SPEC = importlib.util.spec_from_file_location(
    "make_close_fault_copy", ROOT / "scripts" / "dev" / "make_close_fault_copy.py"
)
tool = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(tool)


class CloseFaultCopyTest(unittest.TestCase):
    def setUp(self) -> None:
        self.source = json.loads(
            (ROOT / "workflows" / "dubakwi-handoff.json").read_text(encoding="utf-8")
        )

    def test_only_close_transition_id_changes(self) -> None:
        original = copy.deepcopy(self.source)
        result = tool.make_fault_copy(copy.deepcopy(self.source))
        changed = [
            a["name"]
            for a, b in zip(original["nodes"], result["nodes"], strict=True)
            if a["parameters"] != b["parameters"]
        ]
        self.assertEqual(1, len(changed))
        self.assertTrue(changed[0].startswith("H33"))
        self.assertEqual(original["connections"], result["connections"])
        self.assertFalse(result["active"])
        self.assertTrue(result["name"].endswith(tool.FAULT_NAME_SUFFIX))
        node = next(n for n in result["nodes"] if n["name"].startswith("H33"))
        self.assertIn(tool.FAULT_FRAGMENT, node["parameters"]["jsCode"])
        self.assertNotIn(tool.ORIGINAL_FRAGMENT, node["parameters"]["jsCode"])

    def test_repository_source_is_not_modified_and_has_no_fault(self) -> None:
        text = (ROOT / "workflows" / "dubakwi-handoff.json").read_text(encoding="utf-8")
        self.assertIn(tool.ORIGINAL_FRAGMENT, text)
        self.assertNotIn(tool.FAULT_FRAGMENT, text)

    def test_changed_format_is_rejected(self) -> None:
        broken = copy.deepcopy(self.source)
        node = next(n for n in broken["nodes"] if n["name"].startswith("H33"))
        node["parameters"]["jsCode"] = node["parameters"]["jsCode"].replace(
            tool.ORIGINAL_FRAGMENT, "body:{x:1"
        )
        with self.assertRaises(tool.FaultCopyError):
            tool.make_fault_copy(broken)

    def test_output_must_be_under_ignored_runs_directory(self) -> None:
        with self.assertRaises(tool.FaultCopyError):
            tool.ensure_untracked_output(ROOT / "workflows" / "x.json")
        with self.assertRaises(tool.FaultCopyError):
            tool.ensure_untracked_output(ROOT / "runs" / "public" / "x" / "x.json")
        tool.ensure_untracked_output(ROOT / "runs" / "private-render" / "x.json")


if __name__ == "__main__":
    unittest.main()
