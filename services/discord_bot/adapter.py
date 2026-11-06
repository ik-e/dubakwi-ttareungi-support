"""Pure request/response conversion for the Discord adapter."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any

MAX_QUESTION_LENGTH = 500


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


def build_support_request(
    *, interaction_id: int, discord_user_id: int, question: str, case_ref: str | None
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
        user=str(discord_user_id),
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

    lines = [answer.strip()]
    case_ref = payload.get("case_ref")
    if isinstance(case_ref, str) and case_ref.strip():
        lines.append(f"문의 연결값: {case_ref.strip()}")

    ticket = payload.get("ticket_id")
    if isinstance(ticket, str) and ticket.strip():
        lines.append(f"Jira 접수번호: {ticket.strip()}")

    rendered = "\n\n".join(lines)
    return rendered[:1900]
