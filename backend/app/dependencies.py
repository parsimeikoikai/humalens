from functools import lru_cache

from fastapi import Depends

from app.services.embedder import Embedder
from app.services.rag import RAGService
from app.services.vectorstore import VectorStore


@lru_cache(maxsize=1)
def get_embedder() -> Embedder:
    return Embedder()


@lru_cache(maxsize=1)
def get_vectorstore() -> VectorStore:
    return VectorStore()


def get_rag_service(
    embedder: Embedder = Depends(get_embedder),
    vectorstore: VectorStore = Depends(get_vectorstore),
) -> RAGService:
    return RAGService(
        embedder=embedder,
        vectorstore=vectorstore,
    )