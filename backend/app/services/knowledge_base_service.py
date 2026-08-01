from __future__ import annotations

from typing import List

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.knowledge_base import (
    KnowledgeBase,
    CreateKnowledgeBaseRequest,
    UpdateKnowledgeBaseRequest,
)


class KnowledgeBaseService:
    def __init__(self, session: Session):
        self.session = session

    def list(self, owner_id: str) -> List[KnowledgeBase]:
        statement = (
            select(KnowledgeBase)
            .where(KnowledgeBase.owner_id == owner_id)
            .order_by(KnowledgeBase.created_at.desc())
        )
        return list(self.session.execute(statement).scalars())

    def get(self, knowledge_base_id: str, owner_id: str) -> KnowledgeBase | None:
        statement = select(KnowledgeBase).where(
            KnowledgeBase.id == knowledge_base_id,
            KnowledgeBase.owner_id == owner_id,
        )
        return self.session.execute(statement).scalars().first()

    def create(
        self,
        owner_id: str,
        payload: CreateKnowledgeBaseRequest,
    ) -> KnowledgeBase:

        kb = KnowledgeBase(
            owner_id=owner_id,
            name=payload.name,
            description=payload.description,
            visibility=payload.visibility,
            status="ready",
        )

        self.session.add(kb)
        self.session.commit()
        self.session.refresh(kb)

        return kb

    def update(
        self,
        knowledge_base_id: str,
        owner_id: str,
        payload: UpdateKnowledgeBaseRequest,
    ) -> KnowledgeBase | None:

        kb = self.get(knowledge_base_id, owner_id)

        if not kb:
            return None

        if payload.name is not None:
            kb.name = payload.name

        if payload.description is not None:
            kb.description = payload.description

        if payload.visibility is not None:
            kb.visibility = payload.visibility

        self.session.add(kb)
        self.session.commit()
        self.session.refresh(kb)

        return kb

    def delete(
        self,
        knowledge_base_id: str,
        owner_id: str,
    ) -> bool:

        kb = self.get(knowledge_base_id, owner_id)

        if not kb:
            return False

        self.session.delete(kb)
        self.session.commit()

        return True