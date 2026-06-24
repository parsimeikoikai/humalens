from __future__ import annotations

from dataclasses import dataclass
from typing import Iterable, List, Sequence

from fastembed import TextEmbedding


@dataclass
class EmbeddingResult:
    embeddings: List[List[float]]


class Embedder:
    """
    FastEmbed-based embedder.

    Lightweight alternative to SentenceTransformers.
    Uses ONNX models instead of PyTorch.
    """

    def __init__(
        self,
        model_name: str = "BAAI/bge-small-en-v1.5",
    ) -> None:
        self.model_name = model_name

        # Load once per process
        self._model = TextEmbedding(
            model_name=self.model_name
        )

    def embed_texts(
        self,
        texts: Sequence[str],
    ) -> EmbeddingResult:
        if not texts:
            return EmbeddingResult(embeddings=[])

        vectors = list(
            self._model.embed(
                list(texts)
            )
        )

        embeddings = [
            vector.tolist()
            for vector in vectors
        ]

        return EmbeddingResult(
            embeddings=embeddings
        )

    def embed_chunks_from_processed(
        self,
        chunks: Iterable[dict],
    ) -> List[dict]:
        contents: List[str] = []
        items: List[dict] = []

        for chunk in chunks:
            if not isinstance(chunk, dict):
                continue

            text = chunk.get("content")

            if not isinstance(text, str):
                continue

            if not text.strip():
                continue

            contents.append(text)
            items.append(chunk)

        if not items:
            return []

        result = self.embed_texts(contents)

        for item, embedding in zip(
            items,
            result.embeddings,
        ):
            item["embedding"] = embedding

        return items