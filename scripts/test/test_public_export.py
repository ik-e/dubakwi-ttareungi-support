"""Public export boundaries: no excluded copies, leaked token values, or overwrites."""

import importlib.util
import json
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
SPEC = importlib.util.spec_from_file_location(
    "export_public", ROOT / "scripts/dev/export_public.py"
)
EXPORT = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(EXPORT)


class PublicExportTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name).resolve()
        (self.root / "scripts/dev").mkdir(parents=True)
        (self.root / "docs/project").mkdir(parents=True)
        self.topic = self.root / "docs/project/TOPIC.md"
        self.topic.write_text("# Topic\n", encoding="utf-8")
        self.manifest = self.root / "scripts/dev/public-files.json"
        self.manifest.write_text(json.dumps({"files": ["docs/project/TOPIC.md"]}), encoding="utf-8")
        self.output = self.root / "dist/public"

    def test_omitted_material_is_not_copied_and_link_has_notice(self):
        (self.root / "data").mkdir()
        private = self.root / "data/original.md"
        private.write_text("unpublished original", encoding="utf-8")
        self.topic.write_text("# Topic\n[source](../../data/original.md)\n", encoding="utf-8")
        report = EXPORT.build(self.root, self.output)
        self.assertFalse((self.output / "data").exists())
        exported = self.output / "docs/project/TOPIC.md"
        link = EXPORT.LINK.search(exported.read_text(encoding="utf-8"))
        self.assertEqual(
            (exported.parent / (link[2] or link[3])).resolve(),
            (self.output / "docs/PUBLIC-SOURCES.md").resolve(),
        )
        self.assertEqual(private.read_text(), "unpublished original")
        self.assertEqual(report["rewritten_references"][0]["omitted_reference"], "data/original.md")

    def test_reviewed_gif_is_copied_byte_for_byte_and_link_is_kept(self):
        name = "docs/project/assets/workflow-flow.gif"
        data = b"GIF89a\xff\xfe\r\n\x00"
        (self.root / name).parent.mkdir()
        (self.root / name).write_bytes(data)
        self.topic.write_text("![flow](assets/workflow-flow.gif)\n", encoding="utf-8")
        self.manifest.write_text(
            json.dumps({"files": ["docs/project/TOPIC.md", name]}), encoding="utf-8"
        )
        report = EXPORT.build(self.root, self.output)
        self.assertEqual((self.output / name).read_bytes(), data)
        self.assertEqual(report["rewritten_references"], [])
        self.assertIn(
            "assets/workflow-flow.gif",
            (self.output / "docs/project/TOPIC.md").read_text(encoding="utf-8"),
        )

    def test_unknown_file_never_enters_export(self):
        (self.root / "unexpected.txt").write_text("do not publish", encoding="utf-8")
        EXPORT.build(self.root, self.output)
        self.assertFalse((self.output / "unexpected.txt").exists())

    def test_existing_output_is_unchanged(self):
        self.output.mkdir(parents=True)
        marker = self.output / "keep.txt"
        marker.write_text("keep", encoding="utf-8")
        with self.assertRaisesRegex(ValueError, "exists"):
            EXPORT.build(self.root, self.output)
        self.assertEqual(marker.read_text(), "keep")

    def test_possible_secret_stops_before_output_without_showing_value(self):
        token = "gh" + "p_" + "a" * 36
        self.topic.write_text(token, encoding="utf-8")
        with self.assertRaises(ValueError) as caught:
            EXPORT.build(self.root, self.output)
        self.assertNotIn(token, str(caught.exception))
        self.assertFalse(self.output.exists())

    def test_manifest_cannot_include_parent_or_private_directory(self):
        for name in ["../escape.md", "data/original.md", "docs/guideline/source.md"]:
            with self.subTest(path=name):
                self.manifest.write_text(json.dumps({"files": [name]}), encoding="utf-8")
                with self.assertRaises(ValueError):
                    EXPORT.build(self.root, self.output)
        self.assertFalse(self.output.exists())

    def test_output_cannot_target_source_or_external_directory(self):
        for path in [self.root, self.root / "docs", self.root.parent / "external-output"]:
            with self.subTest(path=path), self.assertRaises(ValueError):
                EXPORT.build(self.root, path)


if __name__ == "__main__":
    unittest.main()
