import os
from tempfile import NamedTemporaryFile

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile

from app.dependencies import get_embedder, get_vectorstore
from app.services.embedder import Embedder
from app.services.vectorstore import VectorStore
from app.models.ingest import IngestRequest, IngestResponse
from app.services.docs_processor import DocsProcessor


router = APIRouter(prefix="/ingest", tags=["ingest"])
processor = DocsProcessor()


@router.post("/api", response_model=IngestResponse)
def ingest_from_api(
    payload: IngestRequest,
    embedder: Embedder = Depends(get_embedder),
    vectorstore: VectorStore = Depends(get_vectorstore),
):
    documents = [
        {
            "text": processor.clean_text(document.text),
            "source": document.source or "api",
            "page": document.page or 1,
        }
        for document in payload.documents
    ]

    chunks = processor.process_documents(documents)
    embedded_chunks = embedder.embed_chunks_from_processed(chunks)
    vectorstore.store(embedded_chunks)

    return {"processed_chunks": chunks}


@router.post("/upload", response_model=IngestResponse)
async def ingest_upload(
    file: UploadFile = File(...),
    embedder: Embedder = Depends(get_embedder),
    vectorstore: VectorStore = Depends(get_vectorstore),
):
    # We route inside the processor by file extension (docs vs pdf).
    suffix = os.path.splitext(file.filename or "")[1].lower()
    if suffix not in {".pdf", ".docx", ".txt"}:
        raise HTTPException(
            status_code=415,
            detail="Unsupported file type. Upload a .pdf or .docx (or .txt).",
        )

    with NamedTemporaryFile(delete=False, suffix=suffix or ".bin") as tmp:
        tmp.write(await file.read())
        temp_path = tmp.name

    try:
        pages = processor.load_file(temp_path, filename=file.filename)
    finally:
        if os.path.exists(temp_path):
            os.remove(temp_path)

    if not pages:
        raise HTTPException(status_code=400, detail="Unable to parse uploaded content.")

    documents = [
        {
            "text": processor.clean_text(page["text"]),
            "source": file.filename,
            "page": page["page"],
        }
        for page in pages
    ]

    chunks = processor.process_documents(documents)
    embedded_chunks = embedder.embed_chunks_from_processed(chunks)
    vectorstore.store(embedded_chunks)

    return {"processed_chunks": chunks}

@router.get("/count")
def count(vectorstore: VectorStore = Depends(get_vectorstore)):
    return {
        "count": vectorstore._collection.count()
    }