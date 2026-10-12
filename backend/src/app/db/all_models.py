"""Import every SQLAlchemy model module so they register with `Base.metadata`.

Needed by Alembic autogenerate and by the schema-bootstrap path in
`scripts/db.py`, since nothing else imports every model module together.
"""

from src.app.integrations.shared.models import integration  # noqa: F401
from src.app.modules.attendance.models import breaks  # noqa: F401
from src.app.modules.attendance.models import correction  # noqa: F401
from src.app.modules.attendance.models import holiday  # noqa: F401
from src.app.modules.attendance.models import leave  # noqa: F401
from src.app.modules.attendance.models import employee_shift  # noqa: F401
from src.app.modules.attendance.models import session  # noqa: F401
from src.app.modules.attendance.models import shift  # noqa: F401
from src.app.modules.people.models import employee_profile  # noqa: F401
from src.app.modules.platform.org.models import department  # noqa: F401
from src.app.modules.platform.users.models import password_reset  # noqa: F401
from src.app.modules.platform.users.models import user  # noqa: F401
from src.app.modules.recruiting.models import application  # noqa: F401
from src.app.modules.recruiting.models import candidate  # noqa: F401
from src.app.modules.recruiting.models import interview  # noqa: F401
from src.app.modules.recruiting.models import interview_schedule  # noqa: F401
from src.app.modules.recruiting.models import job  # noqa: F401
from src.app.modules.recruiting.models import onboarding  # noqa: F401
from src.app.modules.recruiting.models import permission  # noqa: F401
from src.app.modules.recruiting.models import role  # noqa: F401
from src.app.modules.recruiting.models import role_permission  # noqa: F401
from src.app.modules.recruiting.models import screening  # noqa: F401
from src.app.modules.recruiting.models import user_role  # noqa: F401
