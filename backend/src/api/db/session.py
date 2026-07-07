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

# Monotonic timestamp of the last successful Neon ping (0 = never).
# Updated by _periodic_neon_ping in main.py and by get_async_db() itself.
import time as _time
_last_neon_ping: float = 0.0

# Lock to serialise concurrent warmup attempts. Without this, when N requests
# arrive simultaneously while Neon is cold, all N race to open a connection and
# all N time-out independently, causing every request to fail with 500.
# With the lock only the FIRST coroutine does the warmup; the rest wait and then
# skip it (double-checked locking pattern).
_neon_warmup_lock: asyncio.Lock | None = None


def _get_warmup_lock() -> asyncio.Lock:
    global _neon_warmup_lock
    if _neon_warmup_lock is None:
        _neon_warmup_lock = asyncio.Lock()
    return _neon_warmup_lock


def _update_last_ping() -> None:
    global _last_neon_ping
    _last_neon_ping = _time.monotonic()


async def get_async_db():
    """Yield an AsyncSession. For Neon, wake the compute with a SELECT 1 first."""
    from fastapi import HTTPException as _HTTPException
    if _is_neon:
        # Skip per-request warmup if a successful ping happened within the last 25 s.
        if _time.monotonic() - _last_neon_ping > 25:
            lock = _get_warmup_lock()
            async with lock:
                # Double-check: another coroutine may have already warmed up while we waited.
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
                        except Exception as exc:
                            last_exc = exc
                            if attempt >= 2:
                                _db_logger.error("DB unreachable after %d attempts: %s", attempt, exc)
                                raise _HTTPException(
                                    status_code=503,
                                    detail="Database is starting up. Please retry in a moment.",
                                )

    async with AsyncSessionLocal() as session:
        yield session


# Alias for backward compatibility
get_db = get_async_db