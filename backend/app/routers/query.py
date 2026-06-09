from google import genai
from google.genai import types
from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse

from app.dependencies import get_embedder, get_vectorstore
from app.services.embedder import Embedder
from app.services.vectorstore import VectorStore
from app.models.query import QueryRequest

router = APIRouter(prefix="/query", tags=["query"])
gemini_client = genai.Client()

SYSTEM_PROMPT = """You are a helpful assistant that answers questions based strictly on the provided context.
If the answer is not in the context, say "I don't have enough information to answer that."
Do not make up information. Be concise and direct."""


def build_context(chunks: list[dict]) -> str:
    parts = []
    for i, chunk in enumerate(chunks, 1):
        source = chunk["metadata"].get("source", "unknown")
        page = chunk["metadata"].get("page", "?")
        parts.append(f"[{i}] (source: {source}, page: {page})\n{chunk['content']}")
    return "\n\n".join(parts)


def format_sources(chunks: list[dict]) -> str:
    seen = set()
    sources = []
    for chunk in chunks:
        source = chunk["metadata"].get("source", "unknown")
        page = chunk["metadata"].get("page", "?")
        key = f"{source}::{page}"
        if key not in seen:
            seen.add(key)
            sources.append(f"{source} (page {page})")
    return ", ".join(sources)


@router.post("/stream")
async def query_stream(
    payload: QueryRequest,
    embedder: Embedder = Depends(get_embedder),
    vectorstore: VectorStore = Depends(get_vectorstore),
):
    # 1. Embed the question
    result = embedder.embed_texts([payload.question])
    question_embedding = result.embeddings[0]

    # 2. Retrieve relevant chunks from ChromaDB
    chunks = vectorstore.query(question_embedding, n_results=5)

    if not chunks:
        async def empty_stream():
            yield "I couldn't find any relevant information to answer your question."
        return StreamingResponse(empty_stream(), media_type="text/event-stream")

    # 3. Build context from chunks
    context = build_context(chunks)
    sources = format_sources(chunks)

    # 4. Stream answer from Gemini
    async def stream_response():
        response = gemini_client.models.generate_content_stream(
            model="gemini-2.5-flash",
            contents=f"Context:\n{context}\n\nQuestion: {payload.question}",
            config=types.GenerateContentConfig(
                system_instruction=SYSTEM_PROMPT,
                max_output_tokens=1024,
            ),
        )
        for chunk in response:
            if chunk.text:
                yield chunk.text

        yield f"\n\n[SOURCES]: {sources}"

    return StreamingResponse(stream_response(), media_type="text/event-stream")