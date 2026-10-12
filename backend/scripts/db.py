"""Database utility commands for local/dev.

Usage examples:
  - `.venv/bin/python scripts/db.py migrate`
  - `.venv/bin/python scripts/db.py reset --yes`
  - `.venv/bin/python scripts/db.py seed`

Commands:
  - migrate: apply Alembic migrations (upgrade head)
  - reset: downgrade to base then upgrade head (DANGEROUS)
  - seed: seed sample data

Notes:
- This repo historically created tables at runtime (`Base.metadata.create_all`).
  Some Alembic histories assume those tables already exist. For a completely
  fresh DB, `migrate` will bootstrap by creating tables from SQLAlchemy models
  and then `alembic stamp head`.
"""

from __future__ import annotations

from pathlib import Path
import sys
import os

# Fix invalid DEBUG env values (e.g. DEBUG=release) for Pydantic Settings
_dbg = os.getenv("DEBUG")
if _dbg and _dbg.lower() not in {"1","0","true","false","yes","no","on","off"}:
    os.environ["DEBUG"] = "false"



_PROJECT_ROOT = Path(__file__).resolve().parents[1]
if str(_PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(_PROJECT_ROOT))

import argparse
import asyncio
import subprocess
import sys
from typing import Sequence


def _run(cmd: Sequence[str], *, check: bool = True) -> subprocess.CompletedProcess[str]:
    completed = subprocess.run(cmd, text=True, capture_output=True)
    if check and completed.returncode != 0:
        sys.stdout.write(completed.stdout)
        sys.stderr.write(completed.stderr)
        raise SystemExit(completed.returncode)
    return completed


def alembic(*args: str, check: bool = True) -> subprocess.CompletedProcess[str]:
    return _run([sys.executable, "-m", "alembic", *args], check=check)


async def _bootstrap_schema_from_models() -> None:
    # Import models to register metadata
    import src.app.db.all_models  # noqa: F401

    from src.app.core.config import settings
    from src.app.db.base import Base

    from sqlalchemy.ext.asyncio import create_async_engine

    # settings.DATABASE_URL is the raw .env value (may be a bare `postgresql://`
    # with `?sslmode=...`, which asyncpg can't take directly) — normalize it the
    # same way alembic/env.py does before handing it to the async engine.
    db_url = settings.DATABASE_URL
    if "?sslmode=" in db_url:
        db_url = db_url.split("?")[0]
    if db_url.startswith("postgres://"):
        db_url = db_url.replace("postgres://", "postgresql+asyncpg://", 1)
    elif db_url.startswith("postgresql://") and "+asyncpg" not in db_url:
        db_url = db_url.replace("postgresql://", "postgresql+asyncpg://", 1)

    engine = create_async_engine(db_url, pool_pre_ping=True)
    try:
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
    finally:
        await engine.dispose()


def cmd_migrate(_: argparse.Namespace) -> None:
    result = alembic("upgrade", "head", check=False)
    if result.returncode == 0:
        sys.stdout.write(result.stdout)
        sys.stderr.write(result.stderr)
        return

    stderr = result.stderr or ""

    # Fresh DB bootstrap path: migration history assumes tables already exist.
    if "NoSuchTableError" in stderr and "posts" in stderr:
        sys.stderr.write(
            "Alembic failed because required tables are missing (fresh database).\n"
            "Bootstrapping schema from SQLAlchemy models, then stamping Alembic head...\n"
        )
        asyncio.run(_bootstrap_schema_from_models())
        alembic("stamp", "head")
        sys.stderr.write("Bootstrap complete.\n")
        return

    # Default: surface the original error
    sys.stdout.write(result.stdout)
    sys.stderr.write(result.stderr)
    raise SystemExit(result.returncode)


def cmd_reset(args: argparse.Namespace) -> None:
    if not args.yes:
        raise SystemExit("Refusing to reset without --yes")
    alembic("downgrade", "base")
    alembic("upgrade", "head")


def cmd_nuke(args: argparse.Namespace) -> None:
    """Drop and recreate the public schema, then run migrations.

    This is the most reliable way to get a fully clean local/dev database,
    regardless of existing Alembic history.
    """

    if not args.yes:
        raise SystemExit("Refusing to nuke without --yes")

    async def _run() -> None:
        from sqlalchemy import text

        from src.app.db.session import engine

        async with engine.begin() as conn:
            await conn.execute(text("DROP SCHEMA IF EXISTS public CASCADE"))
            await conn.execute(text("CREATE SCHEMA public"))

    asyncio.run(_run())
    cmd_migrate(argparse.Namespace())


def cmd_seed(_: argparse.Namespace) -> None:
    async def _run() -> None:
        # Import inside the running event loop so async engines/sessions bind cleanly.
        from scripts.seed_rbac import seed_roles_permissions
        from scripts.seed_db import seed_all

        await seed_roles_permissions()
        await seed_all()

    asyncio.run(_run())


def build_parser() -> argparse.ArgumentParser:
    p = argparse.ArgumentParser(prog="db.py")
    sub = p.add_subparsers(dest="cmd", required=True)

    p_migrate = sub.add_parser("migrate", help="Apply Alembic migrations (upgrade head)")
    p_migrate.set_defaults(fn=cmd_migrate)

    p_reset = sub.add_parser("reset", help="Downgrade to base then upgrade head")
    p_reset.add_argument("--yes", action="store_true", help="Confirm destructive reset")
    p_reset.set_defaults(fn=cmd_reset)

    p_nuke = sub.add_parser("nuke", help="Drop+recreate public schema then upgrade head")
    p_nuke.add_argument("--yes", action="store_true", help="Confirm destructive nuke")
    p_nuke.set_defaults(fn=cmd_nuke)

    p_seed = sub.add_parser("seed", help="Seed database with sample data")
    p_seed.set_defaults(fn=cmd_seed)

    return p


def main(argv: list[str] | None = None) -> None:
    ns = build_parser().parse_args(argv)
    ns.fn(ns)


if __name__ == "__main__":
    main()
