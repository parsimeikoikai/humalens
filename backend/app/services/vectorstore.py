from __future__ import annotations

import logging
import re
from typing import List
import os
import chromadb
from rank_bm25 import BM25Okapi

logger = logging.getLogger(__name__)

_TOKEN_PATTERN = re.compile(r"[a-z0-9]+")


def _tokenize(text: str) -> List[str]:
    return _TOKEN_PATTERN.findall(text.lower())


class VectorStore:
    """
    Thin wrapper around ChromaDB.
    Responsible only for storing and retrieving embedded chunks.
    """

    def __init__(
        self,
        host: str = os.getenv("CHROMA_HOST", "chromadb"),
        port: int = int(os.getenv("CHROMA_PORT", "8001")),
        collection_name: str = "documents",
    ) -> None:
       
        self._client = chromadb.PersistentClient(
            path=os.getenv("CHROMA_PATH", "./chroma_db")
        )
        self._collection = self._client.get_or_create_collection(
            name=collection_name,
            metadata={
                "hnsw:space": "cosine"
            }, 
        )
        logger.info(f"VectorStore connected — collection: '{collection_name}'")

    # --------------------------------------------------
    # Store
    # --------------------------------------------------

    def store(self, embedded_chunks: List[dict]) -> int:
        """
        Accept embedded chunks from Embedder.embed_chunks_from_processed()
        and upsert them into ChromaDB.

        Expected chunk shape:
          {
            "content":   str,
            "source":    str,
            "embedding": List[float],
            "metadata":  {"doc_id": str, "chunk_id": int, "page": int, "timestamp": str}
          }

        Returns number of chunks stored.
        """
        if not embedded_chunks:
            return 0

        ids = []
        embeddings = []
        documents = []
        metadatas = []

        for chunk in embedded_chunks:
            doc_id = chunk["metadata"]["doc_id"]
            chunk_id = chunk["metadata"]["chunk_id"]

            ids.append(f"{doc_id}_{chunk_id}")
            embeddings.append(chunk["embedding"])
            documents.append(chunk["content"])
            metadatas.append(
                {
                    "doc_id": doc_id,
                    "chunk_id": chunk_id,
                    "page": chunk["metadata"]["page"],
                    "source": chunk["source"],
                    "timestamp": chunk["metadata"]["timestamp"],
                    "category": chunk["metadata"].get("category") or "General",
                }
            )

        self._collection.upsert(
            ids=ids,
            embeddings=embeddings,
            documents=documents,
            metadatas=metadatas,
        )

        logger.info(f"Stored {len(ids)} chunks into ChromaDB")
        return len(ids)

    # --------------------------------------------------
    # Query
    # --------------------------------------------------

    def query(
        self,
        embedding: List[float],
        n_results: int = 5,
        where: dict | None = None,
    ) -> List[dict]:
        """
        Query ChromaDB with an embedding vector.
        Returns ranked list of matching chunks with their metadata.
        """
        results = self._collection.query(
            query_embeddings=[embedding],
            n_results=n_results,
            where=where,
            include=["documents", "metadatas", "distances"],
        )

        matches = []
        for chunk_id, doc, meta, dist in zip(
            results["ids"][0],
            results["documents"][0],
            results["metadatas"][0],
            results["distances"][0],
        ):
            matches.append(
                {
                    "id": chunk_id,
                    "content": doc,
                    "metadata": meta,
                    "score": round(1 - dist, 4),  # cosine distance → similarity score
                }
            )

        return matches

    # --------------------------------------------------
    # Keyword (sparse) query
    # --------------------------------------------------

    def get_all(self, where: dict | None = None) -> List[dict]:
        """
        Fetch every chunk matching `where` (or the whole collection).
        Used to build an in-memory BM25 index for keyword search.
        """
        results = self._collection.get(
            where=where,
            include=["documents", "metadatas"],
        )

        return [
            {"id": chunk_id, "content": doc, "metadata": meta}
            for chunk_id, doc, meta in zip(
                results["ids"],
                results["documents"],
                results["metadatas"],
            )
        ]

    def keyword_query(
        self,
        query_text: str,
        n_results: int = 5,
        where: dict | None = None,
    ) -> List[dict]:
        """
        BM25 keyword search over the same corpus, for hybrid retrieval.

        Rebuilds the BM25 index from scratch on every call — fine at this
        collection's scale, but would need a maintained index if the corpus
        grows large.
        """
        corpus = self.get_all(where=where)

        if not corpus:
            return []

        tokenized_corpus = [_tokenize(item["content"]) for item in corpus]
        bm25 = BM25Okapi(tokenized_corpus)

        scores = bm25.get_scores(_tokenize(query_text))
        max_score = max(scores) if len(scores) else 0.0

        ranked_indices = sorted(
            range(len(scores)),
            key=lambda i: scores[i],
            reverse=True,
        )[:n_results]

        matches = []
        for i in ranked_indices:
            if scores[i] <= 0:
                continue

            item = corpus[i]
            matches.append(
                {
                    "id": item["id"],
                    "content": item["content"],
                    "metadata": item["metadata"],
                    "score": round(scores[i] / max_score, 4) if max_score > 0 else 0.0,
                }
            )

        return matches
