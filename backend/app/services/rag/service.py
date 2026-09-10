import logging

from fastapi import HTTPException

from app.models.query import QueryRequest
from app.services.embedder import Embedder
from app.services.llm.base import BaseLLMProvider
from app.services.rag.context_builder import build_context, format_sources
from app.services.rag.hyde import generate_hypothetical_document
from app.services.rag.retriever import hybrid_search
from app.services.vectorstore import VectorStore, build_where

logger = logging.getLogger(__name__)

DEFAULT_TOP_K = 3


class RAGService:
    def __init__(
        self,
        embedder: Embedder,
        vectorstore: VectorStore,
        llm_provider: BaseLLMProvider,
    ):
        self.embedder = embedder
        self.vectorstore = vectorstore
        self.llm_provider = llm_provider

    async def retrieve(self, payload: QueryRequest, owner_id: int) -> dict:
        """
        Embeds the user's question (via a HyDE hypothetical-answer passage
        when available), retrieves relevant chunks from Chroma, and
        prepares the context for the LLM.

        Retrieval is always constrained to `owner_id`, so a caller can only
        ever reach chunks from their own knowledge bases.
        """

        hyde_passage = await generate_hypothetical_document(
            self.llm_provider,
            payload.question,
        )

        # HyDE only replaces the *dense* embedding input — BM25 keeps the
        # raw question, since exact terms the user typed (IDs, acronyms)
        # are exactly what keyword search is good at, and a hallucinated
        # hypothetical passage could drop or alter them.
        embedding_input = hyde_passage or payload.question

        try:
            logger.info(
                "Embedding %s for retrieval: %s",
                "HyDE passage" if hyde_passage else "raw question",
                embedding_input[:100],
            )

            result = self.embedder.embed_texts([embedding_input])
            question_embedding = result.embeddings[0]

        except Exception as e:
            logger.exception("Question embedding failed")

            raise HTTPException(
                status_code=500,
                detail="Failed to embed question.",
            ) from e

        top_k = payload.top_k or DEFAULT_TOP_K

        where = build_where(
            owner_id=owner_id,
            knowledge_base_id=payload.knowledge_base_id,
            category=(
                {"$in": payload.categories}
                if payload.categories
                else None
            ),
        )

        try:
            chunks = hybrid_search(
                self.vectorstore,
                question=payload.question,
                question_embedding=question_embedding,
                top_k=top_k,
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