from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from src.api.core.config import settings
from urllib.parse import urlparse, urlunparse, parse_qsl, urlencode

database_url = settings.DATABASE_URL

# Convert sqlite:/// to sqlite+aiosqlite:/// for async support
if database_url.startswith("sqlite:///"):
    database_url = database_url.replace("sqlite:///", "sqlite+aiosqlite:///", 1)

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

# Enable WAL mode for SQLite to improve concurrency and prevent locking
if database_url.startswith("sqlite"):
    from sqlalchemy import event
    @event.listens_for(engine.sync_engine, "connect")
    def set_sqlite_pragma(dbapi_connection, connection_record):
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA journal_mode=WAL")
        cursor.execute("PRAGMA synchronous=NORMAL")
        cursor.close()

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