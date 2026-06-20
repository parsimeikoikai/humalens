"""FastAPI app entry point."""

from dotenv import load_dotenv

load_dotenv()

from app.core.dependencies import register_dependencies
from app.core.config import settings


def create_app():
    from fastapi import FastAPI

    register_dependencies()

    app = FastAPI(title=settings.PROJECT_NAME)

    from app.routers.ingest import router as ingest_router
    from app.routers.query import router as query_router
    from app.routers.auth import router as auth_router

    app.include_router(ingest_router)
    app.include_router(query_router)
    app.include_router(auth_router)

    return app


app = create_app() 