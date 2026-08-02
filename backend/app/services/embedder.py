from __future__ import annotations

import os
from dataclasses import dataclass
from typing import Iterable, List, Sequence

from huggingface_hub.utils import disable_progress_bars
from fastembed import TextEmbedding

# huggingface_hub's model download uses tqdm's threaded progress bars
# (tqdm.contrib.concurrent.thread_map), which has a known race where a
# worker thread tears down its bar before tqdm's class-level lock is
# initialized, raising `AttributeError: type object 'tqdm' has no
# attribute '_lock'`. Disabling progress bars skips that teardown path
# entirely (tqdm.close() no-ops when disabled) — see
# https://github.com/huggingface/huggingface_hub/issues/1690
disable_progress_bars()


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

        # fastembed defaults to a tmpdir cache if cache_dir isn't given,
        # which loses the downloaded model on every container recreate.
        # Pin it somewhere a volume can persist across rebuilds.
        cache_dir = os.getenv("FASTEMBED_CACHE_DIR", "/root/.cache/fastembed")

        # Load once per process
        self._model = TextEmbedding(
            model_name=self.model_name,
            cache_dir=cache_dir,
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