import asyncio
import os
import sys
from logging.config import fileConfig

from sqlalchemy import pool
from sqlalchemy.engine import Connection
from sqlalchemy.ext.asyncio import async_engine_from_config

from alembic import context

# this is the Alembic Config object, which provides
# access to the values within the .ini file in use.
config = context.config

# Interpret the config file for Python logging.
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# Add project root to sys.path so alembic can import src modules
sys.path.insert(0, os.path.realpath(os.path.join(os.path.dirname(__file__), "..")))

from src.api.core.config import settings
from src.api.db.base import Base

# Import ALL models so Alembic autogenerate detects every table
import src.api.models  # noqa: F401 - registers models with Base.metadata

# target_metadata for autogenerate support
target_metadata = Base.metadata


def _get_alembic_url() -> str:
    """
    Build a clean URL for Alembic (uses asyncpg driver).
    Strip sslmode/channel_binding query params — those are passed via connect_args.
    """
    url = settings.DATABASE_URL
    # Ensure the async driver prefix is used
    url = url.replace("postgresql://", "postgresql+asyncpg://", 1)
    # Strip query params that asyncpg doesn't accept in the URL itself
    if "?" in url:
        url = url.split("?")[0]
    return url


# Set the cleaned URL for Alembic
config.set_main_option("sqlalchemy.url", _get_alembic_url())


def run_migrations_offline() -> None:
    """Run migrations in 'offline' mode."""
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )
    with context.begin_transaction():
        context.run_migrations()


def do_run_migrations(connection: Connection) -> None:
    context.configure(connection=connection, target_metadata=target_metadata)
    with context.begin_transaction():
        context.run_migrations()


async def run_async_migrations() -> None:
    """Create an Engine and run migrations asynchronously."""
    # Pass ssl via connect_args for NeonDB (PgBouncer pooler)
    connectable = async_engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
        connect_args={
            "ssl": "require",
            "command_timeout": 60,
            "statement_cache_size": 0,   # required for PgBouncer
        },
    )

    async with connectable.connect() as connection:
        await connection.run_sync(do_run_migrations)

    await connectable.dispose()


def run_migrations_online() -> None:
    """Run migrations in 'online' mode."""
    asyncio.run(run_async_migrations())


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
