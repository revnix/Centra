import asyncio
import logging
from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.pool import NullPool, AsyncAdaptedQueuePool
from src.api.core.config import settings
import ssl as ssl_module

database_url = settings.DATABASE_URL

# Convert sqlite:/// to sqlite+aiosqlite:/// for async support
if database_url.startswith("sqlite:///"):
    database_url = database_url.replace("sqlite:///", "sqlite+aiosqlite:///", 1)

# Convert standard postgres:// / postgresql:// to postgresql+asyncpg:// for async support.
# Render (and many other providers) supply the URL without the driver prefix.
if database_url.startswith("postgres://"):
    database_url = "postgresql+asyncpg://" + database_url[len("postgres://"):]
elif database_url.startswith("postgresql://"):
    database_url = "postgresql+asyncpg://" + database_url[len("postgresql://"):]

# Asyncpg + Neon SSL handling
connect_args = {}
if "asyncpg" in database_url:
    # Strip all query parameters for asyncpg as it handles them via connect_args
    if "?" in database_url:
        database_url = database_url.split("?")[0]

if "neon.tech" in settings.DATABASE_URL:
    # Use a Python SSLContext instead of the "require" string.
    # asyncpg's string ssl="require" triggers a blocking os.getcwd() call via
    # pathlib.Path.resolve() when looking for ~/.postgresql/root.crt, which
    # causes a BlockingError under LangGraph's blockbuster middleware.
    # Passing an SSLContext directly bypasses that file lookup entirely.
    _ssl_ctx = ssl_module.create_default_context()
    connect_args["ssl"] = _ssl_ctx
    # Allow more time for Neon cold starts and PgBouncer queuing
    connect_args["command_timeout"] = 30
    # CRITICAL: Disable prepared statement cache for PgBouncer compatibility
    connect_args["statement_cache_size"] = 0
    # 2 attempts × 10s + 3s delay = 23s max — fast enough to not freeze the UI
    connect_args["timeout"] = 10

print(f"DEBUG: Initializing engine with URL: {database_url.split('@')[-1]}") # Log host only for safety

_is_neon = "neon.tech" in settings.DATABASE_URL

# Neon is a serverless / suspend-on-idle database. Using a connection pool
# is counter-productive because pooled connections go stale while the server
# is asleep and every reconnect attempt hangs until the cold-start timeout
# fires (~60 s). NullPool opens a fresh connection per request and closes it
# immediately after, which is the pattern Neon officially recommends for
# serverless workloads. For non-Neon Postgres we keep a normal pool.
engine = create_async_engine(
    database_url,
    echo=False,
    future=True,
    connect_args=connect_args,
    # NullPool for Neon: no stale connections, wake-up handled per-request
    poolclass=NullPool if _is_neon else AsyncAdaptedQueuePool,
    **({} if _is_neon else {
        "pool_pre_ping": True,
        "pool_recycle": 1800,
        "pool_size": 20,
        "max_overflow": 10,
        "pool_timeout": 30,
    }),
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


_db_logger = logging.getLogger(__name__)

_NEON_WAKE_ERRORS = (TimeoutError, OSError, asyncio.TimeoutError)

# Monotonic timestamp of the last successful Neon ping (0 = never).
# Updated by _periodic_neon_ping in main.py and by get_async_db() itself.
import time as _time
_last_neon_ping: float = 0.0


def _update_last_ping() -> None:
    global _last_neon_ping
    _last_neon_ping = _time.monotonic()


async def get_async_db():
    """Yield an AsyncSession. For Neon, wake the compute with a SELECT 1 first."""
    if _is_neon:
        # Skip per-request warmup if a successful ping happened within the last 25 s.
        # The periodic ping in main.py fires every 30 s, so this avoids the 10-s
        # timeout retry on every request when Neon is already awake.
        if _time.monotonic() - _last_neon_ping > 25:
            last_exc: Exception | None = None
            for attempt, delay in enumerate([0, 3], start=1):
                if delay:
                    _db_logger.warning("Neon cold-start retry (attempt %d): %s", attempt, last_exc)
                    await asyncio.sleep(delay)
                try:
                    async with engine.connect() as conn:
                        await conn.execute(text("SELECT 1"))
                    _update_last_ping()
                    break
                except asyncio.CancelledError:
                    raise  # never swallow task cancellation
                except _NEON_WAKE_ERRORS as exc:
                    last_exc = exc
                    if attempt >= 2:
                        _db_logger.error("DB unreachable after %d attempts: %s", attempt, exc)
                        raise

    async with AsyncSessionLocal() as session:
        yield session


# Alias for backward compatibility
get_db = get_async_db