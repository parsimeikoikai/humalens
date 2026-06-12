from __future__ import annotations

import logging
from typing import List
import os 
import chromadb

logger = logging.getLogger(__name__)


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
        # self._client = chromadb.HttpClient(host=host, port=port)
        self._client = chromadb.PersistentClient(

    path=os.getenv("CHROMA_PATH", "./chroma_db")

)
        self._collection = self._client.get_or_create_collection(
            name=collection_name,
            metadata={"hnsw:space": "cosine"},  # matches normalize_embeddings=True in Embedder
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

        ids         = []
        embeddings  = []
        documents   = []
        metadatas   = []

        for chunk in embedded_chunks:
            doc_id   = chunk["metadata"]["doc_id"]
            chunk_id = chunk["metadata"]["chunk_id"]

            ids.append(f"{doc_id}_{chunk_id}")
            embeddings.append(chunk["embedding"])
            documents.append(chunk["content"])
            metadatas.append({
                "doc_id":    doc_id,
                "chunk_id":  chunk_id,
                "page":      chunk["metadata"]["page"],
                "source":    chunk["source"],
                "timestamp": chunk["metadata"]["timestamp"],
            })

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

    def query(self, embedding: List[float], n_results: int = 5) -> List[dict]:
        """
        Query ChromaDB with an embedding vector.
        Returns ranked list of matching chunks with their metadata.
        """
        results = self._collection.query(
            query_embeddings=[embedding],
            n_results=n_results,
            include=["documents", "metadatas", "distances"],
        )

        matches = []
        for doc, meta, dist in zip(
            results["documents"][0],
            results["metadatas"][0],
            results["distances"][0],
        ):
            matches.append({
                "content":  doc,
                "metadata": meta,
                "score":    round(1 - dist, 4),  # cosine distance → similarity score
            })

        return matches