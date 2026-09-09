from __future__ import annotations

from datetime import date, time, datetime, timezone
from enum import Enum
from sqlmodel import SQLModel, Field


def _utc_now():
    return datetime.now(timezone.utc)


class SlotStatus(str, Enum):
    scheduled = "scheduled"
    completed = "completed"
    cancelled = "cancelled"


class Slot(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    title: str = Field(min_length=1, max_length=200)
    description: str = Field(default="", max_length=800)
    slot_date: date
    start_time: time
    end_time: time
    status: SlotStatus = Field(default=SlotStatus.scheduled)
    touched_by: str = Field(default="System")
    touched_action: str = Field(default="added")
    created_at: datetime = Field(default_factory=_utc_now)


class SlotCreate(SQLModel):
    title: str
    description: str = ""
    slot_date: date
    start_time: time
    end_time: time
    touched_by: str = "Aftab"


class SlotPatch(SQLModel):
    title: str | None = None
    description: str | None = None
    slot_date: date | None = None
    start_time: time | None = None
    end_time: time | None = None
    status: SlotStatus | None = None
    touched_by: str | None = None
    touched_action: str | None = None
