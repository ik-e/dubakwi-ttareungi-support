import io
import json
import os
import tempfile
import unittest
import urllib.error
from pathlib import Path
from unittest import mock

from services.discord_bot.adapter import (
    GENERIC_FAILURE_MESSAGE,
    MAX_MESSAGE_LENGTH,
    ContractError,
    build_support_request,
    failure_message,
    parse_user_map,
    render_private_response,
)
from services.discord_bot.bot import Settings, SupportError, _post_support, run_support


class DiscordAdapterTest(unittest.TestCase):
    def test_builds_stable_request_from_interaction(self) -> None:
        request = build_support_request(
            interaction_id=1234,
            user="citizen-a",
            question="  대여소 문의  ",
            case_ref=" CASE-1 ",
        )
        self.assertEqual(
            request.as_dict(),
            {
                "request_id": "dc-1234",
                "user": "citizen-a",
                "question": "대여소 문의",
                "channel": "discord",
                "case_ref": "CASE-1",
            },
        )

    def test_rejects_empty_and_long_questions(self) -> None:
        for question in ("   ", "가" * 501):
            with self.subTest(question_length=len(question)):
                with self.assertRaises(ContractError):
                    build_support_request(
                        interaction_id=1,
                        user="citizen-a",
                        question=question,
                        case_ref=None,
                    )

    def test_renders_only_allowed_response_fields(self) -> None:
        result = render_private_response(
            {
                "answer": "확인했습니다.",
                "case_ref": "CASE-1",
                "ticket_id": "JBYS-10",
                "raw_error": "must-not-leak",
                "context": {"secret": True},
            }
        )
        self.assertEqual(
            result,
            "확인했습니다.\n\n문의 연결값: CASE-1\n\nJira 접수번호: JBYS-10",
        )
        self.assertNotIn("must-not-leak", result)

    def test_settings_read_secret_files(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            bot_token = Path(directory, "bot-token")
            team_key = Path(directory, "team-key")
            bot_token.write_text("bot-secret\n", encoding="utf-8")
            team_key.write_text("team-secret\n", encoding="utf-8")
            environment = {
                "DUBAKWI_DISCORD_BOT_TOKEN_FILE": str(bot_token),
                "DUBAKWI_TEAM_KEY_FILE": str(team_key),
                "DUBAKWI_SUPPORT_WEBHOOK_URL": ("http://n8n:5678/webhook/dubakwi-support"),
                "DUBAKWI_DISCORD_GUILD_ID": "123",
                "DUBAKWI_DISCORD_CHANNEL_ID": "456",
                "DUBAKWI_DISCORD_USER_MAP": "1234567890:citizen-a,2345678901:citizen-b",
            }
            with mock.patch.dict(os.environ, environment, clear=True):
                settings = Settings.from_environment()

        self.assertEqual(settings.bot_token, "bot-secret")
        self.assertEqual(settings.team_key, "team-secret")
        self.assertEqual(settings.allowed_guild_id, 123)
        self.assertEqual(settings.allowed_channel_id, 456)
        self.assertEqual(settings.user_map, {"1234567890": "citizen-a", "2345678901": "citizen-b"})
        self.assertNotIn("citizen-a", repr(settings))

    def test_settings_reject_missing_or_malformed_user_map(self) -> None:
        base = {
            "DUBAKWI_DISCORD_BOT_TOKEN": "b",
            "DUBAKWI_TEAM_KEY": "k",
            "DUBAKWI_SUPPORT_WEBHOOK_URL": "http://n8n/x",
            "DUBAKWI_DISCORD_GUILD_ID": "1",
        }
        for value in (
            None,
            "",
            "abc",
            "12345:",
            ":citizen-a",
            "12345:a,,",
            "12345:a,12345:b",
            "1:a",
        ):
            with self.subTest(value=value):
                env = dict(base)
                if value is not None:
                    env["DUBAKWI_DISCORD_USER_MAP"] = value
                with mock.patch.dict(os.environ, env, clear=True):
                    with self.assertRaises(RuntimeError) as ctx:
                        Settings.from_environment()
                self.assertNotIn("citizen", str(ctx.exception))

    def test_user_map_lookup_and_unregistered(self) -> None:
        mapping = parse_user_map("1234567890:citizen-a")
        self.assertEqual(mapping.get("1234567890"), "citizen-a")
        self.assertIsNone(mapping.get("9999999999"))

    def test_same_interaction_reuses_same_request(self) -> None:
        args = {"interaction_id": 77, "user": "citizen-a", "question": "q", "case_ref": None}
        self.assertEqual(
            build_support_request(**args).as_dict(), build_support_request(**args).as_dict()
        )
        self.assertEqual(build_support_request(**args).request_id, "dc-77")

    def test_long_answer_trimmed_but_case_and_ticket_kept(self) -> None:
        result = render_private_response(
            {"answer": "가" * 5000, "case_ref": "CASE-1", "ticket_id": "JBYS-10"}
        )
        self.assertLessEqual(len(result), MAX_MESSAGE_LENGTH)
        self.assertTrue(result.endswith("문의 연결값: CASE-1\n\nJira 접수번호: JBYS-10"))


class SourceDisplayTest(unittest.TestCase):
    def test_shows_doc_and_section_only(self) -> None:
        result = render_private_response(
            {
                "answer": "안내합니다.",
                "sources": [
                    {
                        "doc": "rental-guide",
                        "section": "QR 인식 또는 잠금 해제가 어려운 경우",
                        "score": 0.91,
                    },
                    {"doc": "faq", "section": "", "chunk_id": "must-not-show"},
                    "not-an-object",
                ],
                "ticket": None,
            }
        )
        self.assertIn("근거:\n- rental-guide / QR 인식 또는 잠금 해제가 어려운 경우\n- faq", result)
        self.assertNotIn("0.91", result)
        self.assertNotIn("must-not-show", result)

    def test_sources_and_reason_survive_long_answer(self) -> None:
        result = render_private_response(
            {
                "answer": "가" * 5000,
                "sources": [{"doc": "rental-guide", "section": "QR"}],
                "reason": "근거 부족으로 담당자에게 이관했습니다.",
                "case_ref": "CASE-1",
                "ticket": {"ticket_id": "JBYS-12"},
            }
        )
        self.assertLessEqual(len(result), MAX_MESSAGE_LENGTH)
        for text in ("- rental-guide / QR", "안내: 근거 부족", "CASE-1", "JBYS-12"):
            self.assertIn(text, result)

    def test_at_most_five_sources_and_no_empty_section(self) -> None:
        sources = [{"doc": f"d{i}", "section": f"s{i}"} for i in range(9)]
        result = render_private_response({"answer": "a", "sources": sources})
        self.assertEqual(5, result.count("\n- d"))
        self.assertNotIn("근거:", render_private_response({"answer": "a", "sources": []}))


class SupportResponseShapeTest(unittest.TestCase):
    def test_reads_ticket_id_from_nested_ticket_object(self) -> None:
        result = render_private_response(
            {
                "answer": "접수했습니다.",
                "case_ref": "CASE-1",
                "ticket": {"ticket_id": "JBYS-11", "priority": "high", "duplicate": False},
            }
        )
        self.assertTrue(result.endswith("문의 연결값: CASE-1\n\nJira 접수번호: JBYS-11"))

    def test_null_ticket_shows_no_ticket_line(self) -> None:
        result = render_private_response({"answer": "안내입니다.", "ticket": None})
        self.assertEqual(result, "안내입니다.")

    def test_nested_ticket_wins_over_flat_value(self) -> None:
        result = render_private_response(
            {"answer": "a", "ticket": {"ticket_id": "JBYS-1"}, "ticket_id": "OLD-9"}
        )
        self.assertIn("JBYS-1", result)
        self.assertNotIn("OLD-9", result)

    def test_default_wait_covers_support_deadline(self) -> None:
        self.assertEqual(
            25.0,
            Settings(
                bot_token="t",
                support_webhook_url="http://n8n:5678/webhook/dubakwi-support",
                team_key="k",
                allowed_guild_id=1,
            ).timeout_seconds,
        )


def _settings() -> Settings:
    return Settings(
        bot_token="t",
        support_webhook_url="http://n8n:5678/webhook/dubakwi-support",
        team_key="k",
        allowed_guild_id=1,
    )


def _http_error(status: int, body: bytes) -> urllib.error.HTTPError:
    return urllib.error.HTTPError("http://x", status, "err", {}, io.BytesIO(body))


class FailureMessageTest(unittest.TestCase):
    def test_409_codes_map_to_private_notices(self) -> None:
        expected = {
            "request_in_progress": "같은 요청을 처리하고 있습니다",
            "request_requires_review": "처리 결과 확인이 필요하며",
            "request_conflict": "새 문의로 다시 보내 주세요",
            "case_busy": "이전 요청이 처리 중이거나 확인 중",
        }
        for code, fragment in expected.items():
            with self.subTest(code=code):
                body = json.dumps({"error": "x", "codes": [code]}).encode()
                with mock.patch("urllib.request.urlopen", side_effect=_http_error(409, body)):
                    with self.assertRaises(SupportError) as ctx:
                        _post_support(_settings(), {})
                message = failure_message(ctx.exception.codes)
                self.assertIn(fragment, message)
                self.assertNotIn("같은 문의 연결값으로", message)
        self.assertNotIn("다시 시도", failure_message(["request_requires_review"]))

    def test_unknown_code_5xx_and_network_use_generic(self) -> None:
        for codes in (["mystery"], [], None):
            self.assertEqual(failure_message(codes), GENERIC_FAILURE_MESSAGE)
        with mock.patch("urllib.request.urlopen", side_effect=_http_error(500, b"<html>")):
            with self.assertRaises(SupportError) as ctx:
                _post_support(_settings(), {})
        self.assertEqual(ctx.exception.codes, [])
        with mock.patch("urllib.request.urlopen", side_effect=urllib.error.URLError("down")):
            with self.assertRaises(RuntimeError) as ctx2:
                _post_support(_settings(), {})
        self.assertNotIsInstance(ctx2.exception, SupportError)
        self.assertNotIn("연결값으로", GENERIC_FAILURE_MESSAGE)

    def test_error_does_not_carry_body(self) -> None:
        body = json.dumps({"error": "secret-detail", "codes": ["case_busy"]}).encode()
        with mock.patch("urllib.request.urlopen", side_effect=_http_error(409, body)):
            with self.assertRaises(SupportError) as ctx:
                _post_support(_settings(), {})
        self.assertNotIn("secret-detail", str(ctx.exception))


class RunSupportLogTest(unittest.IsolatedAsyncioTestCase):
    async def test_logs_exclude_question_and_user(self) -> None:
        body = {
            "request_id": "dc-9",
            "user": "citizen-a",
            "question": "비밀질문",
            "channel": "discord",
        }
        err = _http_error(409, json.dumps({"codes": ["case_busy"], "error": "leak"}).encode())
        with mock.patch("urllib.request.urlopen", side_effect=err):
            with self.assertLogs("dubakwi.discord", level="WARNING") as logs:
                message = await run_support(_settings(), body)
        text = "\n".join(logs.output)
        self.assertIn("dc-9", text)
        for forbidden in ("비밀질문", "citizen-a", "leak"):
            self.assertNotIn(forbidden, text)
        self.assertIn("처리 중이거나 확인 중", message)


if __name__ == "__main__":
    unittest.main()
