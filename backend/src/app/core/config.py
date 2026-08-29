"""Application settings.

Phase 2:
- Legacy settings implementation moved to `src.app.core.config_legacy`.
- This module remains import-safe: if the legacy settings crash due to invalid
  `.env` values, we fall back to a minimal settings object.

New code should import `settings` from here.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Optional


@dataclass(frozen=True)
class _BootstrapSettings:
    APP_NAME: str = "erp-backend"
    API_V1_PREFIX: str = "/api/v1"
    UPLOAD_DIR: str = "uploads"
    ALLOWED_ORIGINS: list[str] = ("*",)  # type: ignore


legacy_settings_error: Optional[Exception] = None

try:
    from src.app.core.config_legacy import settings as settings  # type: ignore  # noqa: F401
except Exception as e:  # pragma: no cover
    legacy_settings_error = e
    settings = _BootstrapSettings()  # type: ignore


def get_settings() -> Any:
    return settings
