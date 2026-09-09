from __future__ import annotations

from contextlib import asynccontextmanager
from datetime import time as dt_time

from fastapi import FastAPI, Depends, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from sqlmodel import Session, select, col

from db import init_tables, get_session, seed_board
from models import Slot, SlotCreate, SlotPatch, SlotStatus


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_tables()
    seed_board()
    yield


app = FastAPI(
    title="Appointment Board",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


def _minutes(t: dt_time) -> int:
    return t.hour * 60 + t.minute


def _has_overlap(
    sesh: Session,
    slot_date,
    start: dt_time,
    end: dt_time,
    exclude_id: int | None = None,
) -> Slot | None:
    statement = select(Slot).where(
        Slot.slot_date == slot_date,
        Slot.status != SlotStatus.cancelled,
    )
    if exclude_id is not None:
        statement = statement.where(Slot.id != exclude_id)

    candidates = sesh.exec(statement).all()

    for cand in candidates:
        if _minutes(start) < _minutes(cand.end_time) and _minutes(cand.start_time) < _minutes(end):
            return cand
    return None


@app.get("/api/slots", response_model=list[Slot])
def list_slots(
    date: str | None = Query(default=None),
    status: SlotStatus | None = Query(default=None),
    sesh: Session = Depends(get_session),
):
    stmt = select(Slot)
    if date:
        stmt = stmt.where(col(Slot.slot_date) == date)
    if status:
        stmt = stmt.where(Slot.status == status)
    stmt = stmt.order_by(col(Slot.slot_date), col(Slot.start_time))
    return sesh.exec(stmt).all()


@app.post("/api/slots", response_model=Slot, status_code=201)
def create_slot(body: SlotCreate, sesh: Session = Depends(get_session)):
    if _minutes(body.end_time) <= _minutes(body.start_time):
        raise HTTPException(422, "End time must come after start time.")

    clash = _has_overlap(sesh, body.slot_date, body.start_time, body.end_time)
    if clash:
        raise HTTPException(
            409,
            f'That time overlaps with "{clash.title}" '
            f"({clash.start_time.strftime('%H:%M')}–{clash.end_time.strftime('%H:%M')}). "
            "Pick a different slot.",
        )

    row = Slot(
        title=body.title,
        description=body.description,
        slot_date=body.slot_date,
        start_time=body.start_time,
        end_time=body.end_time,
        touched_by=body.touched_by,
        touched_action="added",
    )
    sesh.add(row)
    sesh.commit()
    sesh.refresh(row)
    return row


@app.patch("/api/slots/{slot_id}", response_model=Slot)
def patch_slot(slot_id: int, body: SlotPatch, sesh: Session = Depends(get_session)):
    row = sesh.get(Slot, slot_id)
    if not row:
        raise HTTPException(404, "Slot not found.")

    patch_data = body.model_dump(exclude_unset=True)

    new_date = patch_data.get("slot_date", row.slot_date)
    new_start = patch_data.get("start_time", row.start_time)
    new_end = patch_data.get("end_time", row.end_time)

    if _minutes(new_end) <= _minutes(new_start):
        raise HTTPException(422, "End time must come after start time.")

    incoming_status = patch_data.get("status", row.status)
    if incoming_status != SlotStatus.cancelled:
        clash = _has_overlap(sesh, new_date, new_start, new_end, exclude_id=slot_id)
        if clash:
            raise HTTPException(
                409,
                f'That time overlaps with "{clash.title}" '
                f"({clash.start_time.strftime('%H:%M')}–{clash.end_time.strftime('%H:%M')}). "
                "Pick a different slot.",
            )

    for key, val in patch_data.items():
        setattr(row, key, val)

    sesh.add(row)
    sesh.commit()
    sesh.refresh(row)
    return row


@app.delete("/api/slots/{slot_id}", status_code=204)
def delete_slot(slot_id: int, sesh: Session = Depends(get_session)):
    row = sesh.get(Slot, slot_id)
    if not row:
        raise HTTPException(404, "Slot not found.")
    sesh.delete(row)
    sesh.commit()
