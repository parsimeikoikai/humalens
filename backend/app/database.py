import os

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base


DATABASE_URL = os.getenv("DATABASE_URL")

if not DATABASE_URL:
    # Without this, SQLAlchemy fails with "Expected string or URL object,
    # got None" from deep inside create_engine at import time, which says
    # nothing about what the operator actually needs to do.
    raise RuntimeError(
        "DATABASE_URL is not set. Point it at your PostgreSQL instance, e.g. "
        "DATABASE_URL=postgresql://postgres:postgres@localhost:5432/ragdb "
        "(docker-compose sets this for you)."
    )

engine = create_engine(
    DATABASE_URL,
    # Managed Postgres and connection proxies drop idle connections without
    # telling the client; without pre-ping the first request after an idle
    # period fails with a stale-connection error.
    pool_pre_ping=True,
)

SessionLocal = sessionmaker(
    bind=engine,
    autoflush=False,
    autocommit=False
)

Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
