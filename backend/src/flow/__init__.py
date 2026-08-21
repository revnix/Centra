"""Compatibility package.

Legacy LangGraph flows were moved to `src.app.ai.flow.legacy_flow`.
This package re-exports them so existing imports like `from src.flow.main import graph`
continue to work during migration.
"""

from src.app.ai.flow.legacy_flow import *  # noqa
