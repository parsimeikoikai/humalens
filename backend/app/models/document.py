from sqlalchemy import Column, Integer, String, ForeignKey, DateTime
from sqlalchemy.sql import func
from app.database import Base


class Document(Base):
    __tablename__ = "documents"

    id = Column(Integer, primary_key=True)

    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)

    filename = Column(String, nullable=False)

    file_path = Column(String, nullable=False)

    status = Column(String, default="pending")  # pending, processing, done, failed

    created_at = Column(DateTime, server_default=func.now())