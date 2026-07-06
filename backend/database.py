import os
from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

load_dotenv()

DATABASE_URL = os.environ.get("DATABASE_URL")

if not DATABASE_URL:
    raise RuntimeError(
        "DATABASE_URL is not set. Create a .env file with, e.g.:\n"
        "DATABASE_URL=postgresql://postgres:yourpassword@localhost:5432/pokemon"
    )

engine = create_engine(
    DATABASE_URL,
    pool_pre_ping=True,  # discard stale/dead connections instead of erroring on them
    pool_size=5,
    max_overflow=10,
)

SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine
)


def get_db():
    """FastAPI dependency: yields a session and guarantees it's closed afterward."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()