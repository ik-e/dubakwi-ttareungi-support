import io
import json
import tempfile
import threading
import time
import unittest
import urllib.error
from pathlib import Path
from unittest.mock import Mock, patch

from services.user_api import discord_alerts as alerts


class Response(io.BytesIO):
    status = 200


class DiscordAlertsTest(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.file = Path(self.temp.name) / "alert.json"
        self.config = {
            "webhook_url": "https://discord.com/api/webhooks/123456789012345678/test-token",
            "channel_id": "123456789012345679",
        }
        self.file.write_text(json.dumps(self.config))

    def response(self, channel=None):
        return Response(
            json.dumps({"id": "123", "channel_id": channel or self.config["channel_id"]}).encode()
        )

    def test_message_masks_contact_links_and_mentions(self):
        body = alerts.message_body(
            {
                "ticket_id": "JBYS-2",
                "summary": "@everyone <@123> person@example.test 010-1234-5678 https://example.test/private",
            }
        )
        self.assertEqual({"parse": []}, body["allowed_mentions"])
        for secret in ("person@example.test", "010-1234-5678", "https://", "@everyone", "<@123>"):
            self.assertNotIn(secret, body["content"])
        self.assertIn("JBYS-2", body["content"])
        self.assertLessEqual(len(alerts.message_body({"summary": "가" * 10000})["content"]), 1800)

    def test_url_is_not_caller_controlled_and_redirects_are_blocked(self):
        for url in (
            "http://discord.com/api/webhooks/1/token",
            "https://evil.test/api/webhooks/1/token",
            "https://discord.com/api/webhooks/1/token?x=y",
            "https://" + "user:pass@" + "discord.com/api/webhooks/1/token",
        ):
            self.file.write_text(json.dumps({**self.config, "webhook_url": url}))
            with self.assertRaises(alerts.AlertError):
                alerts.settings(self.file)
        with self.assertRaises(alerts.AlertError):
            alerts.NoRedirect().redirect_request(None)

    def test_success_requires_message_ack_and_sends_once(self):
        opener = Mock()
        opener.open.return_value = self.response()
        alerts.deliver({"ticket_id": "JBYS-3"}, self.file, opener=opener)
        opener.open.assert_called_once()
        request = opener.open.call_args.args[0]
        self.assertTrue(request.full_url.endswith("?wait=true"))
        self.assertEqual({"parse": []}, json.loads(request.data)["allowed_mentions"])

    def test_wrong_channel_ack_is_unknown(self):
        opener = Mock()
        opener.open.return_value = self.response("wrong")
        with self.assertRaises(alerts.AlertError) as caught:
            alerts.deliver({}, self.file, opener=opener)
        self.assertEqual(502, caught.exception.status)
        opener.open.assert_called_once()

    def test_http_rejection_is_not_retried_or_exposed(self):
        opener = Mock()
        opener.open.side_effect = urllib.error.HTTPError(
            self.config["webhook_url"], 403, "private", {}, None
        )
        with self.assertRaises(alerts.AlertError) as caught:
            alerts.deliver({}, self.file, opener=opener)
        self.assertEqual((424, "alert_rejected"), (caught.exception.status, str(caught.exception)))
        opener.open.assert_called_once()

    def test_network_error_does_not_expose_url(self):
        opener = Mock()
        opener.open.side_effect = OSError(self.config["webhook_url"])
        with self.assertRaises(alerts.AlertError) as caught:
            alerts.deliver({}, self.file, opener=opener)
        self.assertEqual("alert_result_unknown", str(caught.exception))

    def test_timeout_returns_unknown_without_second_attempt(self):
        release = threading.Event()
        finished = threading.Event()

        def slow(*args, **kwargs):
            release.wait(1)
            finished.set()
            return self.response()

        opener = Mock()
        opener.open.side_effect = slow
        try:
            with patch.object(alerts, "TIMEOUT", 0.02):
                start = time.monotonic()
                with self.assertRaises(alerts.AlertError) as caught:
                    alerts.deliver({}, self.file, opener=opener)
                self.assertEqual(504, caught.exception.status)
                self.assertLess(time.monotonic() - start, 0.5)
        finally:
            release.set()
            finished.wait(1)
        opener.open.assert_called_once()
