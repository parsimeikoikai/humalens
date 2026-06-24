import logging
import os

from openai import AsyncOpenAI, APIError, APITimeoutError, RateLimitError
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from app.core.config import settings
from app.dependencies import get_embedder, get_vectorstore
from app.services.embedder import Embedder
from app.services.vectorstore import VectorStore
from app.models.query import QueryRequest


logger = logging.getLogger(__name__)

router = APIRouter(prefix="/query", tags=["query"])


openai_client = AsyncOpenAI(

    api_key=os.getenv("OPENAI_API_KEY")

)
SYSTEM_PROMPT = """You are a helpful assistant that answers questions based strictly on the provided context.
If the answer is not in the context, say "I don't have enough information to answer that."
Do not make up information. Be concise and direct."""

MAX_CONTEXT_CHARS = 6_000
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
    """Format a single SSE message."""
    return f"event: {event}\ndata: {data}\n\n"


# ---------------------------------------------------------------------------
# Route
# ---------------------------------------------------------------------------

@router.post("/stream")
async def query_stream(
    payload: QueryRequest,
    embedder: Embedder = Depends(get_embedder),
    vectorstore: VectorStore = Depends(get_vectorstore),
) -> StreamingResponse:
    # 1. Embed the question
    try:
        result = embedder.embed_texts([payload.question])
        question_embedding = result.embeddings[0]
    except Exception as e:
        logger.exception("Embedding failed for question: %s", payload.question)
        raise HTTPException(status_code=500, detail="Failed to embed question.") from e

    # 2. Retrieve relevant chunks
    top_k = getattr(payload, "top_k", DEFAULT_TOP_K) or DEFAULT_TOP_K
    try:
        chunks = vectorstore.query(question_embedding, n_results=top_k)
    except Exception as e:
        logger.exception("Vector store query failed.")
        raise HTTPException(status_code=500, detail="Failed to retrieve context.") from e

    if not chunks:
        async def empty_stream():
            yield sse("message", "I couldn't find any relevant information to answer your question.")
            yield sse("done", "")

        return StreamingResponse(empty_stream(), media_type="text/event-stream")

    # 3. Build context
    context = build_context(chunks)
    sources = format_sources(chunks)

    # 4. Stream answer
    async def stream_response():
        try:
            response = await openai_client.chat.completions.create(
                model="gpt-3.5-turbo",
                messages=[
                    {"role": "system", "content": SYSTEM_PROMPT},
                    {
                        "role": "user",
                        "content": f"Context:\n{context}\n\nQuestion: {payload.question}",
                    },
                ],
                max_tokens=512,
                stream=True,
            )

            async for chunk in response:
                if not chunk.choices:
                    continue
                content = chunk.choices[0].delta.content
                if content:
                    yield sse("message", content)

            yield sse("sources", sources)
            yield sse("done", "")

        except RateLimitError:
            logger.warning("OpenAI rate limit hit.")
            yield sse("error", "Rate limit reached. Please try again shortly.")
        except APITimeoutError:
            logger.warning("OpenAI request timed out.")
            yield sse("error", "The request timed out. Please try again.")
        except APIError as e:
            logger.exception("OpenAI API error: %s", e)
            yield sse("error", "An error occurred while generating the response.")
        except Exception as e:
            logger.exception("Unexpected error during streaming: %s", e)
            yield sse("error", "An unexpected error occurred.")

    return StreamingResponse(stream_response(), media_type="text/event-stream")