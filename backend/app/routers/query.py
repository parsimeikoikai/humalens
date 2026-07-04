import json
import logging
import os
from urllib.parse import urlparse

from openai import APIError, APITimeoutError, RateLimitError
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from app.dependencies import get_embedder, get_vectorstore
from app.models.query import QueryRequest
from app.services.embedder import Embedder
from app.services.llm import (
    client as llm_client,
    CHAT_MODEL,
    LLM_BASE_URL,
)
from app.services.vectorstore import VectorStore


class QueryResultItem(BaseModel):
    id: int
    source: str
    page: int | None = None
    excerpt: str
    score: float


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

MAX_CONTEXT_CHARS = 6000
DEFAULT_TOP_K = 3


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def build_context(chunks: list[dict]) -> str:
    parts = []

    for i, chunk in enumerate(chunks, 1):
        source = chunk["metadata"].get("source", "unknown")
        page = chunk["metadata"].get("page", "?")

        parts.append(f"[{i}] (source: {source}, page: {page})\n{chunk['content']}")

    context = "\n\n".join(parts)

    return context[:MAX_CONTEXT_CHARS]


def format_sources(chunks: list[dict]) -> str:
    seen: set[str] = set()
    sources: list[str] = []

    for chunk in chunks:
        source = chunk["metadata"].get("source")
        page = chunk["metadata"].get("page")

        if not source:
            continue

        key = f"{source}::{page}"

        if key not in seen:
            seen.add(key)

            label = f"{source} (page {page})" if page else source

            sources.append(label)

    return ", ".join(sources) if sources else "unknown"


def sse(event: str, data: str) -> str:
    return f"event: {event}\ndata: {data}\n\n"


def get_llm_extra_headers() -> dict[str, str] | None:
    host = urlparse(LLM_BASE_URL).netloc.lower()

    if host != "openrouter.ai":
        return None

    headers = {
        "X-Title": "Humalens",
    }

    app_url = os.getenv("APP_URL")
    if app_url:
        headers["HTTP-Referer"] = app_url

    return headers


# ---------------------------------------------------------------------------
# Route
# ---------------------------------------------------------------------------
@router.post("/stream")
async def query_stream(
    payload: QueryRequest,
    embedder: Embedder = Depends(get_embedder),
    vectorstore: VectorStore = Depends(get_vectorstore),
) -> StreamingResponse:

    # -----------------------------------------------------------------------
    # Embed Question
    # -----------------------------------------------------------------------

    try:
        logger.info("Embedding question: %s", payload.question[:100])

        result = embedder.embed_texts([payload.question])
        question_embedding = result.embeddings[0]

    except Exception as e:
        logger.exception("Question embedding failed")
        raise HTTPException(
            status_code=500,
            detail="Failed to embed question.",
        ) from e

    # -----------------------------------------------------------------------
    # Retrieve Context
    # -----------------------------------------------------------------------

    top_k = getattr(payload, "top_k", DEFAULT_TOP_K) or DEFAULT_TOP_K

    try:
        chunks = vectorstore.query(
            question_embedding,
            n_results=top_k,
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

    if not chunks:

        async def empty_stream():
            yield sse(
                "message",
                "I couldn't find any relevant information to answer your question.",
            )
            yield sse("done", "")

        return StreamingResponse(
            empty_stream(),
            media_type="text/event-stream",
        )

    retrieved_documents = [
        {
            "id": index + 1,
            "source": chunk["metadata"].get("source", "unknown"),
            "page": chunk["metadata"].get("page"),
            "excerpt": chunk["content"][:280],
            "score": chunk.get("score", 0.0),
        }
        for index, chunk in enumerate(chunks)
    ]

    # -----------------------------------------------------------------------
    # Build Context
    # -----------------------------------------------------------------------

    context = build_context(chunks)
    sources = format_sources(chunks)

    logger.info(
        "Context size: %s chars | Sources: %s",
        len(context),
        sources,
    )

    # -----------------------------------------------------------------------
    # Stream Response
    # -----------------------------------------------------------------------

    async def stream_response():
        try:
            logger.info(
                "Sending request to LLM provider using model %s",
                CHAT_MODEL,
            )

            response = await llm_client.chat.completions.create(
                model=CHAT_MODEL,
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
                max_tokens=512,
                temperature=0,
                stream=True,
                extra_headers=get_llm_extra_headers(),
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
    embedder: Embedder = Depends(get_embedder),
    vectorstore: VectorStore = Depends(get_vectorstore),
) -> QueryResultsResponse:
    try:
        result = embedder.embed_texts([payload.question])
        question_embedding = result.embeddings[0]
    except Exception as e:
        logger.exception("Question embedding failed for results request")
        raise HTTPException(
            status_code=500,
            detail="Failed to embed question.",
        ) from e

    top_k = getattr(payload, "top_k", DEFAULT_TOP_K) or DEFAULT_TOP_K

    try:
        chunks = vectorstore.query(
            question_embedding,
            n_results=top_k,
        )
    except Exception as e:
        logger.exception("Vector store query failed for results request")
        raise HTTPException(
            status_code=500,
            detail="Failed to retrieve results.",
        ) from e

    return QueryResultsResponse(
        results=[
            QueryResultItem(
                id=index + 1,
                source=chunk["metadata"].get("source", "unknown"),
                page=chunk["metadata"].get("page"),
                excerpt=chunk["content"][:280],
                score=chunk.get("score", 0.0),
            )
            for index, chunk in enumerate(chunks)
        ]
    )
