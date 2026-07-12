from sqlalchemy import Column, Integer, String, DateTime, ForeignKey
from sqlalchemy.sql import func

from app.database import Base


class IndexingJob(Base):
    __tablename__ = "indexing_jobs"

    id = Column(Integer, primary_key=True)

    document_id = Column(
        Integer,
        ForeignKey("documents.id"),
        nullable=False,
        unique=True,
    )

    # queued | processing | completed | failed
    status = Column(String, default="queued")

    progress = Column(Integer, default=0)

    started_at = Column(
        DateTime,
        server_default=func.now(),
    )

    completed_at = Column(DateTime, nullable=True)

    error = Column(String, nullable=True)