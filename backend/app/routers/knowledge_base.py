from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status

from app.dependencies import (
    get_current_user,
    get_document_service,
    get_knowledge_base_service,
)
from app.models.document import DocumentResponse
from app.models.knowledge_base import (
    CreateKnowledgeBaseRequest,
    KnowledgeBaseResponse,
    UpdateKnowledgeBaseRequest,
)
from app.models.user import User
from app.services.document_service import DocumentService, UploadError
from app.services.knowledge_base_service import KnowledgeBaseService

router = APIRouter(prefix="/knowledge-bases", tags=["knowledge-bases"])

NOT_FOUND = HTTPException(
    status_code=status.HTTP_404_NOT_FOUND,
    detail="Knowledge base not found",
)


# ---------------------------------------------------------------------------
# Knowledge bases
# ---------------------------------------------------------------------------


@router.post(
    "",
    response_model=KnowledgeBaseResponse,
    status_code=status.HTTP_201_CREATED,
)
def create(
    payload: CreateKnowledgeBaseRequest,
    current_user: User = Depends(get_current_user),
    service: KnowledgeBaseService = Depends(get_knowledge_base_service),
) -> KnowledgeBaseResponse:
    return service.create(current_user.id, payload)


@router.get("", response_model=list[KnowledgeBaseResponse])
def list_knowledge_bases(
    current_user: User = Depends(get_current_user),
    service: KnowledgeBaseService = Depends(get_knowledge_base_service),
) -> list[KnowledgeBaseResponse]:
    return service.list(owner_id=current_user.id)


@router.get("/{knowledge_base_id}", response_model=KnowledgeBaseResponse)
def get_knowledge_base(
    knowledge_base_id: int,
    current_user: User = Depends(get_current_user),
    service: KnowledgeBaseService = Depends(get_knowledge_base_service),
) -> KnowledgeBaseResponse:
    knowledge_base = service.get_response(knowledge_base_id, current_user.id)

    if knowledge_base is None:
        raise NOT_FOUND

    return knowledge_base


@router.patch("/{knowledge_base_id}", response_model=KnowledgeBaseResponse)
def update(
    knowledge_base_id: int,
    payload: UpdateKnowledgeBaseRequest,
    current_user: User = Depends(get_current_user),
    service: KnowledgeBaseService = Depends(get_knowledge_base_service),
) -> KnowledgeBaseResponse:
    knowledge_base = service.update(knowledge_base_id, current_user.id, payload)

    if knowledge_base is None:
        raise NOT_FOUND

    return knowledge_base


@router.delete("/{knowledge_base_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete(
    knowledge_base_id: int,
    current_user: User = Depends(get_current_user),
    service: KnowledgeBaseService = Depends(get_knowledge_base_service),
) -> None:
    if not service.delete(knowledge_base_id, current_user.id):
        raise NOT_FOUND


# ---------------------------------------------------------------------------
# Documents inside a knowledge base
# ---------------------------------------------------------------------------


@router.get(
    "/{knowledge_base_id}/documents",
    response_model=list[DocumentResponse],
)
def list_documents(
    knowledge_base_id: int,
    current_user: User = Depends(get_current_user),
    knowledge_bases: KnowledgeBaseService = Depends(get_knowledge_base_service),
    documents: DocumentService = Depends(get_document_service),
) -> list[DocumentResponse]:
    if knowledge_bases.get(knowledge_base_id, current_user.id) is None:
        raise NOT_FOUND

    return documents.list(knowledge_base_id, current_user.id)


@router.post(
    "/{knowledge_base_id}/documents",
    response_model=DocumentResponse,
    status_code=status.HTTP_201_CREATED,
)
async def upload_document(
    knowledge_base_id: int,
    file: UploadFile = File(...),
    category: str = Form("General"),
    current_user: User = Depends(get_current_user),
    knowledge_bases: KnowledgeBaseService = Depends(get_knowledge_base_service),
    documents: DocumentService = Depends(get_document_service),
) -> DocumentResponse:
    knowledge_base = knowledge_bases.get(knowledge_base_id, current_user.id)

    if knowledge_base is None:
        raise NOT_FOUND

    try:
        return documents.upload(
            knowledge_base=knowledge_base,
            owner_id=current_user.id,
            filename=file.filename or "",
            content=await file.read(),
            category=category,
        )
    except UploadError as error:
        raise HTTPException(
            status_code=error.status_code,
            detail=error.detail,
        ) from error


@router.delete(
    "/{knowledge_base_id}/documents/{document_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def delete_document(
    knowledge_base_id: int,
    document_id: int,
    current_user: User = Depends(get_current_user),
    knowledge_bases: KnowledgeBaseService = Depends(get_knowledge_base_service),
    documents: DocumentService = Depends(get_document_service),
) -> None:
    if knowledge_bases.get(knowledge_base_id, current_user.id) is None:
        raise NOT_FOUND

    if not documents.delete(document_id, knowledge_base_id, current_user.id):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found",
        )
