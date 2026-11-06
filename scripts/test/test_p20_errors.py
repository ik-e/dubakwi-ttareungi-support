"""P20 오류 워크플로우가 원본 오류의 비밀 정보를 가리는지 확인한다."""

import shutil
import subprocess
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
SCRIPT = ROOT / "scripts" / "test" / "p20-error-cases.js"


class P20ErrorTest(unittest.TestCase):
    @unittest.skipUnless(shutil.which("node"), "Node.js가 없어 Code 노드를 실행할 수 없음")
    def test_error_details_are_redacted(self) -> None:
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
