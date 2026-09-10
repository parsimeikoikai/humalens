from datetime import datetime

from fastapi import APIRouter, Depends
from pydantic import BaseModel, EmailStr
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_admin
from app.models.document import Document
from app.models.user import User


router = APIRouter(
    prefix="/admin",
    tags=["admin"],
    # Every route here reads across tenants, so the whole router is gated on
    # an operator account rather than each handler remembering to ask.
    dependencies=[Depends(get_current_admin)],
)


class UserSummary(BaseModel):
    id: int
    email: EmailStr
    full_name: str | None = None


class DocumentSummary(BaseModel):
    id: int
    user_id: int
    filename: str
    status: str | None = None
    created_at: datetime | None = None


class AdminOverviewResponse(BaseModel):
    users: list[UserSummary]
    documents: list[DocumentSummary]


@router.get("/overview", response_model=AdminOverviewResponse)
def list_users_and_documents(db: Session = Depends(get_db)) -> AdminOverviewResponse:
    users = db.execute(select(User).order_by(User.id)).scalars().all()
    documents = db.execute(select(Document).order_by(Document.created_at.desc())).scalars().all()

    return AdminOverviewResponse(
        users=[
            UserSummary(
                id=user.id,
                email=user.email,
                full_name=user.full_name,
            )
            for user in users
        ],
        documents=[
            DocumentSummary(
                id=document.id,
                user_id=document.user_id,
                filename=document.filename,
                status=document.status,
                created_at=document.created_at,
            )
            for document in documents
        ],
    )
