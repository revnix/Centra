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
    connect_args["command_timeout"] = 60
    # CRITICAL: Disable prepared statement cache for PgBouncer compatibility
    connect_args["statement_cache_size"] = 0
    # Explicit connection-establishment timeout (TCP/TLS handshake).
    # Without this, asyncpg inherits an internal default that can exceed
    # LangGraph's request deadline when Neon wakes from suspension.
    connect_args["timeout"] = 30

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

# Exceptions asyncpg raises during a Neon cold-start
_NEON_WAKE_ERRORS = (TimeoutError, OSError, asyncio.TimeoutError)


async def get_async_db():
    """
    Yield a warm AsyncSession, with automatic retry on Neon cold-start timeouts.

    Neon's free-tier compute suspends after ~5 min of inactivity. Reconnecting
    to a sleeping instance always raises TimeoutError on the first attempt.

    IMPORTANT: The retry loop and the `yield` are intentionally in SEPARATE
    phases. Placing `yield` inside a try/except that catches connection errors
    causes `RuntimeError: generator didn't stop after athrow()` because FastAPI
    uses AsyncExitStack.athrow() to clean up the generator after a route error,
    and our handler would incorrectly catch that re-thrown exception and try to
    loop again — which Python forbids once a generator has already yielded.

    Strategy:
      Phase 1 (retried): Fire a cheap `SELECT 1` via engine.connect() to wake
                         up the Neon compute. Retry up to 3 times.
      Phase 2 (single):  Yield one AsyncSession. Connection is now warm.
    """
    if _is_neon:
        _RETRY_DELAYS = [2, 5]  # seconds to wait between attempts
        last_exc: Exception | None = None

        for attempt, delay in enumerate([0] + _RETRY_DELAYS, start=1):
            if delay:
                _db_logger.warning(
                    "Neon cold-start – retrying connection "
                    "(attempt %d, waited %ds): %s",
                    attempt, delay, last_exc,
                )
                await asyncio.sleep(delay)
            try:
                async with engine.connect() as conn:
                    await conn.execute(text("SELECT 1"))
                break  # Neon compute is awake
            except _NEON_WAKE_ERRORS as exc:
                last_exc = exc
                if attempt > len(_RETRY_DELAYS):
                    _db_logger.error(
                        "DB unreachable after %d attempts: %s", attempt, exc
                    )
                    raise

    # Phase 2: yield one session — outside any retry try/except so that
    # FastAPI's athrow() during cleanup propagates cleanly.
    async with AsyncSessionLocal() as session:
        yield session


# Alias for backward compatibility
get_db = get_async_db