from sqlalchemy import Column, Integer, String, DateTime, ForeignKey
from sqlalchemy.sql import func

from app.database import Base


class QueryHistory(Base):
    __tablename__ = "query_history"

    id = Column(Integer, primary_key=True)

    knowledge_base_id = Column(
        Integer,
        ForeignKey("knowledge_bases.id"),
        nullable=False,
    )

    query = Column(String, nullable=False)

    response_time = Column(Integer, nullable=True)

    created_at = Column(
        DateTime,
        server_default=func.now(),
    )