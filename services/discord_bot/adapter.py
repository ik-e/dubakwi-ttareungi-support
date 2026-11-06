"""Pure request/response conversion for the Discord adapter."""

from __future__ import annotations

import re
from dataclasses import dataclass
from typing import Any

MAX_QUESTION_LENGTH = 500
MAX_MESSAGE_LENGTH = 1900
UNREGISTERED_MESSAGE = "등록되지 않은 계정입니다. 담당자에게 문의해 주세요."

_DISCORD_ID = re.compile(r"[0-9]{5,25}")
_REGISTERED_ID = re.compile(r"[A-Za-z0-9][A-Za-z0-9_-]{0,63}")


class ContractError(ValueError):
    """Raised when an adapter or support response violates the public contract."""


@dataclass(frozen=True)
class SupportRequest:
    request_id: str
    user: str
    question: str
    case_ref: str | None = None

    def as_dict(self) -> dict[str, str]:
        body = {
            "request_id": self.request_id,
            "user": self.user,
            "question": self.question,
            "channel": "discord",
        }
        if self.case_ref:
            body["case_ref"] = self.case_ref
        return body


def parse_user_map(raw: str) -> dict[str, str]:
    """Parse ``<discord id>:<registered user id>,...``; values are never echoed in errors."""
    mapping: dict[str, str] = {}
    entries = [entry.strip() for entry in raw.split(",")]
    if not raw.strip() or any(not entry for entry in entries):
        raise ContractError("DUBAKWI_DISCORD_USER_MAP format is invalid")
    for entry in entries:
        discord_id, separator, registered_id = entry.partition(":")
        if (
            not separator
            or not _DISCORD_ID.fullmatch(discord_id)
            or not _REGISTERED_ID.fullmatch(registered_id)
            or discord_id in mapping
        ):
            raise ContractError("DUBAKWI_DISCORD_USER_MAP format is invalid")
        mapping[discord_id] = registered_id
    return mapping


def build_support_request(
    *, interaction_id: int, user: str, question: str, case_ref: str | None
) -> SupportRequest:
    normalized_question = question.strip()
    if not normalized_question:
        raise ContractError("질문을 입력해 주세요.")
    if len(normalized_question) > MAX_QUESTION_LENGTH:
        raise ContractError(f"질문은 {MAX_QUESTION_LENGTH}자 이하로 입력해 주세요.")

    normalized_case_ref = case_ref.strip() if case_ref else None
    if normalized_case_ref == "":
        normalized_case_ref = None

    return SupportRequest(
        request_id=f"dc-{interaction_id}",
        user=user,
        question=normalized_question,
        case_ref=normalized_case_ref,
    )


GENERIC_FAILURE_MESSAGE = (
    "처리 결과를 확인하지 못했습니다. 중복 접수를 피하기 위해 담당자에게 확인해 주세요."
)

# One wording for unknown and foreign case numbers, so the reply never reveals whether a case exists.
CASE_REF_NOTICE = (
    "문의 연결값을 확인할 수 없습니다. 연결값을 다시 확인하시거나 새 문의로 접수해 주세요."
)

_CODE_MESSAGES = {
    "request_in_progress": (
        "같은 요청을 처리하고 있습니다. 같은 요청은 자동으로 다시 실행하지 않습니다."
    ),
    "request_requires_review": (
        "처리 결과 확인이 필요하며, 같은 요청은 자동으로 다시 실행하지 않습니다."
    ),
    "request_conflict": ("같은 요청 번호로 다른 내용이 들어왔습니다. 새 문의로 다시 보내 주세요."),
    # Same wording as the state workflow, so the citizen sees one message wherever it is raised.
    "invalid_case_ref": CASE_REF_NOTICE,
    "case_access_denied": CASE_REF_NOTICE,
    "unknown_user": "등록되지 않은 사용자입니다. 담당자에게 문의해 주세요.",
    "case_closed": "종료된 문의입니다. 새 문의로 접수해 주세요.",
    "case_busy": (
        "같은 문의의 이전 요청 처리 결과를 확인해야 합니다. "
        "중복 접수를 피하기 위해 담당자에게 확인해 주세요."
    ),
}


def failure_message(codes: object) -> str:
    """Map support error codes to a private notice; unknown codes get the generic one."""
    if isinstance(codes, list):
        for code in codes:
            if isinstance(code, str) and code in _CODE_MESSAGES:
                return _CODE_MESSAGES[code]
    return GENERIC_FAILURE_MESSAGE


MAX_SOURCES = 5
_MACHINE_CODE = re.compile(r"[A-Za-z0-9_.:-]+")


def _one_line(value: object, limit: int) -> str:
    if not isinstance(value, str):
        return ""
    return " ".join(value.split())[:limit]


def _source_lines(sources: object) -> list[str]:
    """Show only the document and section of each source; other fields are never displayed."""
    if not isinstance(sources, list):
        return []
    lines: list[str] = []
    for source in sources[:MAX_SOURCES]:
        if not isinstance(source, dict):
            continue
        doc = _one_line(source.get("doc"), 80)
        section = _one_line(source.get("section"), 80)
        if doc and section:
            lines.append(f"- {doc} / {section}")
        elif doc:
            lines.append(f"- {doc}")
    return lines


def render_private_response(payload: Any) -> str:
    if not isinstance(payload, dict):
        raise ContractError("응답 형식이 올바르지 않습니다.")

    answer = payload.get("answer")
    if not isinstance(answer, str) or not answer.strip():
        raise ContractError("답변이 준비되지 않았습니다.")

    suffix: list[str] = []
    source_lines = _source_lines(payload.get("sources"))
    if source_lines:
        suffix.append("근거:\n" + "\n".join(source_lines))
    reason = _one_line(payload.get("reason"), 200)
    # Support sends machine codes (partial_effect, ticket_unknown, ...); the answer already explains
    # the situation, so only human-readable sentences are shown.
    if reason and not _MACHINE_CODE.fullmatch(reason):
        suffix.append(f"안내: {reason}")
    case_ref = payload.get("case_ref")
    if isinstance(case_ref, str) and case_ref.strip():
        suffix.append(f"문의 연결값: {case_ref.strip()}")

    # Support returns ticket={ticket_id,...} or null; the flat ticket_id is kept for older mocks.
    ticket_obj = payload.get("ticket")
    ticket = ticket_obj.get("ticket_id") if isinstance(ticket_obj, dict) else None
    if not isinstance(ticket, str) or not ticket.strip():
        ticket = payload.get("ticket_id")
    if isinstance(ticket, str) and ticket.strip():
        suffix.append(f"Jira 접수번호: {ticket.strip()}")

    tail = "".join(f"\n\n{line}" for line in suffix)
    # Trim only the answer so case_ref and ticket id always survive the length limit.
    return answer.strip()[: max(MAX_MESSAGE_LENGTH - len(tail), 0)] + tail
