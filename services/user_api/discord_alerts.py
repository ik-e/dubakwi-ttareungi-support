"""Optional private Discord egress for the isolated UX API, without URL-bearing node data."""

from __future__ import annotations

import json
import queue
import re
import threading
import urllib.error
import urllib.request
from pathlib import Path
from urllib.parse import urlsplit

_SLOTS = threading.BoundedSemaphore(4)
TIMEOUT = 1.5


class AlertError(Exception):
    def __init__(self, status: int, code: str):
        super().__init__(code)
        self.status, self.code = status, code


class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, *args, **kwargs):
        raise AlertError(502, "alert_result_unknown")


def safe_text(value: object, limit: int = 240) -> str:
    text = str(value or "")
    text = re.sub(r"https?://\S+", "[링크 생략]", text)
    text = re.sub(r"[\w.+-]+@[\w.-]+\.[\w.-]+", "[연락처 가림]", text)
    text = re.sub(r"\b0\d{1,2}[-. ]?\d{3,4}[-. ]?\d{4}\b", "[연락처 가림]", text)
    text = re.sub(r"[\x00-\x1f\x7f]", " ", text)
    return text.replace("@", "@\u200b")[:limit]


def message_body(payload: dict) -> dict:
    if not isinstance(payload, dict):
        raise AlertError(400, "invalid_alert")
    ticket = payload.get("ticket_id") or payload.get("known_ticket_id")
    ticket = (
        ticket if isinstance(ticket, str) and re.fullmatch(r"JBYS-[1-9]\d*", ticket) else "미확인"
    )
    lines = ["[두바퀴 UX 담당 알림]", f"접수번호: {ticket}"]
    for label, key in (
        ("담당 역할", "role"),
        ("우선순위", "priority"),
        ("요약", "summary"),
        ("상태", "message"),
        ("사유", "reason"),
    ):
        if payload.get(key):
            lines.append(f"{label}: {safe_text(payload[key])}")
    return {"content": "\n".join(lines)[:1800], "allowed_mentions": {"parse": []}}


def settings(secret_file: Path) -> dict:
    try:
        config = json.loads(secret_file.read_text("utf-8"))
        url = urlsplit(config["webhook_url"])
        if (
            url.scheme != "https"
            or url.hostname not in ("discord.com", "discordapp.com")
            or url.username
            or url.password
            or url.port not in (None, 443)
            or url.query
            or url.fragment
            or not re.fullmatch(r"/api(?:/v\d+)?/webhooks/\d+/[A-Za-z0-9_.-]+", url.path)
            or not re.fullmatch(r"\d{17,20}", config["channel_id"])
        ):
            raise ValueError
        return config
    except (OSError, ValueError, KeyError, TypeError):
        raise AlertError(503, "alert_not_ready") from None


def deliver(payload: dict, secret_file: Path, *, opener=None) -> None:
    """One attempt, bounded response time; uncertain effects are never retried here."""
    config = settings(secret_file)
    body = json.dumps(message_body(payload), ensure_ascii=False).encode()
    if not _SLOTS.acquire(blocking=False):
        raise AlertError(503, "alert_busy")
    output: queue.Queue = queue.Queue(maxsize=1)

    def send():
        result = None
        try:
            request = urllib.request.Request(
                config["webhook_url"] + "?wait=true",
                data=body,
                headers={"Content-Type": "application/json", "User-Agent": "dubakwi-ux/1"},
                method="POST",
            )
            client = opener or urllib.request.build_opener(NoRedirect())
            with client.open(request, timeout=TIMEOUT) as response:
                raw = response.read(65537)
                if response.status != 200 or len(raw) > 65536:
                    raise AlertError(502, "alert_result_unknown")
                ack = json.loads(raw)
                if not ack.get("id") or ack.get("channel_id") != config["channel_id"]:
                    raise AlertError(502, "alert_result_unknown")
        except urllib.error.HTTPError as exc:
            result = AlertError(
                424 if 400 <= exc.code < 500 else 503,
                "alert_rejected" if 400 <= exc.code < 500 else "alert_result_unknown",
            )
        except AlertError as exc:
            result = exc
        except Exception:
            result = AlertError(503, "alert_result_unknown")
        finally:
            output.put(result)
            _SLOTS.release()

    threading.Thread(target=send, daemon=True).start()
    try:
        result = output.get(timeout=TIMEOUT)
    except queue.Empty:
        raise AlertError(504, "alert_result_unknown") from None
    if result:
        raise result
