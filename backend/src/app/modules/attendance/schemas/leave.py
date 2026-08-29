from __future__ import annotations

from datetime import date, datetime

from pydantic import BaseModel, Field, model_validator


class LeaveRequestCreate(BaseModel):
    start_date: date
    end_date: date
    reason: str | None = None

    @model_validator(mode="after")
    def _check_range(self) -> "LeaveRequestCreate":
        if self.end_date < self.start_date:
            raise ValueError("end_date cannot be before start_date")
        return self


class LeaveResponse(BaseModel):
    id: int
    user_id: int
    start_date: date
    end_date: date
    reason: str | None
    status: str
    approved_by: int | None
    reviewed_at: datetime | None
    created_at: datetime
    full_name: str | None = None

    class Config:
        from_attributes = True


class PublicHolidayCreate(BaseModel):
    date: date
    name: str = Field(min_length=1, max_length=200)


class PublicHolidayResponse(BaseModel):
    id: int
    date: date
    name: str

    class Config:
        from_attributes = True
