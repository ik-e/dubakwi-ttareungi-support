"""Read-only validation of service-authored Jira case snapshots.

Jira comments are the facts source; DB binding and latest completed request select
which snapshot may be restored. A comment revision is not a Jira CAS version.
"""

from __future__ import annotations

import hashlib
import json
import math
import re

MARKER = "[dubakwi-case-context:v1]"
PHASES = {"wait", "handoff", "close", "followup", "save"}
STATUSES = {"received", "waiting_info", "handed_off", "closed_guidance", "closed_rejected"}
BINDING_KEYS = ("scope", "case_id", "owner_id", "first_request_id", "ticket_key")
CONTACT = re.compile(r"\b0\d{1,2}[-. ]?\d{3,4}[-. ]?\d{4}\b|[\w.+-]+@[\w-]+\.[\w.-]+")


class ContextError(ValueError):
    """Only a stable code is exposed; never echo a Jira body or identifier."""


def compact(value: object, *, sort_keys: bool = False) -> str:
    return json.dumps(value, ensure_ascii=False, separators=(",", ":"), sort_keys=sort_keys)


def digest(value: object) -> str:
    return hashlib.sha256(compact(value).encode("utf-8")).hexdigest()


def case_label(binding: dict) -> str:
    return "dubakwi-" + digest([binding[k] for k in ("scope", "owner_id", "first_request_id")])[:40]


def event_id(snapshot: dict) -> str:
    return digest([snapshot[k] for k in ("scope", "case_id", "request_id", "phase")])


def jira_text(value: object) -> str:
    if isinstance(value, str):
        return value
    if not isinstance(value, dict):
        raise ContextError("context_invalid")
    if value.get("type") == "text":
        if not isinstance(value.get("text"), str):
            raise ContextError("context_invalid")
        return value["text"]
    if value.get("type") == "hardBreak":
        return "\n"
    if value.get("type") not in {
        "doc",
        "paragraph",
        "codeBlock",
        "bulletList",
        "orderedList",
        "listItem",
    } or not isinstance(value.get("content", []), list):
        raise ContextError("context_invalid")
    separator = "\n" if value["type"] in {"doc", "bulletList", "orderedList", "listItem"} else ""
    return separator.join(jira_text(v) for v in value.get("content", []))


def validate_facts(facts: object) -> None:
    if not isinstance(facts, dict) or not isinstance(facts.get("summary"), str):
        raise ContextError("context_invalid")
    for key in ("reported", "confirmed"):
        if not isinstance(facts.get(key), list):
            raise ContextError("context_invalid")
        for fact in facts[key]:
            if (
                not isinstance(fact, dict)
                or not isinstance(fact.get("key"), str)
                or not fact["key"]
                or not isinstance(fact.get("value"), str)
                or fact.get("origin") not in {"user", "document", "api"}
                or (key == "confirmed" and fact.get("origin") == "user")
                or ("reference" in fact and not isinstance(fact["reference"], str))
            ):
                raise ContextError("context_invalid")
    for key in ("attempted_actions", "missing", "uncertainties"):
        if not isinstance(facts.get(key), list) or not all(isinstance(x, str) for x in facts[key]):
            raise ContextError("context_invalid")
    if not isinstance(facts.get("evidence_refs"), list):
        raise ContextError("context_invalid")
    for source in facts["evidence_refs"]:
        if (
            not isinstance(source, dict)
            or not isinstance(source.get("doc"), str)
            or not source["doc"]
            or not isinstance(source.get("section"), str)
            or not source["section"]
            or type(source.get("score")) not in (int, float)
            or not math.isfinite(source["score"])
        ):
            raise ContextError("context_invalid")
    if CONTACT.search(compact(facts)):
        raise ContextError("context_unmasked")


def validate_snapshot(snapshot: object, binding: dict) -> dict:
    if (
        not isinstance(snapshot, dict)
        or type(snapshot.get("schema_version")) is not int
        or snapshot["schema_version"] != 1
    ):
        raise ContextError("context_invalid")
    if any(not isinstance(binding.get(k), str) or not binding[k] for k in BINDING_KEYS):
        raise ContextError("context_not_linked")
    if any(snapshot.get(k) != binding[k] for k in BINDING_KEYS):
        raise ContextError("context_not_linked")
    if (
        type(snapshot.get("revision")) is not int
        or snapshot["revision"] < 1
        or snapshot.get("phase") not in PHASES
        or not isinstance(snapshot.get("request_id"), str)
        or not 1 <= len(snapshot["request_id"]) <= 64
        or snapshot.get("event_id") != event_id(snapshot)
    ):
        raise ContextError("context_invalid")
    support = snapshot.get("support")
    if not isinstance(support, dict) or "version" not in support or support["version"] is not None:
        raise ContextError("context_invalid")
    for field in ("case_id", "owner_id", "first_request_id"):
        if support.get(field) != binding[field]:
            raise ContextError("context_not_linked")
    if (
        support.get("ticket_id") != binding["ticket_key"]
        or support.get("status") not in STATUSES
        or type(support.get("attempt")) is not int
        or support["attempt"] < 1
        or support.get("assignee_role") not in {None, "support", "security"}
        or support.get("priority") not in {None, "normal", "high"}
        or (
            support["status"] == "handed_off"
            and (support.get("assignee_role") is None or support.get("priority") is None)
        )
    ):
        raise ContextError("context_invalid")
    validate_facts(snapshot.get("facts"))
    if len(compact(snapshot).encode("utf-8")) > 16000:
        raise ContextError("context_too_large")
    return snapshot


def validate_issue(issue: dict, binding: dict) -> None:
    fields = issue.get("fields", {})
    if (
        not re.fullmatch(r"JBYS-[0-9]+", str(issue.get("key", "")))
        or issue["key"] != binding["ticket_key"]
        or case_label(binding) not in fields.get("labels", [])
        or "case_id: " + binding["case_id"]
        not in jira_text(fields.get("description", "")).splitlines()
        or "first_request_id: " + binding["first_request_id"]
        not in jira_text(fields.get("description", "")).splitlines()
    ):
        raise ContextError("context_not_linked")


def select_snapshot(
    comments: list[dict], binding: dict, authors: set[str], *, request_id: str | None = None
) -> dict:
    if not authors:
        raise ContextError("context_author_unconfigured")
    events: dict[str, str] = {}
    revisions: dict[int, str] = {}
    candidates = []
    for comment in comments:
        text = jira_text(comment.get("body", ""))
        if not text.startswith(MARKER + "\n"):
            continue
        if comment.get("author", {}).get("accountId") not in authors:
            raise ContextError("context_author_denied")
        try:
            snapshot = validate_snapshot(json.loads(text[len(MARKER) + 1 :]), binding)
        except (json.JSONDecodeError, KeyError, TypeError) as exc:
            raise ContextError("context_invalid") from exc
        canonical = compact(snapshot, sort_keys=True)
        for key, index in [(snapshot["event_id"], events), (snapshot["revision"], revisions)]:
            if key in index and index[key] != canonical:
                raise ContextError("context_conflict")
            index[key] = canonical
        if request_id is None or snapshot["request_id"] == request_id:
            candidates.append(snapshot)
    if not candidates:
        raise ContextError("context_missing")
    return max(candidates, key=lambda s: s["revision"])
