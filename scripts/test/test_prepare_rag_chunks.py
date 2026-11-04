"""Verify the RAG preparation boundary without a vector store or external keys."""

import hashlib
import importlib.util
import json
import tempfile
import unittest
from pathlib import Path

SCRIPT = Path(__file__).resolve().parents[1] / "dev" / "prepare_rag_chunks.py"
SPEC = importlib.util.spec_from_file_location("prepare_rag_chunks", SCRIPT)
MODULE = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(MODULE)


class PrepareChunksTest(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        doc = self.root / "knowledge/public/example.md"
        doc.parent.mkdir(parents=True)
        doc.write_text(
            "# Example\n\n## Mixed\n\nActual notice. **가상 설정:** Demo choice.\n\n출처: example\n",
            encoding="utf-8",
        )
        self.entry = {
            "doc_id": "example",
            "path": "knowledge/public/example.md",
            "access_level": "public",
            "sha256": hashlib.sha256(MODULE.normalize(doc.read_bytes())).hexdigest(),
            "approval_status": "pending_review",
            "index_enabled": False,
            "source_checked_at": "2026-11-04",
            "version": "draft-1",
        }
        self.manifest = self.root / "manifest.json"
        self.write_manifest()

    def write_manifest(self):
        self.manifest.write_text(json.dumps({"documents": [self.entry]}), encoding="utf-8")

    def test_pending_needs_explicit_demo(self):
        with self.assertRaisesRegex(ValueError, "not approved"):
            MODULE.prepare(self.root, self.manifest)
        chunks = MODULE.prepare(self.root, self.manifest, allow_demo=True)
        self.assertEqual([x["type"] for x in chunks], ["actual_guidance", "simulation"])
        self.assertTrue(chunks[0]["text"].startswith("[실제 안내]"))
        self.assertTrue(chunks[1]["text"].startswith("[가상 설정]"))
        self.assertTrue(all(x["source"] == "출처: example" for x in chunks))

    def test_tampering_is_rejected_even_in_demo(self):
        self.entry["sha256"] = "0" * 64
        self.write_manifest()
        with self.assertRaisesRegex(ValueError, "hash mismatch"):
            MODULE.prepare(self.root, self.manifest, allow_demo=True)

    def test_public_cannot_read_restricted_path(self):
        self.entry["path"] = "knowledge/restricted/example.md"
        self.write_manifest()
        with self.assertRaisesRegex(ValueError, "invalid document path"):
            MODULE.prepare(self.root, self.manifest, allow_demo=True)

    def test_conflict_decision_is_not_labeled_as_real(self):
        path = self.root / self.entry["path"]
        path.write_text(
            "# Example\n\n## Policy\n\n**충돌 판단 — 두바퀴 시연 설정:** example.\n\n출처: example\n",
            encoding="utf-8",
        )
        self.entry["sha256"] = hashlib.sha256(MODULE.normalize(path.read_bytes())).hexdigest()
        self.write_manifest()
        chunks = MODULE.prepare(self.root, self.manifest, allow_demo=True)
        self.assertEqual(chunks[0]["type"], "simulation")

    def test_restricted_mixed_paragraph_stays_simulated(self):
        path = self.root / "knowledge/restricted/example.md"
        path.parent.mkdir(parents=True)
        path.write_text(
            "# Example\n\n## Policy\n\nIntro. **가상 설정:** test.\n",
            encoding="utf-8",
        )
        self.entry["path"] = "knowledge/restricted/example.md"
        self.entry["access_level"] = "restricted"
        self.entry["sha256"] = hashlib.sha256(MODULE.normalize(path.read_bytes())).hexdigest()
        self.write_manifest()
        chunks = MODULE.prepare(self.root, self.manifest, allow_demo=True)
        self.assertTrue(all(c["type"] == "simulation" for c in chunks))

    def test_source_url_is_retained(self):
        path = self.root / self.entry["path"]
        path.write_text(
            "# Example\n\n## Policy\n\nActual notice.\n\n출처: [예시](https://example.org/a)\n",
            encoding="utf-8",
        )
        self.entry["sha256"] = hashlib.sha256(MODULE.normalize(path.read_bytes())).hexdigest()
        self.write_manifest()
        chunks = MODULE.prepare(self.root, self.manifest, allow_demo=True)
        self.assertEqual(chunks[0]["source_url"], "https://example.org/a")

    def test_real_corpus_security_and_restricted_canaries(self):
        chunks = MODULE.prepare(MODULE.ROOT, MODULE.MANIFEST, allow_demo=True)
        safety = [c for c in chunks if c["section"] == "계정 노출·침해 의심 시 공개 초동 안내"]
        self.assertEqual(len(safety), 1)
        self.assertEqual(safety[0]["type"], "actual_guidance")
        self.assertIn("msg_seq=8836", safety[0]["source"])
        for token in ("DUBAKWI-RESTRICTED-CANARY-01", "DUBAKWI-RESTRICTED-CANARY-02"):
            hits = [c for c in chunks if token in c["text"]]
            self.assertEqual(len(hits), 1)
            self.assertEqual(hits[0]["access_level"], "restricted")


if __name__ == "__main__":
    unittest.main()
