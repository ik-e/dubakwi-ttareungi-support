import os
import tempfile
import unittest
from pathlib import Path
from unittest import mock

from services.discord_bot.adapter import (
    ContractError,
    build_support_request,
    render_private_response,
)
from services.discord_bot.bot import Settings


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


if __name__ == "__main__":
    unittest.main()
