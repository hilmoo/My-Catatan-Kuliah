from typing import Literal
from uuid import UUID

from pydantic import BaseModel


class ChatRequest(BaseModel):
    id: UUID
    user_id: str
    message: str
    course_id: str | None = None
    notes_id: str | None = None
    answer_style: Literal["auto", "concise", "direct", "tutor"] = "auto"
