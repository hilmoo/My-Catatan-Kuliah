import asyncio
import logging
import signal

import asyncpg
from pgvector.asyncpg import register_vector

from app.config import Config
from app.db import DatabaseRepository
from app.embedder import EmbedderService
from app.processor import ContentProcessor
from app.worker import NatsWorker

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


async def main() -> None:
    config = Config()

    async def init_connection(conn) -> None:  # noqa: ANN001
        await register_vector(conn)

    pool = await asyncpg.create_pool(config.database_url, init=init_connection)

    db_repo = DatabaseRepository(pool)
    embedder_svc = EmbedderService()
    processor = ContentProcessor(db=db_repo, embedder=embedder_svc)

    worker = NatsWorker(subject="embedder.v1.newcontent.>", processor=processor)
    await worker.connect(config.nats_url)
    await worker.start()

    logger.info("Service is running. Listening for events...")

    loop = asyncio.get_running_loop()
    stop_event = asyncio.Event()

    for sig in (signal.SIGINT, signal.SIGTERM):
        loop.add_signal_handler(sig, stop_event.set)

    await stop_event.wait()
    logger.info("Shutting down service...")

    await worker.stop()
    await pool.close()
    logger.info("Shutdown complete.")


if __name__ == "__main__":
    asyncio.run(main())
