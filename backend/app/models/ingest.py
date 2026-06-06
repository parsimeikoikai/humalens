from typing import Dict, List, Optional

from pydantic import BaseModel, Field


class DocumentPayload(BaseModel):
    text: str = Field(..., description="Document text to ingest.")
    source: Optional[str] = Field(None, description="Optional source name for the document.")
    page: Optional[int] = Field(1, description="Optional page number or section identifier.")


class IngestRequest(BaseModel):
    documents: List[DocumentPayload]


class ProcessedChunk(BaseModel):
    content: str
    source: str
    metadata: Dict[str, object]


class IngestResponse(BaseModel):
    processed_chunks: List[ProcessedChunk]
