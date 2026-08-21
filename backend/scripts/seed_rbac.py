import asyncio
from sqlalchemy import select

from src.app.db.session import AsyncSessionLocal, engine
from src.app.db.base import Base

from src.app.modules.recruiting.models.role import Role
from src.app.modules.recruiting.models.permission import Permission
from src.app.modules.recruiting.models.user_role import UserRole as UserRoleLink
from src.app.modules.recruiting.models.role_permission import RolePermission

from src.app.modules.platform.users.models.user import User


ROLE_NAMES = [
    "SUPER_ADMIN",
    "ORG_ADMIN",
    "HR_ADMIN",
    "HR_STAFF",
    "FINANCE_ADMIN",
    "FINANCE_STAFF",
    "DEPARTMENT_LEAD",
    "MANAGER",
    "EMPLOYEE",
    "AUDITOR",
    # Optional / future
    "RECRUITER",
    "INTEGRATIONS_ADMIN",
]

MODULES = [
    "platform",
    "people",
    "hr",
    "attendance",
    "recruiting",
    "finance",
    "operations",
    "integrations",
    "reports",
    "audit",
]

ACTIONS = ["view", "create", "update", "delete", "approve", "admin"]


def perm_key(module: str, action: str) -> str:
    return f"{module}:{action}"


ROLE_PERMISSION_MATRIX: dict[str, list[str]] = {
    "SUPER_ADMIN": [perm_key(m, a) for m in MODULES for a in ACTIONS],
    "ORG_ADMIN": [
        *[perm_key("platform", a) for a in ACTIONS],
        perm_key("reports", "view"),
        perm_key("audit", "view"),
    ],
    "HR_ADMIN": [
        *[perm_key("people", a) for a in ["view", "create", "update"]],
        *[perm_key("hr", a) for a in ACTIONS],
        *[perm_key("attendance", a) for a in ACTIONS],
        *[perm_key("recruiting", a) for a in ["view", "create", "update", "approve"]],
        perm_key("reports", "view"),
        perm_key("audit", "view"),
    ],
    "HR_STAFF": [
        *[perm_key("people", a) for a in ["view", "create", "update"]],
        *[perm_key("hr", a) for a in ["view", "create", "update", "approve"]],
        *[perm_key("attendance", a) for a in ["view", "create", "update"]],
        *[perm_key("recruiting", a) for a in ["view", "create", "update"]],
        perm_key("reports", "view"),
    ],
    "FINANCE_ADMIN": [
        *[perm_key("finance", a) for a in ACTIONS],
        perm_key("reports", "view"),
        perm_key("audit", "view"),
        perm_key("platform", "view"),
    ],
    "FINANCE_STAFF": [
        *[perm_key("finance", a) for a in ["view", "create", "update"]],
        perm_key("reports", "view"),
    ],
    "DEPARTMENT_LEAD": [
        perm_key("people", "view"),
        perm_key("attendance", "view"),
        perm_key("attendance", "approve"),
        perm_key("hr", "view"),
        perm_key("hr", "approve"),
        *[perm_key("operations", a) for a in ["view", "create", "update"]],
        perm_key("reports", "view"),
    ],
    "MANAGER": [
        perm_key("people", "view"),
        perm_key("attendance", "view"),
        perm_key("attendance", "approve"),
        perm_key("hr", "view"),
        perm_key("hr", "approve"),
        perm_key("operations", "view"),
    ],
    "EMPLOYEE": [
        perm_key("people", "view"),
        perm_key("people", "update"),
        perm_key("attendance", "view"),
        perm_key("attendance", "create"),
        perm_key("hr", "view"),
        perm_key("hr", "create"),
        perm_key("operations", "view"),
        perm_key("operations", "update"),
    ],
    "AUDITOR": [
        perm_key("reports", "view"),
        perm_key("audit", "view"),
        *[perm_key(m, "view") for m in MODULES],
    ],
    "RECRUITER": [
        *[perm_key("recruiting", a) for a in ["view", "create", "update", "approve"]],
        perm_key("reports", "view"),
    ],
    "INTEGRATIONS_ADMIN": [
        *[perm_key("integrations", a) for a in ACTIONS],
        perm_key("platform", "view"),
        perm_key("audit", "view"),
    ],
}

# Default user→RBAC roles mapping for seeded users
DEFAULT_USER_ROLES: dict[str, list[str]] = {
    "admin": ["SUPER_ADMIN"],
    "org_admin": ["ORG_ADMIN"],
    "hr_admin": ["HR_ADMIN"],
    "finance_admin": ["FINANCE_ADMIN"],
    "lead_ai": ["DEPARTMENT_LEAD"],
    "lead_web": ["DEPARTMENT_LEAD"],
    "lead_shopify": ["DEPARTMENT_LEAD"],
    "lead_uiux": ["DEPARTMENT_LEAD"],
}


async def ensure_tables() -> None:
    # Ensure metadata includes all models
    _ = (Role, Permission, UserRoleLink, RolePermission)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)


async def seed_roles_permissions() -> None:
    await ensure_tables()

    async with AsyncSessionLocal() as db:
        # 1) Roles
        roles: dict[str, Role] = {}
        for name in ROLE_NAMES:
            res = await db.execute(select(Role).where(Role.name == name))
            role = res.scalars().first()
            if not role:
                role = Role(name=name, description=name)
                db.add(role)
            roles[name] = role

        # 2) Permissions (union of all required permission keys)
        wanted_perm_keys = set()
        for keys in ROLE_PERMISSION_MATRIX.values():
            wanted_perm_keys.update(keys)

        permissions: dict[str, Permission] = {}
        for key in sorted(wanted_perm_keys):
            res = await db.execute(select(Permission).where(Permission.key == key))
            p = res.scalars().first()
            if not p:
                p = Permission(key=key, description=key)
                db.add(p)
            permissions[key] = p

        await db.commit()

        # Refresh to get IDs
        for r in roles.values():
            await db.refresh(r)
        for p in permissions.values():
            await db.refresh(p)

        # 3) RolePermission links
        for role_name, perm_keys in ROLE_PERMISSION_MATRIX.items():
            role = roles.get(role_name)
            if not role:
                continue
            for key in perm_keys:
                perm = permissions.get(key)
                if not perm:
                    continue
                res = await db.execute(
                    select(RolePermission).where(
                        RolePermission.role_id == role.id,
                        RolePermission.permission_id == perm.id,
                    )
                )
                link = res.scalars().first()
                if not link:
                    db.add(RolePermission(role_id=role.id, permission_id=perm.id))

        await db.commit()

        # 4) Assign default roles to seeded users (by username)
        for username, role_names in DEFAULT_USER_ROLES.items():
            res = await db.execute(select(User).where(User.username == username))
            user = res.scalars().first()
            if not user:
                continue
            for role_name in role_names:
                role = roles.get(role_name)
                if not role:
                    continue
                res = await db.execute(
                    select(UserRoleLink).where(
                        UserRoleLink.user_id == user.id,
                        UserRoleLink.role_id == role.id,
                    )
                )
                existing = res.scalars().first()
                if not existing:
                    db.add(UserRoleLink(user_id=user.id, role_id=role.id))

        await db.commit()


if __name__ == "__main__":
    asyncio.run(seed_roles_permissions())
