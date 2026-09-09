import pytest
from fastapi.testclient import TestClient
from sqlmodel import SQLModel, Session, create_engine
from sqlmodel.pool import StaticPool

from main import app
from db import get_session


@pytest.fixture(name="session")
def session_fixture():
    engine = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    SQLModel.metadata.create_all(engine)
    with Session(engine) as session:
        yield session


@pytest.fixture(name="client")
def client_fixture(session: Session):
    def get_session_override():
        return session

    app.dependency_overrides[get_session] = get_session_override
    client = TestClient(app)
    yield client
    app.dependency_overrides.clear()


def test_list_slots_empty(client: TestClient):
    res = client.get("/api/slots")
    assert res.status_code == 200
    assert res.json() == []


def test_create_slot_success(client: TestClient):
    payload = {
        "title": "Swiggy Tech Round",
        "description": "DSA and System Design discussion",
        "slot_date": "2026-10-15",
        "start_time": "10:00:00",
        "end_time": "11:00:00",
        "touched_by": "Aftab",
    }
    res = client.post("/api/slots", json=payload)
    assert res.status_code == 201
    data = res.json()
    assert data["title"] == "Swiggy Tech Round"
    assert data["status"] == "scheduled"
    assert data["id"] is not None


def test_overlap_same_day_rejected(client: TestClient):
    base = {
        "title": "Design Review",
        "slot_date": "2026-10-15",
        "start_time": "10:00:00",
        "end_time": "11:00:00",
    }
    client.post("/api/slots", json=base)

    conflict = {
        "title": "Overlapping Sync",
        "slot_date": "2026-10-15",
        "start_time": "10:30:00",
        "end_time": "11:30:00",
    }
    res = client.post("/api/slots", json=conflict)
    assert res.status_code == 409
    assert "overlaps" in res.json()["detail"].lower()


def test_adjacent_slots_allowed(client: TestClient):
    client.post("/api/slots", json={
        "title": "First Meeting",
        "slot_date": "2026-10-15",
        "start_time": "09:00:00",
        "end_time": "10:00:00",
    })

    res = client.post("/api/slots", json={
        "title": "Second Meeting",
        "slot_date": "2026-10-15",
        "start_time": "10:00:00",
        "end_time": "11:00:00",
    })
    assert res.status_code == 201


def test_overlap_different_days_allowed(client: TestClient):
    client.post("/api/slots", json={
        "title": "Day 1 Sync",
        "slot_date": "2026-10-15",
        "start_time": "14:00:00",
        "end_time": "15:00:00",
    })

    res = client.post("/api/slots", json={
        "title": "Day 2 Sync",
        "slot_date": "2026-10-16",
        "start_time": "14:00:00",
        "end_time": "15:00:00",
    })
    assert res.status_code == 201


def test_cancelled_slot_does_not_block_booking(client: TestClient):
    created = client.post("/api/slots", json={
        "title": "Cancelled Check-in",
        "slot_date": "2026-10-15",
        "start_time": "15:00:00",
        "end_time": "16:00:00",
    }).json()

    client.patch(f"/api/slots/{created['id']}", json={"status": "cancelled"})

    res = client.post("/api/slots", json={
        "title": "Replacement Meeting",
        "slot_date": "2026-10-15",
        "start_time": "15:00:00",
        "end_time": "16:00:00",
    })
    assert res.status_code == 201


def test_patch_status_transitions(client: TestClient):
    slot = client.post("/api/slots", json={
        "title": "Status Test",
        "slot_date": "2026-10-20",
        "start_time": "11:00:00",
        "end_time": "12:00:00",
    }).json()

    res = client.patch(f"/api/slots/{slot['id']}", json={"status": "completed"})
    assert res.status_code == 200
    assert res.json()["status"] == "completed"

    res = client.patch(f"/api/slots/{slot['id']}", json={"status": "cancelled"})
    assert res.status_code == 200
    assert res.json()["status"] == "cancelled"

    res = client.patch(f"/api/slots/{slot['id']}", json={"status": "scheduled"})
    assert res.status_code == 200
    assert res.json()["status"] == "scheduled"
