MAX_CONTEXT_CHARS = 6000


def build_context(chunks: list[dict]) -> str:
    parts = []

    for i, chunk in enumerate(chunks, 1):
        source = chunk["metadata"].get("source", "unknown")
        page = chunk["metadata"].get("page", "?")

        parts.append(
            f"[{i}] (source: {source}, page: {page})\n"
            f"{chunk['content']}"
        )

    return "\n\n".join(parts)[:MAX_CONTEXT_CHARS]


def format_sources(chunks: list[dict]) -> str:
    seen = set()
    sources = []

    for chunk in chunks:
        source = chunk["metadata"].get("source")
        page = chunk["metadata"].get("page")

        if not source:
            continue

        key = f"{source}::{page}"

        if key not in seen:
            seen.add(key)

            label = (
                f"{source} (page {page})"
                if page
                else source
            )

            sources.append(label)

    return ", ".join(sources) if sources else "unknown"