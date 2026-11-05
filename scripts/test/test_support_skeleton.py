"""P11 support 골격의 Code 노드 로컬 시험을 unittest로 실행한다."""

import shutil
import subprocess
import unittest
from pathlib import Path

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


if __name__ == "__main__":
    unittest.main()
