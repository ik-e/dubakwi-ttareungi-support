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
    "현재 문의를 처리할 수 없습니다. 잠시 후 다시 시도해 주세요. 계속되면 담당자에게 문의해 주세요."
)

_CODE_MESSAGES = {
    "request_in_progress": (
        "같은 요청을 처리하고 있습니다. 같은 요청은 자동으로 다시 실행하지 않습니다."
    ),
    "request_requires_review": (
        "처리 결과 확인이 필요하며, 같은 요청은 자동으로 다시 실행하지 않습니다."
    ),
    "request_conflict": ("같은 요청 번호로 다른 내용이 들어왔습니다. 새 문의로 다시 보내 주세요."),
    "case_busy": (
        "같은 문의의 이전 요청이 처리 중이거나 확인 중입니다. 잠시 후 다시 시도해 주세요. "
        "계속되면 새 문의로 보내 주세요"
        "(새 문의는 별도 티켓이 생기고 보완 횟수가 처음부터 시작됩니다)."
    ),
}


def failure_message(codes: object) -> str:
    """Map support error codes to a private notice; unknown codes get the generic one."""
    if isinstance(codes, list):
        for code in codes:
            if isinstance(code, str) and code in _CODE_MESSAGES:
                return _CODE_MESSAGES[code]
    return GENERIC_FAILURE_MESSAGE


def render_private_response(payload: Any) -> str:
    if not isinstance(payload, dict):
        raise ContractError("응답 형식이 올바르지 않습니다.")

    answer = payload.get("answer")
    if not isinstance(answer, str) or not answer.strip():
        raise ContractError("답변이 준비되지 않았습니다.")

    suffix: list[str] = []
    case_ref = payload.get("case_ref")
    if isinstance(case_ref, str) and case_ref.strip():
        suffix.append(f"문의 연결값: {case_ref.strip()}")

    ticket = payload.get("ticket_id")
    if isinstance(ticket, str) and ticket.strip():
        suffix.append(f"Jira 접수번호: {ticket.strip()}")

    tail = "".join(f"\n\n{line}" for line in suffix)
    # Trim only the answer so case_ref and ticket id always survive the length limit.
    return answer.strip()[: max(MAX_MESSAGE_LENGTH - len(tail), 0)] + tail
