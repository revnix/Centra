from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from src.api.core.config import settings

# Fix for Neon DB "sslmode" error with asyncpg
# Adjusted to handle both asyncpg (needs valid ssl context or 'require' in connect_args) 
# and psycopg (needs sslmode in URL).

database_url = settings.DATABASE_URL
# Check which driver is being used
if "asyncpg" in database_url:
    # Asyncpg: Strip sslmode from URL, pass via connect_args
    if "sslmode=" in database_url:
        database_url = database_url.replace("?sslmode=require", "").replace("&sslmode=require", "")
    connect_args = {"ssl": "require"} if "neon.tech" in settings.DATABASE_URL else {}
else:
    # Psycopg / Default: Keep sslmode in URL (or ensure it's there for Neon), do NOT pass 'ssl' to connect_args
    # Assuming the user provides a correct URL for psycopg which usually includes sslmode=require for Neon
    connect_args = {}

engine = create_async_engine(
    database_url, 
    echo=True, 
    future=True,
    connect_args=connect_args
)
AsyncSessionLocal = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

async def get_db():
    async with AsyncSessionLocal() as session:
        yield session
#ed