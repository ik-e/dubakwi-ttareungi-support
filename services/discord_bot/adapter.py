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
