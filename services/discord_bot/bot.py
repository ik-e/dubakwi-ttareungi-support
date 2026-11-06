"""Discord slash-command adapter that calls the existing n8n support webhook."""

from __future__ import annotations

import asyncio
import json
import logging
import os
import urllib.error
import urllib.request
from dataclasses import dataclass, field

import discord
from discord import app_commands

from services.discord_bot.adapter import (
    UNREGISTERED_MESSAGE,
    ContractError,
    build_support_request,
    failure_message,
    parse_user_map,
    render_private_response,
)

LOGGER = logging.getLogger("dubakwi.discord")


@dataclass(frozen=True)
class Settings:
    bot_token: str
    support_webhook_url: str
    team_key: str
    allowed_guild_id: int
    user_map: dict[str, str] = field(default_factory=dict, repr=False)
    allowed_channel_id: int | None = None
    # Support answers within its 20 s deadline; wait 5 s longer so a late reply is not cut off.
    timeout_seconds: float = 25.0

    @classmethod
    def from_environment(cls) -> Settings:
        def secret(name: str) -> str:
            direct = os.getenv(name, "")
            secret_file = os.getenv(f"{name}_FILE", "")
            if direct and secret_file:
                raise RuntimeError(f"Set only one of {name} or {name}_FILE")
            if secret_file:
                try:
                    with open(secret_file, encoding="utf-8") as handle:
                        return handle.read().strip()
                except OSError as exc:
                    raise RuntimeError(f"Cannot read {name}_FILE") from exc
            return direct

        required = {
            "DUBAKWI_DISCORD_BOT_TOKEN": secret("DUBAKWI_DISCORD_BOT_TOKEN"),
            "DUBAKWI_SUPPORT_WEBHOOK_URL": os.getenv("DUBAKWI_SUPPORT_WEBHOOK_URL", ""),
            "DUBAKWI_TEAM_KEY": secret("DUBAKWI_TEAM_KEY"),
            "DUBAKWI_DISCORD_GUILD_ID": os.getenv("DUBAKWI_DISCORD_GUILD_ID", ""),
        }
        missing = [name for name, value in required.items() if not value]
        if missing:
            raise RuntimeError(f"Missing required settings: {', '.join(missing)}")
        try:
            guild_id = int(required["DUBAKWI_DISCORD_GUILD_ID"])
        except ValueError as exc:
            raise RuntimeError("DUBAKWI_DISCORD_GUILD_ID must be an integer") from exc
        channel_value = os.getenv("DUBAKWI_DISCORD_CHANNEL_ID", "")
        try:
            channel_id = int(channel_value) if channel_value else None
        except ValueError as exc:
            raise RuntimeError("DUBAKWI_DISCORD_CHANNEL_ID must be an integer") from exc
        try:
            user_map = parse_user_map(os.getenv("DUBAKWI_DISCORD_USER_MAP", ""))
        except ContractError as exc:
            raise RuntimeError(str(exc)) from exc
        return cls(
            user_map=user_map,
            bot_token=required["DUBAKWI_DISCORD_BOT_TOKEN"],
            support_webhook_url=required["DUBAKWI_SUPPORT_WEBHOOK_URL"],
            team_key=required["DUBAKWI_TEAM_KEY"],
            allowed_guild_id=guild_id,
            allowed_channel_id=channel_id,
        )


class SupportError(RuntimeError):
    """HTTP error from support; carries only status and codes, never the body."""

    def __init__(self, status: int, codes: list[str]) -> None:
        super().__init__(f"support webhook returned HTTP {status}")
        self.status = status
        self.codes = codes


def _read_codes(error: urllib.error.HTTPError) -> list[str]:
    try:
        body = json.loads(error.read().decode("utf-8"))
    except (OSError, ValueError):
        return []
    codes = body.get("codes") if isinstance(body, dict) else None
    if not isinstance(codes, list):
        return []
    return [code for code in codes if isinstance(code, str)]


def _post_support(settings: Settings, body: dict[str, str]) -> dict[str, object]:
    request = urllib.request.Request(
        settings.support_webhook_url,
        data=json.dumps(body).encode("utf-8"),
        headers={"Content-Type": "application/json", "X-Team-Key": settings.team_key},
        method="POST",
    )
    try:
        with urllib.request.urlopen(request, timeout=settings.timeout_seconds) as response:
            result = json.loads(response.read().decode("utf-8"))
    except urllib.error.HTTPError as exc:
        raise SupportError(exc.code, _read_codes(exc)) from exc
    except (urllib.error.URLError, TimeoutError, json.JSONDecodeError) as exc:
        raise RuntimeError("support webhook failed") from exc
    if not isinstance(result, dict):
        raise RuntimeError("support webhook returned a non-object response")
    return result


async def run_support(settings: Settings, body: dict[str, str]) -> str:
    """Call support and return the private message; logs only request_id/status/codes."""
    request_id = body.get("request_id", "")
    try:
        payload = await asyncio.to_thread(_post_support, settings, body)
        return render_private_response(payload)
    except SupportError as exc:
        LOGGER.warning(
            "Discord support request failed request_id=%s status=%s codes=%s",
            request_id,
            exc.status,
            ",".join(exc.codes),
        )
        return failure_message(exc.codes)
    except (RuntimeError, ContractError):
        LOGGER.warning("Discord support request failed request_id=%s", request_id)
        return failure_message(None)


class DubakwiBot(discord.Client):
    def __init__(self, settings: Settings) -> None:
        super().__init__(intents=discord.Intents.none())
        self.settings = settings
        self.tree = app_commands.CommandTree(self)

    async def setup_hook(self) -> None:
        guild = discord.Object(id=self.settings.allowed_guild_id)
        self.tree.copy_global_to(guild=guild)
        await self.tree.sync(guild=guild)


def create_bot(settings: Settings) -> DubakwiBot:
    bot = DubakwiBot(settings)

    @bot.tree.command(name="문의", description="따릉이 문의를 접수합니다")
    @app_commands.describe(내용="문의 내용(500자 이하)", case_ref="기존 문의 연결값(선택)")
    async def support(
        interaction: discord.Interaction, 내용: str, case_ref: str | None = None
    ) -> None:
        if interaction.guild_id != settings.allowed_guild_id:
            await interaction.response.send_message("허용되지 않은 서버입니다.", ephemeral=True)
            return
        if settings.allowed_channel_id and interaction.channel_id != settings.allowed_channel_id:
            await interaction.response.send_message(
                "이 채널에서는 문의를 받을 수 없습니다.", ephemeral=True
            )
            return
        registered_user = settings.user_map.get(str(interaction.user.id))
        if registered_user is None:
            LOGGER.warning("Discord request rejected: unregistered account")
            await interaction.response.send_message(UNREGISTERED_MESSAGE, ephemeral=True)
            return
        try:
            request = build_support_request(
                interaction_id=interaction.id,
                user=registered_user,
                question=내용,
                case_ref=case_ref,
            )
        except ContractError as exc:
            await interaction.response.send_message(str(exc), ephemeral=True)
            return

        await interaction.response.defer(ephemeral=True, thinking=True)
        message = await run_support(settings, request.as_dict())
        await interaction.followup.send(message, ephemeral=True)

    return bot


def main() -> None:
    logging.basicConfig(level=logging.INFO, format="%(levelname)s %(name)s %(message)s")
    settings = Settings.from_environment()
    create_bot(settings).run(settings.bot_token, log_handler=None)


if __name__ == "__main__":
    main()
