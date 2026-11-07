"""Read-only DB ownership binding + live Jira state; never a mock fallback."""

from __future__ import annotations

import base64
import json
import re
import threading
import time
import urllib.error
import urllib.request
from dataclasses import dataclass
from pathlib import Path
from urllib.parse import quote, urlsplit

from services.user_api.case_context import (
    ContextError,
    select_snapshot,
    validate_issue,
)


class RecordsError(Exception):
    def __init__(self, status: int, code: str):
        super().__init__(code)
        self.status, self.code = status, code


class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        raise RecordsError(503, "lookup_error")


@dataclass(frozen=True)
class Settings:
    scope: str
    jira_base: str
    dsn_file: Path
    auth_file: Path
    authors_file: Path

    @classmethod
    def from_env(cls, env):
        try:
            base = env["DUBAKWI_JIRA_BASE"].rstrip("/")
            url = urlsplit(base)
            if (
                url.scheme != "https"
                or not url.hostname
                or url.username
                or url.password
                or url.path
                or url.query
                or url.fragment
                or url.port not in (None, 443)
                or not re.fullmatch(r"[A-Za-z0-9._:-]+", env["DUBAKWI_SCOPE"])
            ):
                raise ValueError
            return cls(
                env["DUBAKWI_SCOPE"],
                base,
                Path(env["DUBAKWI_DB_DSN_FILE"]),
                Path(env["DUBAKWI_JIRA_AUTH_FILE"]),
                Path(env["DUBAKWI_JIRA_CONTEXT_AUTHORS_FILE"]),
            )
        except (KeyError, ValueError):
            raise RecordsError(503, "lookup_error") from None


