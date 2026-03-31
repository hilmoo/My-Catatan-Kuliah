import asyncio
import hashlib

from langchain_text_splitters import (
    MarkdownHeaderTextSplitter,
    RecursiveCharacterTextSplitter,
)
from sentence_transformers import SentenceTransformer


class EmbedderService:
    def __init__(
        self, model_name: str = "all-MiniLM-L6-v2", chunk_size: int = 500
    ) -> None:
        self.model_name = model_name
        self._model = None
        self.chunk_size = chunk_size

    def get_model(self) -> SentenceTransformer:
        if self._model is None:
            self._model = SentenceTransformer(self.model_name)
        return self._model

    def _compute_hash(self, text: str) -> str:
        return hashlib.sha256(text.encode("utf-8")).hexdigest()

    def process_content(self, markdown: str) -> list[dict]:
        headers_to_split_on = [("#", "H1"), ("##", "H2"), ("###", "H3")]
        markdown_splitter = MarkdownHeaderTextSplitter(
            headers_to_split_on=headers_to_split_on
        )
        md_header_splits = markdown_splitter.split_text(markdown)

        text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=self.chunk_size, chunk_overlap=50
        )
        final_splits = text_splitter.split_documents(md_header_splits)

        chunks_data = []
        for i, doc in enumerate(final_splits):
            context_prefix = " > ".join([v for k, v in doc.metadata.items()])
            contextualized_text = (
                f"{context_prefix}\n\n{doc.page_content}"
                if context_prefix
                else doc.page_content
            )

            chunks_data.append(
                {
                    "chunk_index": i,
                    "text": contextualized_text,
                    "hash": self._compute_hash(contextualized_text),
                }
            )

        return chunks_data

    async def prepare_sync_data(
        self,
        page_id: int,
        parsed_chunks: list[dict],
        existing_hashes: set[str],
        workspace_id: int,
    ) -> tuple[set[str], list[tuple]]:
        """Determines the diff and generates embeddings for new chunks."""
        new_chunk_map = {chunk["hash"]: chunk for chunk in parsed_chunks}
        new_hashes = set(new_chunk_map.keys())

        hashes_to_delete = existing_hashes - new_hashes
        hashes_to_add = new_hashes - existing_hashes

        chunks_to_insert = []
        if hashes_to_add:
            texts_to_embed = [new_chunk_map[h]["text"] for h in hashes_to_add]
            model = self.get_model()
            embeddings = await asyncio.to_thread(
                model.encode, texts_to_embed, show_progress_bar=False
            )
            embeddings = embeddings.tolist()

            for hash_val, embedding in zip(hashes_to_add, embeddings, strict=False):
                chunk_data = new_chunk_map[hash_val]
                chunks_to_insert.append(
                    (
                        page_id,
                        chunk_data["chunk_index"],
                        chunk_data["text"],
                        embedding,
                        hash_val,
                        workspace_id,
                    )
                )

        return hashes_to_delete, chunks_to_insert
