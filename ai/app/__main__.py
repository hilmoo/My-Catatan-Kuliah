import asyncio
import logging

import uvicorn

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


async def main() -> None:
    """Run the Uvicorn server programmatically."""
    config = uvicorn.Config(
        "app.main:app",
        host="0.0.0.0",  # noqa: S104
        port=8000,
        reload=False,
        log_level="info",
    )
    server = uvicorn.Server(config)
    await server.serve()


if __name__ == "__main__":
    asyncio.run(main())
