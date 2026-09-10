"""Public, non-identifying platform counters for the marketing page.

Deliberately counts only — the homepage renders these while signed out, so
nothing here may expose an email address, a filename, or anything else that
belongs to a single tenant.
"""

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.document import Document
from app.models.knowledge_base import KnowledgeBase
from app.models.user import User


router = APIRouter(tags=["stats"])


class PlatformStats(BaseModel):
    users: int
    documents: int
    knowledge_bases: int
    chunks: int


@router.get("/stats", response_model=PlatformStats)
def platform_stats(db: Session = Depends(get_db)) -> PlatformStats:
    def count(model) -> int:
        return db.execute(select(func.count()).select_from(model)).scalar_one()

    chunks = db.execute(
        select(func.coalesce(func.sum(Document.chunks), 0))
    ).scalar_one()

    return PlatformStats(
        users=count(User),
        documents=count(Document),
        knowledge_bases=count(KnowledgeBase),
        chunks=int(chunks),
    )


@router.get("/health", tags=["health"])
def health() -> dict:
    """Liveness probe for load balancers and container orchestrators."""
    return {"status": "ok"}
