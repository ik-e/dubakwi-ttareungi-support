"""P12 handoff가 Jira 호출 전 state 게이트를 강제하는지 확인한다."""

import shutil
import subprocess
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
SCRIPT = ROOT / "scripts" / "test" / "p12-handoff-cases.js"


class P12HandoffTest(unittest.TestCase):
    @unittest.skipUnless(shutil.which("node"), "Node.js가 없어 Code 노드를 실행할 수 없음")
    def test_handoff_requires_state_gate(self) -> None:
        result = subprocess.run(
            ["node", str(SCRIPT)],
            cwd=ROOT,
            capture_output=True,
            text=True,
            encoding="utf-8",
            check=False,
        )
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)


if __name__ == "__main__":
    unittest.main()
