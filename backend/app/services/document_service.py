from __future__ import annotations

import logging
import os
import uuid
from typing import List

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.document import Document, DocumentResponse
from app.models.knowledge_base import KnowledgeBase
from app.services.docs_processor import DocsProcessor
from app.services.embedder import Embedder
from app.services.vectorstore import VectorStore, build_where

logger = logging.getLogger(__name__)

SUPPORTED_EXTENSIONS = {".pdf", ".docx", ".txt"}
MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024

MIME_TYPES = {
    ".pdf": "application/pdf",
    ".docx": (
        "application/vnd.openxmlformats-officedocument"
        ".wordprocessingml.document"
    ),
    ".txt": "text/plain",
}


class UploadError(Exception):
    """Raised when an upload can't be accepted or parsed."""

    def __init__(self, status_code: int, detail: str):
        super().__init__(detail)
        self.status_code = status_code
        self.detail = detail


class DocumentService:
    """Owns the lifecycle of a document inside a knowledge base.

    Every chunk it writes to the vector store carries `owner_id`,
    `knowledge_base_id` and `document_id`, which is what makes both
    tenant-scoped retrieval and precise deletion possible.
    """

    def __init__(
        self,
        session: Session,
        embedder: Embedder,
        vectorstore: VectorStore,
        processor: DocsProcessor | None = None,
        storage_dir: str | None = None,
    ):
        self.session = session
        self.embedder = embedder
        self.vectorstore = vectorstore
        self.processor = processor or DocsProcessor()
        self.storage_dir = storage_dir or os.getenv(
            "DOCUMENT_STORAGE_DIR", "./uploads"
        )

    # --------------------------------------------------
    # Reads
    # --------------------------------------------------

    def list(self, knowledge_base_id: int, owner_id: int) -> List[DocumentResponse]:
        statement = (
            select(Document)
            .where(
                Document.knowledge_base_id == knowledge_base_id,
                Document.user_id == owner_id,
            )
            .order_by(Document.created_at.desc())
        )

        return [
            DocumentResponse.model_validate(document)
            for document in self.session.execute(statement).scalars()
        ]

    # --------------------------------------------------
    # Upload
    # --------------------------------------------------

    def upload(
        self,
        knowledge_base: KnowledgeBase,
        owner_id: int,
        filename: str,
        content: bytes,
        category: str | None = None,
    ) -> DocumentResponse:

        extension = os.path.splitext(filename or "")[1].lower()

        if extension not in SUPPORTED_EXTENSIONS:
            raise UploadError(
                415,
                "Unsupported file type. Upload a .pdf, .docx or .txt file.",
            )

        if len(content) > MAX_FILE_SIZE_BYTES:
            raise UploadError(
                413,
                "File is too large. Upload a document smaller than 50MB.",
            )

        if not content:
            raise UploadError(400, "Uploaded file is empty.")

        stored_path = self._write_to_disk(owner_id, extension, content)

        document = Document(
            user_id=owner_id,
            knowledge_base_id=knowledge_base.id,
            filename=os.path.basename(stored_path),
            original_filename=filename,
            file_path=stored_path,
            mime_type=MIME_TYPES.get(extension),
            size=len(content),
            category=category or "General",
            status="processing",
        )

        self.session.add(document)
        self.session.commit()
        self.session.refresh(document)

        try:
            pages = self.processor.load_file(stored_path, filename=filename)

            if not pages:
                raise UploadError(400, "Unable to parse uploaded content.")

            chunk_count = self._index(document, knowledge_base, owner_id, pages)

            document.pages = len(pages)
            document.chunks = chunk_count
            document.status = "ready"
            knowledge_base.status = "ready"

            self.session.add(document)
            self.session.add(knowledge_base)
            self.session.commit()
            self.session.refresh(document)

        except Exception:
            # Indexing failed — don't leave a half-written document behind.
            logger.exception("Indexing failed for document %s", document.id)
            self._discard(document, owner_id)
            raise

        return DocumentResponse.model_validate(document)

    # --------------------------------------------------
    # Delete
    # --------------------------------------------------

    def delete(
        self,
        document_id: int,
        knowledge_base_id: int,
        owner_id: int,
    ) -> bool:
        document = self.session.execute(
            select(Document).where(
                Document.id == document_id,
                Document.knowledge_base_id == knowledge_base_id,
                Document.user_id == owner_id,
            )
        ).scalars().first()

        if document is None:
            return False

        file_path = document.file_path

        self.vectorstore.delete(
            build_where(owner_id=owner_id, document_id=document.id)
        )

        self.session.delete(document)
        self.session.commit()

        _remove_file(file_path)

        logger.info("Deleted document %s", document_id)
        return True

    # --------------------------------------------------
    # Internals
    # --------------------------------------------------

    def _index(
        self,
        document: Document,
        knowledge_base: KnowledgeBase,
        owner_id: int,
        pages: list[dict],
    ) -> int:
        documents = [
            {
                "text": self.processor.clean_text(page["text"]),
                "source": document.original_filename or document.filename,
                "page": page["page"],
                "category": document.category,
            }
            for page in pages
        ]

        chunks = self.processor.process_documents(documents)

        for chunk in chunks:
            chunk["metadata"]["owner_id"] = owner_id
            chunk["metadata"]["knowledge_base_id"] = knowledge_base.id
            chunk["metadata"]["document_id"] = document.id

        embedded_chunks = self.embedder.embed_chunks_from_processed(chunks)
        return self.vectorstore.store(embedded_chunks)

    def _write_to_disk(
        self,
        owner_id: int,
        extension: str,
        content: bytes,
    ) -> str:
        directory = os.path.join(self.storage_dir, str(owner_id))
        os.makedirs(directory, exist_ok=True)

        path = os.path.join(directory, f"{uuid.uuid4().hex}{extension}")

        with open(path, "wb") as handle:
            handle.write(content)

        return path

    def _discard(self, document: Document, owner_id: int) -> None:
        """Best-effort cleanup after a failed upload."""
        try:
            self.vectorstore.delete(
                build_where(owner_id=owner_id, document_id=document.id)
            )
        except Exception:
            logger.warning(
                "Could not clean up vectors for document %s",
                document.id,
                exc_info=True,
            )

        _remove_file(document.file_path)

        try:
            self.session.delete(document)
            self.session.commit()
        except Exception:
            self.session.rollback()
            logger.warning(
                "Could not remove document row %s", document.id, exc_info=True
            )


def _remove_file(path: str | None) -> None:
    if not path:
        return

    try:
        if os.path.exists(path):
            os.remove(path)
    except OSError:
        logger.warning("Could not remove file %s", path, exc_info=True)
