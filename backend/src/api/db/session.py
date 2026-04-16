from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from src.api.core.config import settings

database_url = settings.DATABASE_URL

# Strip query params that asyncpg doesn't support (?sslmode=require&channel_binding=require)
# These are passed via connect_args instead
if "?" in database_url:
    database_url = database_url.split("?")[0]

# SSL is required for NeonDB / any hosted PostgreSQL
connect_args = {
    "ssl": "require",
    # Longer timeout for Neon cold starts and PgBouncer queuing
    "command_timeout": 60,
    # Disable prepared statement cache for PgBouncer compatibility
    "statement_cache_size": 0,
}

print(f"DEBUG: Initializing engine with URL: {database_url.split('@')[-1]}")

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

AsyncSessionLocal = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
)


async def get_async_db():
    async with AsyncSessionLocal() as session:
        yield session


# Alias for backward compatibility
get_db = get_async_db