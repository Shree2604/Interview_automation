from sqlalchemy import create_engine
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker, DeclarativeBase, Session
from app.core.config import settings
from typing import AsyncGenerator, Generator

# PostgreSQL Connection URLs
SYNC_DATABASE_URL = (
    f"postgresql+psycopg2://{settings.database_username}:{settings.database_password}"
    f"@{settings.database_host}:{settings.database_port}/{settings.database_name}"
)

ASYNC_DATABASE_URL = (
    f"postgresql+asyncpg://{settings.database_username}:{settings.database_password}"
    f"@{settings.database_host}:{settings.database_port}/{settings.database_name}"
)

# Create Engines
sync_engine = create_engine(SYNC_DATABASE_URL, echo=True)
async_engine = create_async_engine(ASYNC_DATABASE_URL, echo=True)

# Session Factories
sync_session = sessionmaker(bind=sync_engine, expire_on_commit=False)
async_session = sessionmaker(async_engine, expire_on_commit=False, class_=AsyncSession)


# Base Model Class
class Base(DeclarativeBase):
    pass


# Sync Dependency for FastAPI routes
def get_db() -> Generator[Session, None, None]:
    db = sync_session()
    try:
        yield db
    finally:
        db.close()


# Async Dependency for FastAPI routes
async def get_async_db() -> AsyncGenerator[AsyncSession, None]:
    async with async_session() as session:
        yield session
