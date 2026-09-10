"""Shared fixtures.

The app is exercised against SQLite with the model-backed dependencies
stubbed out: these tests cover routing, authentication and tenant
isolation, not embedding quality, and the real embedder downloads a
~130MB model on first use.
"""

import os
import tempfile

import pytest

os.environ.setdefault("DATABASE_URL", "sqlite:///" + tempfile.mktemp(suffix=".db"))
os.environ.setdefault("JWT_SECRET_KEY", "test-secret")
os.environ.setdefault("ADMIN_EMAILS", "operator@humalens-ops.com")

from fastapi.testclient import TestClient  # noqa: E402

import app.models  # noqa: E402,F401  (registers metadata)
from app.database import Base, engine  # noqa: E402
from app.dependencies import get_embedder, get_vectorstore  # noqa: E402
from app.main import app as fastapi_app  # noqa: E402
from app.services.embedder import EmbeddingResult  # noqa: E402
from app.services.llm.provider_factory import get_llm_provider  # noqa: E402


class FakeEmbedder:
    def embed_texts(self, texts):
        return EmbeddingResult(embeddings=[[0.0] * 8 for _ in texts])

    def embed_chunks_from_processed(self, chunks):
        return [chunk for chunk in chunks if chunk.get("content", "").strip()]


class FakeVectorStore:
    def __init__(self):
        self.stored = []

    def query(self, *args, **kwargs):
        return []

    def keyword_query(self, *args, **kwargs):
        return []

    def get_all(self, *args, **kwargs):
        return []

    def store(self, chunks):
        chunks = list(chunks)
        self.stored.extend(chunks)
        return len(chunks)

    def delete(self, where):
        if not where:
            raise ValueError("delete() requires a non-empty `where` filter")

    def count(self, where=None):
        return len(self.stored)


class FakeLLM:
    async def chat(self, **kwargs):
        raise RuntimeError("LLM is not available in tests")

    async def stream_chat(self, **kwargs):
        raise RuntimeError("LLM is not available in tests")


@pytest.fixture(scope="session", autouse=True)
def _schema():
    Base.metadata.create_all(engine)
    yield
    Base.metadata.drop_all(engine)


@pytest.fixture
def client():
    fastapi_app.dependency_overrides[get_embedder] = FakeEmbedder
    fastapi_app.dependency_overrides[get_vectorstore] = FakeVectorStore
    fastapi_app.dependency_overrides[get_llm_provider] = FakeLLM

    # Deliberately not used as a context manager: the lifespan hook loads
    # the real embedding model, which these tests stub out.
    yield TestClient(fastapi_app)

    fastapi_app.dependency_overrides.clear()


@pytest.fixture
def register(client):
    """Create a user and return its Authorization header."""
    counter = {"n": 0}

    def _register(email=None, password="a-long-enough-password"):
        counter["n"] += 1
        email = email or f"user{counter['n']}-{os.urandom(4).hex()}@example.com"

        response = client.post(
            "/auth/register",
            json={"email": email, "password": password, "full_name": "Test User"},
        )
        assert response.status_code == 201, response.text

        return {"Authorization": f"Bearer {response.json()['access_token']}"}

    return _register
