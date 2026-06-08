from __future__ import annotations

from dataclasses import dataclass
from typing import Iterable, List, Optional, Sequence


@dataclass
class EmbeddingResult:
    embeddings: List[List[float]]


class Embedder:
    """Sentence-transformers embedder.

    This module intentionally contains *only* embedding logic.
    Routers should call this service; they should not instantiate ML models.
    """

    def __init__(
        self,
        model_name: str = "sentence-transformers/all-MiniLM-L6-v2",
        device: Optional[str] = None,
    ) -> None:
        self.model_name = model_name
        self.device = device

        # Lazy import so the app can boot even if embedding deps aren't installed yet.
        from sentence_transformers import SentenceTransformer  # type: ignore

        kwargs = {}
        if device is not None:
            kwargs["device"] = device

        # Load once per process
        self._model = SentenceTransformer(self.model_name, **kwargs)

    def embed_texts(self, texts: Sequence[str]) -> EmbeddingResult:
        if not texts:
            return EmbeddingResult(embeddings=[])

        # sentence-transformers returns numpy arrays
        vectors = self._model.encode(
            list(texts),
            convert_to_numpy=True,
            normalize_embeddings=True,
            show_progress_bar=False,
        )

        # Convert to plain python lists for JSON-compat if needed.
        embeddings: List[List[float]] = [v.astype(float).tolist() for v in vectors]
        return EmbeddingResult(embeddings=embeddings)

    def embed_chunks_from_processed(self, chunks: Iterable[dict]) -> List[dict]:
        """Utility: take processed chunks (from DocsProcessor) and attach embeddings.

        Expected input shape (best-effort):
          {"content": str, "metadata": {...}, ...}
        """

        contents: List[str] = []
        items: List[dict] = []
        for c in chunks:
            if not isinstance(c, dict):
                continue
            text = c.get("content")
            if not isinstance(text, str) or not text.strip():
                continue
            contents.append(text)
            items.append(c)

        if not items:
            return []

        result = self.embed_texts(contents)

        for item, emb in zip(items, result.embeddings):
            item["embedding"] = emb

        return items