class RecordsProvider:
    # Bound lingering read-only DNS/socket work; timed-out requests never queue retries.
    _slots = threading.BoundedSemaphore(4)
    RESPONSE_BUDGET = 1.25

    def __init__(self, settings: Settings, *, binding_reader=None, jira_reader=None):
        self.settings = settings
        self.binding_reader = binding_reader or self.db_binding
        self.jira_reader = jira_reader or self.jira_get

    @staticmethod
    def remaining(deadline):
        value = deadline - time.monotonic()
        if value <= 0:
            raise RecordsError(503, "lookup_error")
        return value

    def db_binding(self, ticket, actor, deadline):
        import psycopg
        from psycopg.types.json import Jsonb

        self.remaining(deadline)
        dsn = self.settings.dsn_file.read_text("utf-8").strip()
        # Secrets stay in libpq input, never command arguments or error output.
        with (
            psycopg.connect(
                dsn,
                connect_timeout=1,
                options="-c default_transaction_read_only=on -c statement_timeout=250",
            ) as conn,
            conn.cursor() as cur,
        ):
            cur.execute(
                "SELECT has_table_privilege(current_user, "
                "'dubakwi_service.request_state', 'INSERT,UPDATE,DELETE,TRUNCATE')"
            )
            if cur.fetchone()[0]:
                raise RecordsError(503, "lookup_error")
            self.remaining(deadline)
            cur.execute(
                "SELECT dubakwi_service.record_lookup(%s::jsonb)",
                (Jsonb({"scope": self.settings.scope, "ticket_key": ticket, "actor_id": actor}),),
            )
            return cur.fetchone()[0]

    def jira_get(self, path, deadline):
        auth = json.loads(self.settings.auth_file.read_text("utf-8"))
        email, token = auth["email"], auth["token"]
        if not isinstance(email, str) or not isinstance(token, str) or not email or not token:
            raise RecordsError(503, "lookup_error")
        header = base64.b64encode((email + ":" + token).encode()).decode()
        req = urllib.request.Request(
            self.settings.jira_base + path,
            headers={"Authorization": "Basic " + header, "Accept": "application/json"},
            method="GET",
        )
        opener = urllib.request.build_opener(NoRedirect())
        with opener.open(req, timeout=min(0.7, self.remaining(deadline))) as response:
            if response.status != 200:
                raise RecordsError(503, "lookup_error")
            data = response.read(1_000_001)
            self.remaining(deadline)
            if len(data) > 1_000_000:
                raise RecordsError(503, "lookup_error")
            return json.loads(data)

    def lookup(self, ticket: str, actor: str) -> dict:
        deadline = time.monotonic() + 1.2
        if not self._slots.acquire(blocking=False):
            raise RecordsError(503, "lookup_error")
        done = threading.Event()
        result = {}

        def read_only():
            try:
                result["value"] = self._lookup(ticket, actor, deadline)
            except RecordsError as error:
                result["error"] = error
            finally:
                self._slots.release()
                done.set()

        worker = threading.Thread(target=read_only, daemon=True)
        try:
            worker.start()
        except RuntimeError:
            self._slots.release()
            raise RecordsError(503, "lookup_error") from None
        if not done.wait(self.RESPONSE_BUDGET):
            # DNS resolution may ignore socket timeouts. Only GET/SELECT work can
            # remain; it is bounded by four slots and cannot mutate Jira or DB.
            raise RecordsError(503, "lookup_error")
        if "error" in result:
            raise result["error"]
        return result["value"]

    def _lookup(self, ticket: str, actor: str, deadline: float) -> dict:
        try:
            if not re.fullmatch(r"JBYS-[0-9]+", ticket):
                raise RecordsError(404, "record_not_found")
            if not actor:
                raise RecordsError(403, "record_access_denied")
            binding = self.binding_reader(ticket, actor, deadline)
            if not isinstance(binding, dict) or binding.get("ok") is not True:
                raise RecordsError(503, "lookup_error")
            if binding.get("found") is not True:
                raise RecordsError(404, "record_not_found")
            if binding.get("owner_match") is not True:
                raise RecordsError(403, "record_access_denied")
            if not isinstance(binding.get("latest_completed_request_id"), str):
                raise RecordsError(503, "lookup_error")
            if binding.get("scope") != self.settings.scope or binding.get("owner_id") != actor:
                raise RecordsError(503, "lookup_error")
            issue = self.jira_reader(
                "/rest/api/2/issue/" + quote(ticket, safe="") + "?fields=status,labels,description",
                deadline,
            )
            validate_issue(issue, binding)
            authors = json.loads(self.settings.authors_file.read_text("utf-8"))
            if (
                not isinstance(authors, list)
                or not authors
                or not all(isinstance(x, str) and x for x in authors)
            ):
                raise RecordsError(503, "lookup_error")
            comments, start, total = [], 0, None
            for _ in range(10):
                page = self.jira_reader(
                    "/rest/api/2/issue/"
                    + quote(ticket, safe="")
                    + f"/comment?startAt={start}&maxResults=100",
                    deadline,
                )
                if (
                    type(page.get("startAt")) is not int
                    or page["startAt"] != start
                    or type(page.get("total")) is not int
                    or page["total"] < 0
                    or not isinstance(page.get("comments"), list)
                    or (total is not None and page["total"] != total)
                ):
                    raise RecordsError(503, "lookup_error")
                total = page["total"]
                comments.extend(page["comments"])
                start = len(comments)
                if start >= total:
                    break
                if not page["comments"]:
                    raise RecordsError(503, "lookup_error")
            if total is None or start != total:
                raise RecordsError(503, "lookup_error")
            snapshot = select_snapshot(
                comments, binding, set(authors), request_id=binding["latest_completed_request_id"]
            )
            status = snapshot["support"]["status"]
            category = issue["fields"]["status"]["statusCategory"]["key"]
            if category == "done":
                status = status if status in {"closed_guidance", "closed_rejected"} else "closed"
            elif category not in {"new", "indeterminate"} or status.startswith("closed_"):
                raise RecordsError(503, "lookup_error")
            self.remaining(deadline)
            return {
                "ticket_id": ticket,
                "case_id": binding["case_id"],
                "owner_id": actor,
                "status": status,
                "summary": snapshot["facts"]["summary"],
                "contact": {},
            }
        except RecordsError:
            raise
        except (ContextError, OSError, ValueError, KeyError, TypeError, urllib.error.URLError):
            raise RecordsError(503, "lookup_error") from None
        except Exception:
            # Driver/runtime errors may contain DSNs or Jira authentication details.
            raise RecordsError(503, "lookup_error") from None
