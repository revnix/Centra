from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, Field


class DepartmentBase(BaseModel):
    name: str = Field(min_length=2, max_length=120)
    description: str | None = None


class DepartmentCreate(DepartmentBase):
    lead_user_id: int | None = None


class DepartmentUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=2, max_length=120)
    description: str | None = None
    lead_user_id: int | None = None


class DepartmentResponse(BaseModel):
    id: int
    name: str
    description: str | None
    lead_user_id: int | None
    created_at: datetime
    updated_at: datetime | None

    class Config:
        from_attributes = True
