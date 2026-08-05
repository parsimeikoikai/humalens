from pydantic import BaseModel, Field


class QueryRequest(BaseModel):
    question: str = Field(..., description="Natural language question to ask")
    top_k: int | None = Field(None, description="Number of results to retrieve from the vector store")
    crisis_types: list[str] | None = Field(
        None, description="Restrict retrieval to these crisis type categories"
    )
    knowledge_base_id: int | None = Field(
        None,
        description=(
            "Restrict retrieval to a single knowledge base. When omitted, "
            "all of the caller's knowledge bases are searched."
        ),
    )

