"""P12 state 워크플로우의 단독 안전 계약을 로컬에서 확인한다."""

import shutil
import subprocess
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
SCRIPT = ROOT / "scripts" / "test" / "p12-state-cases.js"


class P12StateTest(unittest.TestCase):
    @unittest.skipUnless(shutil.which("node"), "Node.js가 없어 Code 노드를 실행할 수 없음")
    def test_unowned_fail_is_safely_skipped(self) -> None:
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
