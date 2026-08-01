import logging

from fastapi import HTTPException

from app.models.query import QueryRequest
from app.services.embedder import Embedder
from app.services.rag.context_builder import build_context, format_sources
from app.services.vectorstore import VectorStore

logger = logging.getLogger(__name__)

DEFAULT_TOP_K = 3


class RAGService:
    def __init__(
        self,
        embedder: Embedder,
        vectorstore: VectorStore,
    ):
        self.embedder = embedder
        self.vectorstore = vectorstore

    def retrieve(self, payload: QueryRequest) -> dict:
        """
        Embeds the user's question, retrieves relevant chunks from Chroma,
        and prepares the context for the LLM.
        """

        try:
            logger.info("Embedding question: %s", payload.question[:100])

            result = self.embedder.embed_texts([payload.question])
            question_embedding = result.embeddings[0]

        except Exception as e:
            logger.exception("Question embedding failed")

            raise HTTPException(
                status_code=500,
                detail="Failed to embed question.",
            ) from e

        top_k = payload.top_k or DEFAULT_TOP_K

        where = (
            {"category": {"$in": payload.crisis_types}}
            if payload.crisis_types
            else None
        )

        try:
            chunks = self.vectorstore.query(
                question_embedding,
                n_results=top_k,
                where=where,
            )

            logger.info(
                "Retrieved %s chunks from vector store",
                len(chunks),
            )

        except Exception as e:
            logger.exception("Vector store query failed")

            raise HTTPException(
                status_code=500,
                detail="Failed to retrieve context.",
            ) from e

        retrieved_documents = [
            {
                "id": index + 1,
                "source": chunk["metadata"].get("source", "unknown"),
                "page": chunk["metadata"].get("page"),
                "excerpt": chunk["content"][:280],
                "score": chunk.get("score", 0.0),
                "category": chunk["metadata"].get("category", "General"),
            }
            for index, chunk in enumerate(chunks)
        ]

        return {
            "chunks": chunks,
            "context": build_context(chunks),
            "sources": format_sources(chunks),
            "retrieved_documents": retrieved_documents,
        }