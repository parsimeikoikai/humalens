from pydantic import AliasChoices, BaseModel, ConfigDict, Field

MAX_QUESTION_CHARS = 2000
MAX_TOP_K = 20


class QueryRequest(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    question: str = Field(
        ...,
        min_length=1,
        max_length=MAX_QUESTION_CHARS,
        description="Natural language question to ask",
    )

    # Bounded so a client can't ask for a context window's worth of chunks
    # and turn one request into an expensive retrieval + generation.
    top_k: int | None = Field(
        None,
        ge=1,
        le=MAX_TOP_K,
        description="Number of results to retrieve from the vector store",
    )

    # `crisis_types` is the original name from when this only indexed
    # humanitarian reports; it stays accepted so existing callers keep working.
    categories: list[str] | None = Field(
        None,
        validation_alias=AliasChoices("categories", "crisis_types"),
        description="Restrict retrieval to documents in these categories",
    )

    knowledge_base_id: int | None = Field(
        None,
        description=(
            "Restrict retrieval to a single knowledge base. When omitted, "
            "all of the caller's knowledge bases are searched."
        ),
    )
