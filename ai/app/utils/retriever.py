from sentence_transformers import SentenceTransformer


class Retriever:
    """Handles retrieval of relevant chunks using hybrid search."""

    def __init__(self, model_name: str, chunk_size: int = 500) -> None:
        self.model_name = model_name
        self.chunk_size = chunk_size
        self._model = SentenceTransformer(self.model_name)

    def embed_query(self, text: str) -> list[float]:
        """Embed a single query text into a vector."""
        embedding = self._model.encode(text, show_progress_bar=False)
        return embedding.tolist()
