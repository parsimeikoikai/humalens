from fastapi import APIRouter, Depends

from app.dependencies import (
    get_current_user,
    get_knowledge_base_service,
)
from app.models.knowledge_base import (
    CreateKnowledgeBaseRequest,
)
from app.models.user import User
from app.services.knowledge_base_service import KnowledgeBaseService

router = APIRouter(prefix="/knowledge-bases", tags=["knowledge-bases"])


@router.post("")
def create(
    payload: CreateKnowledgeBaseRequest,
    current_user: User = Depends(get_current_user),
    service: KnowledgeBaseService = Depends(get_knowledge_base_service),
):
    return service.create(current_user.id, payload)


@router.get("")
def list_knowledge_bases(
    current_user: User = Depends(get_current_user),
    service: KnowledgeBaseService = Depends(get_knowledge_base_service),
):
    return service.list(owner_id=current_user.id)

