import json
import logging


from app.services.rag.service import RAGService

from openai import APIError, APITimeoutError, RateLimitError
from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from app.dependencies import (
    get_current_user,
    get_document_service,
    get_rag_service,
)
from app.models.query import QueryRequest
from app.models.user import User
from app.services.document_service import DocumentService


class QueryResultItem(BaseModel):
    id: int
    source: str
    page: int | None = None
    excerpt: str
    score: float
    category: str | None = None


class QueryResultsResponse(BaseModel):
    results: list[QueryResultItem]


logger = logging.getLogger(__name__)

router = APIRouter(prefix="/query", tags=["query"])

SYSTEM_PROMPT = """
You are a helpful assistant that answers questions strictly from the provided context.

Rules:
- Use only the supplied context.
- If the answer is not present in the context, say:
  "I don't have enough information to answer that."
- Do not make up facts.
- Be concise and direct.
"""


def sse(event: str, data: str) -> str:
    """Frame one server-sent event.

    Every line of the payload needs its own `data:` prefix — a bare newline
    inside the value would otherwise be read as the start of an unlabelled
    field, and a blank line would terminate the event early and silently
    truncate whatever followed it.
    """
    body = "\n".join(f"data: {line}" for line in data.split("\n"))

    return f"event: {event}\n{body}\n\n"


# ---------------------------------------------------------------------------
# Route
# ---------------------------------------------------------------------------
@router.post("/stream")
async def query_stream(
    payload: QueryRequest,
    current_user: User = Depends(get_current_user),
    rag_service: RAGService = Depends(get_rag_service),
) -> StreamingResponse:

    # -----------------------------------------------------------------------

    # Retrieve relevant context

    # -----------------------------------------------------------------------

    retrieval = await rag_service.retrieve(payload, owner_id=current_user.id)

    context = retrieval["context"]

    sources = retrieval["sources"]

    retrieved_documents = retrieval["retrieved_documents"]

    logger.info(
        "Context size: %s chars | Sources: %s",
        len(context),
        sources,
    )

    async def stream_response():
        # Retrieval has already finished, so publish what it found before the
        # first token. The sources panel fills in immediately instead of
        # waiting on generation, and they still arrive if the LLM then fails.
        yield sse("retrieved_documents", json.dumps(retrieved_documents))
        yield sse("sources", sources)

        try:
            logger.info("Sending request to configured LLM provider")

            response = await rag_service.llm_provider.stream_chat(
                messages=[
                    {
                        "role": "system",
                        "content": SYSTEM_PROMPT,
                    },
                    {
                        "role": "user",
                        "content": (
                            f"Context:\n{context}\n\nQuestion: {payload.question}"
                        ),
                    },
                ],
                temperature=0,
                max_tokens=512,
            )

            async for chunk in response:
                if not chunk.choices:
                    continue

                content = chunk.choices[0].delta.content

                if content:
                    yield sse("message", content)

            yield sse("done", "")

        except RateLimitError as e:
            logger.exception("LLM provider rate limit error")
            yield sse(
                "error",
                f"LLM provider quota/rate limit error: {str(e)}",
            )

        except APITimeoutError as e:
            logger.exception("LLM provider timeout")
            yield sse(
                "error",
                f"LLM provider timeout: {str(e)}",
            )

        except APIError as e:
            logger.exception("LLM provider API error")
            yield sse(
                "error",
                f"LLM provider API error: {str(e)}",
            )

        except Exception as e:
            logger.exception("Unexpected error")
            yield sse(
                "error",
                f"Unexpected error: {str(e)}",
            )

    return StreamingResponse(
        stream_response(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            # nginx buffers proxied responses by default, which holds the
            # whole answer back until generation finishes.
            "X-Accel-Buffering": "no",
        },
    )


@router.post("/results", response_model=QueryResultsResponse)
async def query_results(
    payload: QueryRequest,
    current_user: User = Depends(get_current_user),
    rag_service: RAGService = Depends(get_rag_service),
) -> QueryResultsResponse:

    retrieval = await rag_service.retrieve(payload, owner_id=current_user.id)

    return QueryResultsResponse(
        results=[
            QueryResultItem(**document) for document in retrieval["retrieved_documents"]
        ]
    )


@router.get("/categories", response_model=list[str])
def query_categories(
    knowledge_base_id: int | None = None,
    current_user: User = Depends(get_current_user),
    documents: DocumentService = Depends(get_document_service),
) -> list[str]:
    """Category values the caller can actually filter a search by."""
    return documents.categories(
        owner_id=current_user.id,
        knowledge_base_id=knowledge_base_id,
    )
