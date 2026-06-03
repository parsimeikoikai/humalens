from fastapi import APIRouter

router = APIRouter(prefix="/query", tags=["query"])


@router.get("/stream")
def query_stream():
    """GET /query/stream (SSE)."""
    raise NotImplementedError

