from datetime import date, time, datetime
from sqlmodel import SQLModel, create_engine, Session, select

from models import Slot, SlotStatus

DB_FILE = "board.db"
DB_URL = f"sqlite:///{DB_FILE}"

_engine = create_engine(
    DB_URL,
    connect_args={"check_same_thread": False},
    echo=False,
)


def init_tables():
    SQLModel.metadata.create_all(_engine)


def get_session():
    with Session(_engine) as sesh:
        yield sesh


_SEED_ROWS = [
    Slot(
        title="Swiggy SDE-1 Technical Round",
        description="Round 2 with Senior Engineering Manager on Google Meet. Review DSA tree traversal, graph algorithms, and Redis caching.",
        slot_date=date(2026, 9, 10),
        start_time=time(10, 0),
        end_time=time(11, 0),
        status=SlotStatus.scheduled,
        touched_by="Aftab",
        touched_action="added",
        created_at=datetime(2026, 9, 8, 14, 22),
    ),
    Slot(
        title="Flipkart Machine Coding Discussion",
        description="Walkthrough of in-memory key-value store assignment. Received positive feedback on concurrency handling.",
        slot_date=date(2026, 9, 10),
        start_time=time(12, 30),
        end_time=time(13, 30),
        status=SlotStatus.completed,
        touched_by="Aftab",
        touched_action="completed",
        created_at=datetime(2026, 9, 9, 8, 10),
    ),
    Slot(
        title="Chai & Catchup with Rohan @ Indiranagar",
        description="Third Wave Coffee Indiranagar. Discussing the upcoming AI hackathon ideas and catching up on college updates.",
        slot_date=date(2026, 9, 10),
        start_time=time(17, 0),
        end_time=time(18, 0),
        status=SlotStatus.scheduled,
        touched_by="Aftab",
        touched_action="added",
        created_at=datetime(2026, 9, 8, 15, 5),
    ),
    Slot(
        title="Smart India Hackathon (SIH) Sprint Sync",
        description="Team Discord sync with Priya & Harsh: finalizing submission deck and integrating FastAPI backend endpoints.",
        slot_date=date(2026, 9, 11),
        start_time=time(11, 0),
        end_time=time(12, 30),
        status=SlotStatus.scheduled,
        touched_by="Aftab",
        touched_action="added",
        created_at=datetime(2026, 9, 9, 10, 0),
    ),
    Slot(
        title="Razorpay Screening Call (HR)",
        description="Rescheduled to next Tuesday because the recruiter was attending an all-hands offsite.",
        slot_date=date(2026, 9, 11),
        start_time=time(15, 30),
        end_time=time(16, 0),
        status=SlotStatus.cancelled,
        touched_by="Aftab",
        touched_action="cancelled",
        created_at=datetime(2026, 9, 9, 11, 40),
    ),
    Slot(
        title="Mock Interview with Senior Engineer (CRED)",
        description="1:1 mock interview on Low-Level Design (LLD), design patterns, and database indexing strategies.",
        slot_date=date(2026, 9, 14),
        start_time=time(14, 0),
        end_time=time(15, 30),
        status=SlotStatus.scheduled,
        touched_by="Aftab",
        touched_action="added",
        created_at=datetime(2026, 9, 9, 16, 30),
    ),
]


def seed_board():
    with Session(_engine) as sesh:
        existing = sesh.exec(select(Slot)).first()
        if existing is not None:
            return

        for row in _SEED_ROWS:
            sesh.add(row)
        sesh.commit()
