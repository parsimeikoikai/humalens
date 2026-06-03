from fastapi import APIRouter

router = APIRouter(prefix="/ingest", tags=["ingest"])


@router.post("/api")
def ingest_from_api():
    """POST /ingest/api"""
    raise NotImplementedError


@router.post("/pdf")
def ingest_from_pdf():
    """POST /ingest/pdf"""
    raise NotImplementedError

