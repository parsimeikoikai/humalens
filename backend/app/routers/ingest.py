import os
from tempfile import NamedTemporaryFile
from typing import List

from fastapi import APIRouter, File, HTTPException, UploadFile

from app.models.ingest import IngestRequest, IngestResponse
from app.services.docs_processor import DocsProcessor

router = APIRouter(prefix="/ingest", tags=["ingest"])
processor = DocsProcessor()


@router.post("/api", response_model=IngestResponse)
def ingest_from_api(payload: IngestRequest):
    """POST /ingest/api"""
    documents = [
        {
            "text": processor.clean_text(document.text),
            "source": document.source or "api",
            "page": document.page or 1,
        }
        for document in payload.documents
    ]

    chunks = processor.process_documents(documents)
    return {"processed_chunks": chunks}


@router.post("/pdf", response_model=IngestResponse)
async def ingest_from_pdf(file: UploadFile = File(...)):
    """POST /ingest/pdf"""
    if file.content_type != "application/pdf":
        raise HTTPException(status_code=415, detail="Only PDF uploads are supported.")

    with NamedTemporaryFile(delete=False, suffix=".pdf") as tmp:
        tmp.write(await file.read())
        temp_path = tmp.name

    try:
        pages = processor.load_pdf(temp_path)
    finally:
        if os.path.exists(temp_path):
            os.remove(temp_path)

    if not pages:
        raise HTTPException(status_code=400, detail="Unable to parse PDF content.")

    documents = [
        {
            "text": processor.clean_text(page["text"]),
            "source": file.filename,
            "page": page["page"],
        }
        for page in pages
    ]

    chunks = processor.process_documents(documents)
    return {"processed_chunks": chunks}

