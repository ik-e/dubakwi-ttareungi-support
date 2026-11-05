from __future__ import annotations

import hmac
import json
import os
from http import HTTPStatus
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import parse_qs, unquote, urlparse

ROOT = Path(__file__).resolve().parents[2]
USERS_FILE = Path(os.environ.get("DUBAKWI_USERS_FILE", ROOT / "data" / "users.json"))
RECORDS_FILE = Path(os.environ.get("DUBAKWI_RECORDS_FILE", ROOT / "data" / "records.json"))
KEY_FILE = os.environ.get("DUBAKWI_INTERNAL_KEY_FILE")


def load_items(path: Path, key: str) -> dict[str, dict]:
    payload = json.loads(path.read_text(encoding="utf-8"))
    items = payload.get(key)
    if not isinstance(items, list):
        raise ValueError(f"{path} does not contain a {key} list")
    identity = "id" if key == "users" else "ticket_id"
    return {str(item[identity]): item for item in items}


def internal_key() -> str:
    if not KEY_FILE:
        return ""
    return Path(KEY_FILE).read_text(encoding="utf-8").strip()


def masked_contact(contact: dict) -> dict:
    result: dict[str, str] = {}
    phone = contact.get("phone")
    email = contact.get("email")
    if isinstance(phone, str) and len(phone) >= 4:
        result["phone"] = f"***-****-{phone[-4:]}"
    if isinstance(email, str) and "@" in email:
        local, domain = email.split("@", 1)
        result["email"] = f"{local[:1]}***@{domain}"
    return result


def safe_log_path(request_target: str) -> str:
    """Return a stable route label without user, ticket, or query identifiers."""
    path = urlparse(request_target).path
    if path.startswith("/employees/"):
        return "/employees/:user_id"
    if path.startswith("/records/"):
        return "/records/:ticket_id"
    if path == "/healthz":
        return "/healthz"
    return "/unknown"


class Handler(BaseHTTPRequestHandler):
    server_version = "dubakwi-user-api/1"

    def log_message(self, format: str, *args: object) -> None:
        # Do not put user identifiers or query strings in shared container logs.
        print(f'{self.address_string()} - "{self.command} {safe_log_path(self.path)}"')

    def send_json(self, status: HTTPStatus, payload: dict) -> None:
        body = json.dumps(payload, ensure_ascii=False, separators=(",", ":")).encode()
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def authenticated(self) -> bool:
        expected = internal_key()
        supplied = self.headers.get("X-Internal-Key", "")
        return bool(expected) and hmac.compare_digest(expected, supplied)

    def do_GET(self) -> None:  # noqa: N802
        parsed = urlparse(self.path)
        if parsed.path == "/healthz":
            self.send_json(HTTPStatus.OK, {"ok": True})
            return
        if not self.authenticated():
            self.send_json(HTTPStatus.UNAUTHORIZED, {"error": "unauthorized"})
            return

        if parsed.path.startswith("/employees/"):
            user_id = unquote(parsed.path.removeprefix("/employees/"))
            user = load_items(USERS_FILE, "users").get(user_id)
            if user is None:
                self.send_json(HTTPStatus.NOT_FOUND, {"error": "unknown_user"})
                return
            self.send_json(
                HTTPStatus.OK,
                {
                    "id": user["id"],
                    "role": user["role"],
                    "access_levels": user["access_levels"],
                },
            )
            return

        if parsed.path.startswith("/records/"):
            ticket_id = unquote(parsed.path.removeprefix("/records/"))
            requester = parse_qs(parsed.query).get("requester", [""])[0]
            record = load_items(RECORDS_FILE, "records").get(ticket_id)
            if record is None:
                self.send_json(HTTPStatus.NOT_FOUND, {"error": "record_not_found"})
                return
            if not requester or record["owner_id"] != requester:
                self.send_json(HTTPStatus.FORBIDDEN, {"error": "record_access_denied"})
                return
            self.send_json(
                HTTPStatus.OK,
                {
                    "ticket_id": record["ticket_id"],
                    "case_id": record["case_id"],
                    "owner_id": record["owner_id"],
                    "status": record["status"],
                    "summary": record["summary"],
                    "contact": masked_contact(record.get("contact", {})),
                },
            )
            return

        self.send_json(HTTPStatus.NOT_FOUND, {"error": "not_found"})


def main() -> None:
    host = os.environ.get("DUBAKWI_USER_API_HOST", "0.0.0.0")
    port = int(os.environ.get("DUBAKWI_USER_API_PORT", "8801"))
    ThreadingHTTPServer((host, port), Handler).serve_forever()


if __name__ == "__main__":
    main()
