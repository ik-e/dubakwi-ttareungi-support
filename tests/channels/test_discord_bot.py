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
    ContractError,
    build_support_request,
    failure_message,
    render_private_response,
)
from services.discord_bot.bot import Settings, SupportError, _post_support


class DiscordAdapterTest(unittest.TestCase):
    def test_builds_stable_request_from_interaction(self) -> None:
        request = build_support_request(
            interaction_id=1234,
            discord_user_id=5678,
            question="  대여소 문의  ",
            case_ref=" CASE-1 ",
        )
        self.assertEqual(
            request.as_dict(),
            {
                "request_id": "dc-1234",
                "user": "5678",
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
                        discord_user_id=2,
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
            }
            with mock.patch.dict(os.environ, environment, clear=True):
                settings = Settings.from_environment()

        self.assertEqual(settings.bot_token, "bot-secret")
        self.assertEqual(settings.team_key, "team-secret")
        self.assertEqual(settings.allowed_guild_id, 123)
        self.assertEqual(settings.allowed_channel_id, 456)


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


if __name__ == "__main__":
    unittest.main()
