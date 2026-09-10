from functools import lru_cache

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.core.config import settings
from app.database import get_db
from app.models.user import User
from app.services.auth_tokens import decode_access_token
from app.services.embedder import Embedder
from app.services.llm.base import BaseLLMProvider
from app.services.llm.provider_factory import get_llm_provider
from app.services.rag import RAGService
from app.services.vectorstore import VectorStore
from app.services.knowledge_base_service import KnowledgeBaseService
from app.services.document_service import DocumentService

_bearer_scheme = HTTPBearer(auto_error=False)


@lru_cache(maxsize=1)
def get_embedder() -> Embedder:
    return Embedder()


@lru_cache(maxsize=1)
def get_vectorstore() -> VectorStore:
    return VectorStore()


def get_rag_service(
    embedder: Embedder = Depends(get_embedder),
    vectorstore: VectorStore = Depends(get_vectorstore),
    llm_provider: BaseLLMProvider = Depends(get_llm_provider),
) -> RAGService:
    return RAGService(
        embedder=embedder,
        vectorstore=vectorstore,
        llm_provider=llm_provider,
    )


def get_knowledge_base_service(
    session: Session = Depends(get_db),
    vectorstore: VectorStore = Depends(get_vectorstore),
) -> KnowledgeBaseService:
    return KnowledgeBaseService(session, vectorstore)


def get_document_service(
    session: Session = Depends(get_db),
    embedder: Embedder = Depends(get_embedder),
    vectorstore: VectorStore = Depends(get_vectorstore),
) -> DocumentService:
    return DocumentService(
        session=session,
        embedder=embedder,
        vectorstore=vectorstore,
    )


def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(_bearer_scheme),
    session: Session = Depends(get_db),
) -> User:
    if credentials is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
        )

    user_id = decode_access_token(credentials.credentials)

    if user_id is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
        )

    user = session.get(User, user_id)

    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
        )

    return user


def get_current_admin(
    current_user: User = Depends(get_current_user),
) -> User:
    """Operator-only access, for the routes that read across every tenant.

    Membership is configured out-of-band via ADMIN_EMAILS rather than stored
    on the user, so no ordinary sign-up path can ever grant it. An empty
    allowlist means nobody is an admin.
    """
    if current_user.email.lower() not in settings.admin_emails:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Administrator access required",
        )

    return current_user
