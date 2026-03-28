# ai

this implementation uses AI SDK Data Stream Protocol (SSE) with resumable streams via Redis. each response is streamed as SSE events (`data: {...}`) and buffered to Redis for resume support if client disconnects.

https://ai-sdk.dev/docs/ai-sdk-ui/stream-protocol

# running dev

cd ai && uv run uvicorn main:app --reload --port 8002
