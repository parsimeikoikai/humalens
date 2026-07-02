from pydantic import BaseModel, Field


class QueryRequest(BaseModel):
    question: str = Field(..., description="Natural language question to ask")
    top_k: int | None = Field(None, description="Number of results to retrieve from the vector store")

