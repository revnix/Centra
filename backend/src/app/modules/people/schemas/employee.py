from __future__ import annotations

from datetime import date, datetime

from pydantic import BaseModel, EmailStr, Field


class EmployeeCreate(BaseModel):
    email: EmailStr
    full_name: str | None = None
    username: str | None = None

    # If omitted, a random temp password is created and returned.
    password: str | None = Field(default=None, min_length=6)

    department_id: int | None = None
    job_title: str | None = Field(default=None, max_length=120)
    joining_date: date | None = None
    manager_user_id: int | None = None


class EmployeeUpdate(BaseModel):
    department_id: int | None = None
    job_title: str | None = Field(default=None, max_length=120)
    joining_date: date | None = None
    manager_user_id: int | None = None
    is_active: bool | None = None


class EmployeeResponse(BaseModel):
    user_id: int
    email: str
    username: str
    full_name: str | None
    role: str
    is_active: bool

    department_id: int | None
    job_title: str | None
    joining_date: date | None
    manager_user_id: int | None
    employee_profile_id: int

    created_at: datetime
    updated_at: datetime | None


class EmployeeCreateResponse(BaseModel):
    employee: EmployeeResponse
    temp_password: str | None = None
