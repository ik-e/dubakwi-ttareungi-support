"""가져오기용 자리표시자 치환 도구가 안전하게 동작하는지 확인한다."""

import importlib.util
import json
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
SPEC = importlib.util.spec_from_file_location(
    "render_n8n_workflow", ROOT / "scripts" / "dev" / "render_n8n_workflow.py"
)
render_tool = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(render_tool)


class RenderWorkflowTest(unittest.TestCase):
    def test_repository_workflow_has_only_placeholders(self) -> None:
        text = (ROOT / "workflows" / "dubakwi-handoff.json").read_text(encoding="utf-8")
        self.assertIn(render_tool.JIRA_PLACEHOLDER, text)
        self.assertIn(render_tool.MAP_PLACEHOLDER, text)
        self.assertNotIn("atlassian.net", text)

    def test_render_replaces_both_placeholders_and_stays_valid_json(self) -> None:
        text = (ROOT / "workflows" / "dubakwi-handoff.json").read_text(encoding="utf-8")
        rendered = render_tool.render(text, "https://jira.example.test", '{"support":"acct-1"}')
        json.loads(rendered)
        self.assertNotIn(render_tool.JIRA_PLACEHOLDER, rendered)
        self.assertNotIn(render_tool.MAP_PLACEHOLDER, rendered)
        self.assertIn("https://jira.example.test", rendered)
        self.assertIn("acct-1", rendered)

    def test_unsafe_values_are_rejected(self) -> None:
        for base in (
            "http://jira.example.test",
            "https://jira.example.test/path",
            "https://x'; evil",
            "jira.example.test",
        ):
            with self.assertRaises(render_tool.RenderError, msg=base):
                render_tool.validate_jira_base(base)
        for raw in (
            '{"support":"a\'b"}',
            '{"support":"a b"}',
            '{"support":1}',
            "[]",
            "not json",
            '{"bad role":"x"}',
        ):
            with self.assertRaises(render_tool.RenderError, msg=raw):
                render_tool.validate_assignee_map(raw)

    def test_output_must_be_under_ignored_runs_directory(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            with self.assertRaises(render_tool.RenderError):
                render_tool.ensure_untracked_output(Path(tmp) / "out.json")
        with self.assertRaises(render_tool.RenderError):
            render_tool.ensure_untracked_output(ROOT / "runs" / "public" / "x" / "out.json")
        with self.assertRaises(render_tool.RenderError):
            render_tool.ensure_untracked_output(ROOT / "workflows" / "out.json")
        render_tool.ensure_untracked_output(ROOT / "runs" / "private-render" / "out.json")

    def test_scope_replaces_only_the_assignment(self) -> None:
        text = (
            "const importedScope = '__DUBAKWI_SCOPE__';\n"
            "const envScope = readEnvScope() || (importedScope !== '__DUBAKWI_SCOPE__' ? importedScope : '');"
        )
        rendered = render_tool.render(text, None, None, "dubakwi-dev")
        self.assertIn("const importedScope = 'dubakwi-dev';", rendered)
        self.assertIn("importedScope !== '__DUBAKWI_SCOPE__'", rendered)
        with self.assertRaises(render_tool.RenderError):
            render_tool.render("no assignment here", None, None, "dubakwi-dev")
        for bad in ("a b", "x'; evil", ""):
            with self.assertRaises(render_tool.RenderError, msg=bad):
                render_tool.validate_scope(bad)


if __name__ == "__main__":
    unittest.main()
