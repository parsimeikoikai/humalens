"""FastAPI app entry point."""

import logging
from contextlib import asynccontextmanager

from dotenv import load_dotenv

load_dotenv()

from app.core.dependencies import register_dependencies
from app.core.config import settings


def _configure_logging() -> None:
    # Without this the module-level loggers throughout the app emit nothing:
    # the root logger has no handler, so every logger.info() is discarded and
    # production has no record of retrieval, indexing, or provider errors.
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s %(levelname)-8s %(name)s: %(message)s",
    )


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

    _configure_logging()
    register_dependencies()

    app = FastAPI(title=settings.PROJECT_NAME, lifespan=lifespan)
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        # Auth travels as a bearer token in the Authorization header, not a
        # cookie, so the browser never needs to send credentials cross-origin.
        # Leaving this on would also make a wildcard origin illegal.
        allow_credentials=False,
        allow_methods=["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
        allow_headers=["Authorization", "Content-Type", "Accept"],
    )

    from app.routers.ingest import router as ingest_router
    from app.routers.query import router as query_router
    from app.routers.auth import router as auth_router
    from app.routers.admin import router as admin_router
    from app.routers.knowledge_base import router as knowledge_base_router
    from app.routers.stats import router as stats_router

    app.include_router(ingest_router)
    app.include_router(query_router)
    app.include_router(auth_router)
    app.include_router(admin_router)
    app.include_router(knowledge_base_router)
    app.include_router(stats_router)

    return app


app = create_app()
