# ai

this implementation using text-stream, so it just send response text token by token. (for enhancement) if wanna add custom data like reference source, etc., change into data-stream instead. (edit also hybrid_search, retriever, and main.py)

https://ai-sdk.dev/docs/ai-sdk-ui/stream-protocol

# running dev

cd ai && uv run uvicorn main:app --port 8002 --reload
