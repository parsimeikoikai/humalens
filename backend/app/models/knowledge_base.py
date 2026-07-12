from sqlalchemy import Column, Integer, String, DateTime, ForeignKey
from sqlalchemy.sql import func

from app.database import Base


class KnowledgeBase(Base):
    __tablename__ = "knowledge_bases"

    id = Column(Integer, primary_key=True)

    owner_id = Column(Integer, ForeignKey("users.id"), nullable=False)

    name = Column(String, nullable=False)

    description = Column(String, nullable=True)

    visibility = Column(String, default="private")

    # empty | indexing | ready | failed
    status = Column(String, default="empty")

    created_at = Column(DateTime, server_default=func.now())

    updated_at = Column(
        DateTime,
        server_default=func.now(),
        onupdate=func.now(),
    )