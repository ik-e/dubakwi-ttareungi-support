"""Test offline lexical fixtures; this is not an authorization integration test."""

import importlib.util
import unittest
from pathlib import Path

path = Path(__file__).resolve().parents[1] / "dev" / "rag_local_evaluation.py"
spec = importlib.util.spec_from_file_location("rag_local_evaluation", path)
rag = importlib.util.module_from_spec(spec)
spec.loader.exec_module(rag)


class LocalEvaluationTest(unittest.TestCase):
    def setUp(self):
        self.chunks = [
            {
                "chunk_id": "a",
                "title": "대여",
                "section": "방법",
                "text": "QR 대여",
                "access_level": "public",
            },
            {
                "chunk_id": "b",
                "title": "담당자",
                "section": "이관",
                "text": "가상 이관",
                "access_level": "restricted",
            },
        ]

    def test_citizen_filter_and_staff_access(self):
        self.assertEqual(rag.search(self.chunks, "가상 이관", "citizen"), [])
        self.assertEqual(rag.search(self.chunks, "가상 이관", "support")[0]["chunk_id"], "b")
        self.assertEqual(rag.search(self.chunks, "QR 대여", "support")[0]["chunk_id"], "a")

    def test_unknown_role_and_empty_query_fail(self):
        with self.assertRaises(ValueError):
            rag.search(self.chunks, "대여", "admin")
        with self.assertRaises(ValueError):
            rag.search(self.chunks, " ", "citizen")


if __name__ == "__main__":
    unittest.main()
