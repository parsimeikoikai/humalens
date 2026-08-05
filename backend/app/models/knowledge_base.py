from datetime import datetime

from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, JSON
from sqlalchemy.sql import func
from pydantic import BaseModel, ConfigDict, Field

from app.database import Base


class KnowledgeBase(Base):
    __tablename__ = "knowledge_bases"

    id = Column(Integer, primary_key=True)

    owner_id = Column(Integer, ForeignKey("users.id"), nullable=False)

    name = Column(String, nullable=False)

    description = Column(String, nullable=True)

    tags = Column(JSON, nullable=False, default=list)

    visibility = Column(String, default="private")

    # empty | indexing | ready | failed
    status = Column(String, default="empty")

    created_at = Column(DateTime, server_default=func.now())

    updated_at = Column(
        DateTime,
        server_default=func.now(),
        onupdate=func.now(),
    )


class CreateKnowledgeBaseRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=60)
    description: str | None = Field(None, max_length=200)
    tags: list[str] = Field(default_factory=list, max_length=5)
    visibility: str = "private"


class UpdateKnowledgeBaseRequest(BaseModel):
    name: str | None = Field(None, min_length=1, max_length=60)
    description: str | None = Field(None, max_length=200)
    tags: list[str] | None = Field(None, max_length=5)
    visibility: str | None = None


class KnowledgeBaseResponse(BaseModel):
    """A knowledge base plus the document stats the UI renders on each card."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    description: str | None = None
    tags: list[str] = Field(default_factory=list)
    visibility: str = "private"
    status: str = "empty"
    created_at: datetime | None = None
    updated_at: datetime | None = None

    document_count: int = 0
    chunk_count: int = 0
    total_size: int = 0
