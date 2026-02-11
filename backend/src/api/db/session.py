from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from src.api.core.config import settings
from urllib.parse import urlparse, urlunparse, parse_qsl, urlencode

database_url = settings.DATABASE_URL

# Convert sqlite:/// to sqlite+aiosqlite:/// for async support
if database_url.startswith("sqlite:///"):
    database_url = database_url.replace("sqlite:///", "sqlite+aiosqlite:///", 1)

# Asyncpg + Neon SSL handling
connect_args = {}
if "asyncpg" in database_url:
    # Strip all query parameters for asyncpg as it handles them via connect_args
    if "?" in database_url:
        database_url = database_url.split("?")[0]
    
if "neon.tech" in settings.DATABASE_URL:
    connect_args["ssl"] = "require"
    # Allow more time for Neon cold starts and PgBouncer queuing
    connect_args["command_timeout"] = 60 
    # CRITICAL: Disable prepared statement cache for PgBouncer compatibility
    connect_args["statement_cache_size"] = 0

print(f"DEBUG: Initializing engine with URL: {database_url.split('@')[-1]}") # Log host only for safety

engine = create_async_engine(
    database_url,
    echo=False,
    future=True,
    connect_args=connect_args,
    pool_pre_ping=True,
    pool_recycle=1800,
    pool_size=20,
    max_overflow=10,
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