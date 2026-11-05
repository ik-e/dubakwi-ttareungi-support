"""P12 handoff가 Jira 호출 전 state 게이트를 강제하는지 확인한다."""

import shutil
import subprocess
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
SCRIPTS = [
    ROOT / "scripts" / "test" / "p12-handoff-cases.js",
    ROOT / "scripts" / "test" / "p12-jira-flow-cases.js",
    ROOT / "scripts" / "test" / "p12-save-cases.js",
]


class P12HandoffTest(unittest.TestCase):
    @unittest.skipUnless(shutil.which("node"), "Node.js가 없어 Code 노드를 실행할 수 없음")
    def test_handoff_requires_state_gate(self) -> None:
        for script in SCRIPTS:
            with self.subTest(script=script.name):
                result = subprocess.run(
                    ["node", str(script)],
                    cwd=ROOT,
                    capture_output=True,
                    text=True,
                    encoding="utf-8",
                    check=False,
                )
                self.assertEqual(result.returncode, 0, result.stdout + result.stderr)


if __name__ == "__main__":
    unittest.main()
