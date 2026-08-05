from fastapi import APIRouter, Depends, HTTPException, status

from app.dependencies import (
    get_current_user,
    get_embedder,
    get_knowledge_base_service,
    get_vectorstore,
)
from app.models.ingest import IngestRequest, IngestResponse
from app.models.user import User
from app.services.embedder import Embedder
from app.services.docs_processor import DocsProcessor
from app.services.knowledge_base_service import KnowledgeBaseService
from app.services.vectorstore import VectorStore, build_where

router = APIRouter(prefix="/ingest", tags=["ingest"])
processor = DocsProcessor()


@router.post("/api", response_model=IngestResponse)
def ingest_from_api(
    knowledge_base_id: int,
    payload: IngestRequest,
    current_user: User = Depends(get_current_user),
    knowledge_bases: KnowledgeBaseService = Depends(get_knowledge_base_service),
    embedder: Embedder = Depends(get_embedder),
    vectorstore: VectorStore = Depends(get_vectorstore),
):
    """Ingest raw text into one of the caller's knowledge bases.

    File uploads go through `POST /knowledge-bases/{id}/documents` instead —
    that path also records a Document row so the file can be listed and
    deleted later. This route is for text that has no file behind it.
    """
    knowledge_base = knowledge_bases.get(knowledge_base_id, current_user.id)

    if knowledge_base is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Knowledge base not found",
        )

    documents = [
        {
            "text": processor.clean_text(document.text),
            "source": document.source or "api",
            "page": document.page or 1,
        }
        for document in payload.documents
    ]

    chunks = processor.process_documents(documents)

    for chunk in chunks:
        chunk["metadata"]["owner_id"] = current_user.id
        chunk["metadata"]["knowledge_base_id"] = knowledge_base.id

    embedded_chunks = embedder.embed_chunks_from_processed(chunks)
    vectorstore.store(embedded_chunks)

    knowledge_bases.mark_status(knowledge_base.id, "ready")

    return {"processed_chunks": chunks}


@router.get("/count")
def count(
    current_user: User = Depends(get_current_user),
    vectorstore: VectorStore = Depends(get_vectorstore),
):
    return {
        "count": vectorstore.count(build_where(owner_id=current_user.id)),
    }
