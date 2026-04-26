import logging

import nats
from nats.aio.msg import Msg
from proto.embedder.v1.newcontent_pb2 import NewContent

from app.processor import ContentProcessor

logger = logging.getLogger(__name__)


class NatsWorker:
    def __init__(self, subject: str, processor: ContentProcessor) -> None:
        self.subject = subject
        self.processor = processor
        self.nc = None
        self.js = None
        self.sub = None

    async def connect(self, nats_url: str = "nats://localhost:4222") -> None:
        self.nc = await nats.connect(nats_url)
        self.js = self.nc.jetstream()
        logger.info("Connected to NATS JetStream at %s", nats_url)

    async def _message_handler(self, msg: Msg) -> None:
        """Internal callback for JetStream messages."""
        try:
            content_msg = NewContent()
            content_msg.ParseFromString(msg.data)

            await self.processor.process(content_msg)

            await msg.ack()

        except Exception:
            logger.exception("Error processing message")
            await msg.nak()

    async def start(self) -> None:
        self.sub = await self.js.subscribe(
            self.subject,
            cb=self._message_handler,
            # TODO: Consider using a more specific durable name or consumer group strategy in production
            durable="embedder-1",
            manual_ack=True,
            pending_msgs_limit=1,
        )
        logger.info("Subscribed to %s via JetStream", self.subject)

    async def stop(self) -> None:
        if self.nc and not self.nc.is_closed:
            await self.nc.drain()
            logger.info("NATS connection drained and closed")
