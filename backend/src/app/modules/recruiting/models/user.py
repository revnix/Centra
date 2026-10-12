"""Compatibility export.

The canonical User model lives in `src.app.modules.platform.users.models.user`.
This module re-exports it so code referencing `modules.recruiting.models.user`
keeps working.
"""

from src.app.modules.platform.users.models.user import *  # noqa
