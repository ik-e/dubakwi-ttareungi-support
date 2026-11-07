"""Public Git checks must not mistake local-only link targets for public material."""

import subprocess
import tempfile
import unittest
from pathlib import Path

from check_public_files import ROOT as PROJECT_ROOT
from check_public_files import audit


class GitPublicFilesTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        subprocess.run(["git", "init", "-q"], cwd=self.root, check=True)
        (self.root / ".gitignore").write_text("data/\n", encoding="utf-8")
        (self.root / "README.md").write_text("# Public\n", encoding="utf-8")
        (self.root / "data").mkdir()
        (self.root / "data/private.md").write_text("local only", encoding="utf-8")

    def test_existing_ignored_link_target_is_rejected(self):
        (self.root / "README.md").write_text("[local](data/private.md)\n", encoding="utf-8")
        result = audit(self.root)
        self.assertTrue(any(x["issue"] == "link target not public" for x in result["errors"]))

    def test_force_added_private_file_is_rejected(self):
        subprocess.run(["git", "add", "-f", "data/private.md"], cwd=self.root, check=True)
        result = audit(self.root)
        self.assertTrue(
            any(x["issue"] == "private material in Git candidates" for x in result["errors"])
        )

    def test_ignored_files_stay_local_but_do_not_enter_candidates(self):
        result = audit(self.root)
        self.assertFalse(result["errors"])
        self.assertNotIn("data/private.md", result["files"])
        self.assertTrue((self.root / "data/private.md").is_file())

    def test_any_ignored_tracked_file_is_rejected(self):
        (self.root / ".gitignore").write_text("data/\ninternal.md\n", encoding="utf-8")
        (self.root / "internal.md").write_text("internal notes", encoding="utf-8")
        subprocess.run(["git", "add", "-f", "internal.md"], cwd=self.root, check=True)
        result = audit(self.root)
        self.assertEqual(result["ignored_tracked_files"], 1)
        self.assertTrue(any("already tracked" in x["issue"] for x in result["errors"]))

    def test_only_the_reviewed_gif_path_is_a_binary_candidate(self):
        (self.root / ".gitignore").write_bytes((PROJECT_ROOT / ".gitignore").read_bytes())
        assets = self.root / "docs/project/assets"
        assets.mkdir(parents=True)
        (assets / "workflow-flow.gif").write_bytes(b"GIF89a\xff\xfe")
        (assets / "other.gif").write_bytes(b"GIF89a\xff\xfe")
        result = audit(self.root)
        self.assertFalse(result["errors"])
        self.assertIn("docs/project/assets/workflow-flow.gif", result["files"])
        self.assertNotIn("docs/project/assets/other.gif", result["files"])

        (assets / "workflow-flow.gif").write_bytes(b"not a gif")
        result = audit(self.root)
        self.assertTrue(any(x["issue"] == "reviewed binary is not a GIF" for x in result["errors"]))

    def test_project_rules_share_masked_text_but_exclude_raw_artifacts(self):
        (self.root / ".gitignore").write_bytes((PROJECT_ROOT / ".gitignore").read_bytes())
        expected = {
            "runs/public/demo/summary.json": True,
            "runs/demo/raw.json": False,
            "docs/project/daily/DAY80.md": True,
            "docs/project/presentation/notes.md": True,
            "docs/project/presentation/slides.pptx": False,
            "docs/project/images/screen.png": False,
        }
        for name in expected:
            path = self.root / name
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_text("{}", encoding="utf-8")
        result = audit(self.root)
        self.assertFalse(result["errors"])
        for name, included in expected.items():
            with self.subTest(path=name):
                self.assertEqual(name in result["files"], included)


if __name__ == "__main__":
    unittest.main()
