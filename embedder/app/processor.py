import logging

from proto.embedder.v1.newcontent_pb2 import EntityType, NewContent

from app.db import DatabaseRepository
from app.embedder import EmbedderService

logger = logging.getLogger(__name__)


class ContentProcessor:
    def __init__(self, db: DatabaseRepository, embedder: EmbedderService) -> None:
        self.db = db
        self.embedder = embedder

    async def process(self, content_msg: NewContent) -> None:
        """Orchestrates parsing, diffing, and database synchronization."""
        entity_id = content_msg.id

        if content_msg.entity_type == EntityType.ENTITY_TYPE_ASSIGNMENT:
            entity_type = "assignment"
        elif content_msg.entity_type == EntityType.ENTITY_TYPE_NOTE:
            entity_type = "note"
        else:
            logger.warning("Unspecified or unknown entity type for ID %s: %s", entity_id, content_msg.entity_type)
            return

        markdown = await self.db.get_content_markdown(entity_type, entity_id)
        if markdown is None:
            logger.warning("No markdown content found for %s_id: %s", entity_type, entity_id)
            return

        workspace_id = await self.db.get_workspace_id(entity_type, entity_id)
        if workspace_id is None:
            logger.warning("No workspace_id found for %s_id: %s", entity_type, entity_id)
            return

        logger.info("Processing %s_id: %s in workspace: %s", entity_type, entity_id, workspace_id)

        parsed_chunks = self.embedder.process_content(markdown)

        existing_hashes = await self.db.get_existing_hashes(entity_type, entity_id)

        hashes_to_delete, chunks_to_insert = await self.embedder.prepare_sync_data(
            workspace_id, entity_type, entity_id, parsed_chunks, existing_hashes
        )

        await self.db.apply_sync(
            entity_type, entity_id, hashes_to_delete, chunks_to_insert
        )

        logger.info(
            "Sync complete for %s_id: %s. Added: %s, Deleted: %s",
            entity_type,
            entity_id,
            len(chunks_to_insert),
            len(hashes_to_delete),
        )
