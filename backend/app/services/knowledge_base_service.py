from __future__ import annotations

import logging
import os
from typing import List

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.document import Document
from app.models.knowledge_base import (
    KnowledgeBase,
    KnowledgeBaseResponse,
    CreateKnowledgeBaseRequest,
    UpdateKnowledgeBaseRequest,
)
from app.services.vectorstore import VectorStore, build_where

logger = logging.getLogger(__name__)

VALID_VISIBILITIES = {"private", "public"}


class KnowledgeBaseService:
    def __init__(self, session: Session, vectorstore: VectorStore):
        self.session = session
        self.vectorstore = vectorstore

    # --------------------------------------------------
    # Reads
    # --------------------------------------------------

    def list(self, owner_id: int) -> List[KnowledgeBaseResponse]:
        statement = (
            select(KnowledgeBase)
            .where(KnowledgeBase.owner_id == owner_id)
            .order_by(KnowledgeBase.created_at.desc())
        )
        knowledge_bases = list(self.session.execute(statement).scalars())

        stats = self._stats_by_knowledge_base(
            [kb.id for kb in knowledge_bases]
        )

        return [
            self._to_response(kb, stats.get(kb.id))
            for kb in knowledge_bases
        ]

    def get(self, knowledge_base_id: int, owner_id: int) -> KnowledgeBase | None:
        statement = select(KnowledgeBase).where(
            KnowledgeBase.id == knowledge_base_id,
            KnowledgeBase.owner_id == owner_id,
        )
        return self.session.execute(statement).scalars().first()

    def get_response(
        self,
        knowledge_base_id: int,
        owner_id: int,
    ) -> KnowledgeBaseResponse | None:
        kb = self.get(knowledge_base_id, owner_id)

        if kb is None:
            return None

        stats = self._stats_by_knowledge_base([kb.id])
        return self._to_response(kb, stats.get(kb.id))

    # --------------------------------------------------
    # Writes
    # --------------------------------------------------

    def create(
        self,
        owner_id: int,
        payload: CreateKnowledgeBaseRequest,
    ) -> KnowledgeBaseResponse:

        kb = KnowledgeBase(
            owner_id=owner_id,
            name=payload.name.strip(),
            description=payload.description,
            tags=payload.tags,
            visibility=_normalize_visibility(payload.visibility),
            status="empty",
        )

        self.session.add(kb)
        self.session.commit()
        self.session.refresh(kb)

        return self._to_response(kb, None)

    def update(
        self,
        knowledge_base_id: int,
        owner_id: int,
        payload: UpdateKnowledgeBaseRequest,
    ) -> KnowledgeBaseResponse | None:

        kb = self.get(knowledge_base_id, owner_id)

        if not kb:
            return None

        if payload.name is not None:
            kb.name = payload.name.strip()

        if payload.description is not None:
            kb.description = payload.description

        if payload.tags is not None:
            kb.tags = payload.tags

        if payload.visibility is not None:
            kb.visibility = _normalize_visibility(payload.visibility)

        self.session.add(kb)
        self.session.commit()
        self.session.refresh(kb)

        stats = self._stats_by_knowledge_base([kb.id])
        return self._to_response(kb, stats.get(kb.id))

    def delete(self, knowledge_base_id: int, owner_id: int) -> bool:
        """Hard-delete a knowledge base: files, rows, and embedded chunks."""

        kb = self.get(knowledge_base_id, owner_id)

        if not kb:
            return False

        documents = list(
            self.session.execute(
                select(Document).where(
                    Document.knowledge_base_id == kb.id,
                    Document.user_id == owner_id,
                )
            ).scalars()
        )

        file_paths = [document.file_path for document in documents]

        for document in documents:
            self.session.delete(document)

        # Drop the embeddings before committing the row deletions. If Chroma
        # fails we roll back, so the KB keeps pointing at its vectors instead
        # of leaving orphans that nothing can reach or clean up later.
        try:
            self.vectorstore.delete(
                build_where(
                    owner_id=owner_id,
                    knowledge_base_id=kb.id,
                )
            )
        except Exception:
            self.session.rollback()
            logger.exception(
                "Failed to delete vectors for knowledge base %s", kb.id
            )
            raise

        self.session.delete(kb)
        self.session.commit()

        # Only unlink once the rows are gone for good — a failed commit would
        # otherwise leave records pointing at files that no longer exist.
        for path in file_paths:
            _remove_file(path)

        logger.info(
            "Deleted knowledge base %s (%s documents)", kb.id, len(documents)
        )
        return True

    def mark_status(self, knowledge_base_id: int, status: str) -> None:
        kb = self.session.get(KnowledgeBase, knowledge_base_id)

        if kb is None:
            return

        kb.status = status
        self.session.add(kb)
        self.session.commit()

    # --------------------------------------------------
    # Internals
    # --------------------------------------------------

    def _stats_by_knowledge_base(self, knowledge_base_ids: list[int]) -> dict:
        if not knowledge_base_ids:
            return {}

        rows = self.session.execute(
            select(
                Document.knowledge_base_id,
                func.count(Document.id),
                func.coalesce(func.sum(Document.chunks), 0),
                func.coalesce(func.sum(Document.size), 0),
            )
            .where(Document.knowledge_base_id.in_(knowledge_base_ids))
            .group_by(Document.knowledge_base_id)
        ).all()

        return {
            kb_id: {
                "document_count": document_count,
                "chunk_count": chunk_count,
                "total_size": total_size,
            }
            for kb_id, document_count, chunk_count, total_size in rows
        }

    def _to_response(
        self,
        kb: KnowledgeBase,
        stats: dict | None,
    ) -> KnowledgeBaseResponse:
        response = KnowledgeBaseResponse.model_validate(kb)

        if stats:
            response.document_count = stats["document_count"]
            response.chunk_count = stats["chunk_count"]
            response.total_size = stats["total_size"]

        return response


def _normalize_visibility(visibility: str) -> str:
    value = (visibility or "private").lower().strip()
    return value if value in VALID_VISIBILITIES else "private"


def _remove_file(path: str | None) -> None:
    if not path:
        return

    try:
        if os.path.exists(path):
            os.remove(path)
    except OSError:
        logger.warning("Could not remove file %s", path, exc_info=True)
