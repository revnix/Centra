from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from src.api.core.config import settings
from urllib.parse import urlparse, urlunparse, parse_qsl, urlencode

database_url = settings.DATABASE_URL

# Asyncpg + Neon SSL handling
if "asyncpg" in database_url:
    url_obj = urlparse(database_url)
    params = dict(parse_qsl(url_obj.query))
    
    # Remove parameters that are not supported in the query string by asyncpg or cause issues
    for key in ["sslmode", "channel_binding"]:
        if key in params:
            del params[key]
    
    new_query = urlencode(params)
    database_url = urlunparse(url_obj._replace(query=new_query))
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