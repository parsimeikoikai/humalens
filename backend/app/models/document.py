from sqlalchemy import Column, Integer, String, ForeignKey, DateTime
from sqlalchemy.sql import func

from app.database import Base


class Document(Base):
    __tablename__ = "documents"

    id = Column(Integer, primary_key=True)

    # Owner of the document
    user_id = Column(
        Integer,
        ForeignKey("users.id"),
        nullable=False,
    )

    # Knowledge base this document belongs to
    knowledge_base_id = Column(
        Integer,
        ForeignKey("knowledge_bases.id"),
        nullable=False,
    )

    # Stored filename on disk
    filename = Column(String, nullable=False)

    # Original filename uploaded by the user
    original_filename = Column(String, nullable=True)

    # File storage path
    file_path = Column(String, nullable=False)

    # MIME type
    mime_type = Column(String, nullable=True)

    # Size in bytes
    size = Column(Integer, nullable=True)

    # Optional metadata
    category = Column(String, nullable=True)

    language = Column(String, nullable=True)

    pages = Column(Integer, nullable=True)

    chunks = Column(Integer, default=0)

    # pending | processing | ready | failed
    status = Column(String, default="pending")

    created_at = Column(
        DateTime,
        server_default=func.now(),
    )

    updated_at = Column(
        DateTime,
        server_default=func.now(),
        onupdate=func.now(),
    )