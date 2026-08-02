import json
import logging


from app.services.rag.service import RAGService

from openai import APIError, APITimeoutError, RateLimitError
from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from app.dependencies import get_rag_service
from app.models.query import QueryRequest
from app.services.llm.provider_factory import get_llm_provider


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
    return f"event: {event}\ndata: {data}\n\n"


# ---------------------------------------------------------------------------
# Route
# ---------------------------------------------------------------------------
@router.post("/stream")
async def query_stream(
    payload: QueryRequest,
    rag_service: RAGService = Depends(get_rag_service),
) -> StreamingResponse:

    # -----------------------------------------------------------------------

    # Retrieve relevant context

    # -----------------------------------------------------------------------

    retrieval = await rag_service.retrieve(payload)

    context = retrieval["context"]

    sources = retrieval["sources"]

    retrieved_documents = retrieval["retrieved_documents"]

    logger.info(
        "Context size: %s chars | Sources: %s",
        len(context),
        sources,
    )

    async def stream_response():
        try:
            llm_provider = get_llm_provider()

            logger.info("Sending request to configured LLM provider")

            response = await llm_provider.stream_chat(
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

            # Stream has finished — send metadata once
            yield sse(
                "retrieved_documents",
                json.dumps(retrieved_documents),
            )

            yield sse("sources", sources)
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
    )


@router.post("/results", response_model=QueryResultsResponse)
async def query_results(
    payload: QueryRequest,
    rag_service: RAGService = Depends(get_rag_service),
) -> QueryResultsResponse:

    retrieval = await rag_service.retrieve(payload)

    return QueryResultsResponse(
        results=[
            QueryResultItem(**document) for document in retrieval["retrieved_documents"]
        ]
    )
