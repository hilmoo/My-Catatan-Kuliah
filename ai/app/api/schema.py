from pydantic import BaseModel


class ChatRequest(BaseModel):
    id: str
    user_id: int
    message: str
    workspace_id: int
