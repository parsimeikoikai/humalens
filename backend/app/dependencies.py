from functools import lru_cache

from app.services.embedder import Embedder
from app.services.vectorstore import VectorStore  

@lru_cache(maxsize=1)
def get_embedder() -> Embedder:
    return Embedder()


@lru_cache(maxsize=1)
def get_vectorstore() -> VectorStore:
    return VectorStore()