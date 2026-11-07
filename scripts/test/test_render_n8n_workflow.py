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
    def test_private_alert_origin_changes_only_delivery_configuration(self):
        for kind, target_prefix in (("handoff", "H11 "), ("support", "X04 "), ("errors", "E09 ")):
            source = (ROOT / "workflows" / f"dubakwi-{kind}.json").read_text("utf-8")
            original = json.loads(source)
            rendered = json.loads(
                render_tool.configure_alert_api(source, "http://ux-api:8801", "internal-test")
            )
            self.assertEqual(original["connections"], rendered["connections"])
            self.assertEqual(len(original["nodes"]), len(rendered["nodes"]))
            target = next(n for n in rendered["nodes"] if n["name"].startswith(target_prefix))
            self.assertEqual("http://ux-api:8801/alerts", target["parameters"]["url"])
            self.assertEqual("internal-test", target["credentials"]["httpHeaderAuth"]["id"])
            self.assertNotIn("http://data-api:8800/alerts", json.dumps(rendered))

    def test_alert_render_rejects_external_secret_or_unknown_layout(self):
        text = (ROOT / "workflows/dubakwi-handoff.json").read_text("utf-8")
        for origin in (
            "https://discord.com/api/webhooks/1/token",
            "http://ux-api/path",
            "http://" + "user:pass@" + "ux-api",
        ):
            with self.assertRaises(render_tool.RenderError):
                render_tool.configure_alert_api(text, origin, "internal-test")
        with self.assertRaises(render_tool.RenderError):
            render_tool.configure_alert_api('{"nodes": []}', "http://ux-api", "internal-test")

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

    def test_issue_type_override_only_changes_creation_node(self) -> None:
        text = (ROOT / "workflows" / "dubakwi-handoff.json").read_text(encoding="utf-8")
        self.assertEqual(render_tool.render(text, None, None), text)
        original = json.loads(text)
        rendered = json.loads(render_tool.render(text, None, None, jira_issue_type_id="10003"))
        changed = [
            (before, after)
            for before, after in zip(original["nodes"], rendered["nodes"], strict=True)
            if before != after
        ]
        self.assertEqual(len(changed), 1)
        before, after = changed[0]
        self.assertTrue(before["name"].startswith("H24 "))
        self.assertIn("issuetype:{id:'10006'}", before["parameters"]["jsCode"])
        self.assertIn("issuetype:{id:'10003'}", after["parameters"]["jsCode"])
        after["parameters"]["jsCode"] = before["parameters"]["jsCode"]
        self.assertEqual(rendered, original)

    def test_issue_type_override_fails_closed_for_bad_ids_or_source(self) -> None:
        text = (ROOT / "workflows" / "dubakwi-handoff.json").read_text(encoding="utf-8")
        for value in ("", "0", "-1", "01", "10003';evil", "a", "1" * 21):
            with self.subTest(value=value), self.assertRaises(render_tool.RenderError):
                render_tool.render(text, None, None, jira_issue_type_id=value)
        for source in (
            '{"nodes":[]}',
            text.replace("issuetype:{id:'10006'}", "issuetype:{name:'Task'}"),
        ):
            with self.assertRaises(render_tool.RenderError):
                render_tool.render(source, None, None, jira_issue_type_id="10003")

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
