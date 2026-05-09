from uuid import UUID

from pydantic import BaseModel


class ChatRequest(BaseModel):
    id: UUID
    user_id: str
    message: str
    workspace_id: str
