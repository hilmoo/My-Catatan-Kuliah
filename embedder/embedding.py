from sentence_transformers import SentenceTransformer

_model: SentenceTransformer | None = None


def get_model(model_name: str) -> SentenceTransformer:
    """Load model lazily (singleton). First call downloads the model if needed."""
    global _model  # noqa: PLW0603
    if _model is None:
        _model = SentenceTransformer(model_name)
    return _model


def embed_texts(texts: list[str], model_name: str) -> list[list[float]]:
    """Embed a list of texts and return list of vectors (384-dim each)."""
    model = get_model(model_name)
    embeddings = model.encode(texts, show_progress_bar=False)
    return embeddings.tolist()
