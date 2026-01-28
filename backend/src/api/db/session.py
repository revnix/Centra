from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from src.api.core.config import settings
from urllib.parse import urlparse, urlunparse, parse_qsl, urlencode

database_url = settings.DATABASE_URL

# Asyncpg + Neon SSL handling
if "asyncpg" in database_url:
    # Strip all query parameters for asyncpg as it handles them via connect_args
    if "?" in database_url:
        database_url = database_url.split("?")[0]
    
    # Neon requires SSL
    if "neon.tech" in settings.DATABASE_URL:
        connect_args = {"ssl": "require"}
    else:
        connect_args = {}
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