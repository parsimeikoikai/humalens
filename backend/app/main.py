"""FastAPI app entry point."""

from contextlib import asynccontextmanager

from dotenv import load_dotenv

load_dotenv()

from app.core.dependencies import register_dependencies
from app.core.config import settings


@asynccontextmanager
async def lifespan(app):
    # Load the embedding model once, single-threaded, before accepting any
    # requests. get_embedder() is @lru_cache'd, so without this warmup the
    # first concurrent requests could all race to construct it at once —
    # which triggers a threading bug in huggingface_hub's model download
    # (tqdm's class-level lock isn't thread-safe across simultaneous
    # snapshot_download calls).
    from app.dependencies import get_embedder

    get_embedder()
    yield


def create_app():
    from fastapi import FastAPI
    from fastapi.middleware.cors import CORSMiddleware

    register_dependencies()

    app = FastAPI(title=settings.PROJECT_NAME, lifespan=lifespan)
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.CORS_ORIGINS,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    from app.routers.ingest import router as ingest_router
    from app.routers.query import router as query_router
    from app.routers.auth import router as auth_router
    from app.routers.admin import router as admin_router
    from app.routers.knowledge_base import router as knowledge_base_router

    app.include_router(ingest_router)
    app.include_router(query_router)
    app.include_router(auth_router)
    app.include_router(admin_router)
    app.include_router(knowledge_base_router)

    return app


app = create_app() 
