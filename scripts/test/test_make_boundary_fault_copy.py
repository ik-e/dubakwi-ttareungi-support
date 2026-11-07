import copy
import json
import unittest
from pathlib import Path

from make_boundary_fault_copy import MODES, build

ROOT = Path(__file__).resolve().parents[2]


class BoundaryFaultTests(unittest.TestCase):
    def test_modes_change_only_target_and_inactive_copy_identity(self):
        for mode, (kind, prefix) in MODES.items():
            with self.subTest(mode=mode):
                original = json.loads((ROOT / f"workflows/dubakwi-{kind}.json").read_text("utf-8"))
                saved = copy.deepcopy(original)
                result = build(original, mode)
                self.assertEqual(original, saved)
                self.assertFalse(result["active"])
                changed = [
                    n["name"]
                    for a, n in zip(original["nodes"], result["nodes"], strict=True)
                    if a != n and a["type"] != "n8n-nodes-base.webhook"
                ]
                target = "S02" if mode == "state_fail" else prefix
                self.assertEqual(len(changed), 1)
                self.assertTrue(changed[0].startswith(target + " "))
                for n in result["nodes"]:
                    if n["type"] == "n8n-nodes-base.webhook":
                        self.assertEqual(n["parameters"]["authentication"], "headerAuth")
                        self.assertIn("-fault-", n["parameters"]["path"])
                if mode == "unexpected":
                    self.assertFalse(
                        any(
                            e["node"].startswith("B10 ")
                            for ports in result["connections"].values()
                            for key, outputs in ports.items()
                            if key != "main"
                            for edges in outputs
                            for e in edges
                        )
                    )


if __name__ == "__main__":
    unittest.main()
