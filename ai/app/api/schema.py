from uuid import UUID

from pydantic import BaseModel


class ChatRequest(BaseModel):
    id: UUID
    user_id: int
    message: str
    workspace_id: int
