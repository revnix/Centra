from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from src.api.core.config import settings

database_url = settings.DATABASE_URL

# Asyncpg + Neon SSL handling
if "asyncpg" in database_url:
    if "sslmode=" in database_url:
        database_url = database_url.replace("?sslmode=require", "").replace("&sslmode=require", "")
    connect_args = {"ssl": "require"} if "neon.tech" in settings.DATABASE_URL else {}
else:
    connect_args = {}

engine = create_async_engine(
    database_url,
    echo=True,
    future=True,
    connect_args=connect_args
)

AsyncSessionLocal = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False
)


async def get_async_db():
    async with AsyncSessionLocal() as session:
        yield session


# Alias for backward compatibility
get_db = get_async_db