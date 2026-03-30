import logging

from proto.embedder.v1.newcontent_pb2 import NewContent

from app.db import DatabaseRepository
from app.embedder import EmbedderService

logger = logging.getLogger(__name__)


class ContentProcessor:
    def __init__(self, db: DatabaseRepository, embedder: EmbedderService) -> None:
        self.db = db
        self.embedder = embedder

    async def process(self, content_msg: NewContent) -> None:
        """Orchestrates parsing, diffing, and database synchronization."""
        page_id = content_msg.id
        markdown = await self.db.get_content_markdown(page_id)
        if markdown is None:
            logger.warning("No markdown content found for page_id: %s", page_id)
            return

        workspace_id = await self.db.get_workspace_id(page_id)
        if workspace_id is None:
            logger.warning("No workspace_id found for page_id: %s", page_id)
            return

        logger.info("Processing page_id: %s", page_id)

        parsed_chunks = self.embedder.process_content(markdown)

        existing_hashes = await self.db.get_existing_hashes(page_id)

        hashes_to_delete, chunks_to_insert = await self.embedder.prepare_sync_data(
            page_id, parsed_chunks, existing_hashes, workspace_id
        )

        await self.db.apply_sync(page_id, hashes_to_delete, chunks_to_insert)

        logger.info(
            "Sync complete for page_id: %s. Added: %s, Deleted: %s",
            page_id,
            len(chunks_to_insert),
            len(hashes_to_delete),
        )
