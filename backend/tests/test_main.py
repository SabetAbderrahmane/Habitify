import pytest
from fastapi.testclient import TestClient
from main import app
import uuid

client = TestClient(app)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _email():
    return f"u_{uuid.uuid4().hex[:10]}@test.com"

def _signup_and_login(email=None, password="TestPass123!"):
    email = email or _email()
    r = client.post("/signup", json={"email": email, "password": password})
    assert r.status_code == 200, f"Signup failed: {r.text}"
    r2 = client.post("/login", json={"email": email, "password": password})
    assert r2.status_code == 200, f"Login failed: {r2.text}"
    return r2.json()["access_token"], email

def _auth(token):
    return {"Authorization": f"Bearer {token}"}


# ---------------------------------------------------------------------------
# Root
# ---------------------------------------------------------------------------

def test_read_root():
    r = client.get("/")
    assert r.status_code == 200
    assert r.json() == {"message": "Welcome to the Habit Tracker API!"}


# ---------------------------------------------------------------------------
# Authentication
# ---------------------------------------------------------------------------

def test_auth_status_unauthorized():
    r = client.get("/status")
    assert r.status_code == 401


def test_signup():
    r = client.post("/signup", json={"email": _email(), "password": "TestPass123!"})
    assert r.status_code == 200


def test_signup_duplicate():
    email = _email()
    client.post("/signup", json={"email": email, "password": "TestPass123!"})
    r = client.post("/signup", json={"email": email, "password": "TestPass123!"})
    assert r.status_code == 400


def test_login_success():
    token, _ = _signup_and_login()
    assert token  # non-empty JWT


def test_login_wrong_password():
    email = _email()
    client.post("/signup", json={"email": email, "password": "TestPass123!"})
    r = client.post("/login", json={"email": email, "password": "WrongPassword!"})
    assert r.status_code in (400, 401)


# ---------------------------------------------------------------------------
# Habits
# ---------------------------------------------------------------------------

def test_create_habit_definition_no_auth():
    r = client.post("/habits/", json={"name": "Unauthed", "category": "Health"})
    assert r.status_code == 401


def test_create_and_list_habit():
    token, _ = _signup_and_login()
    r = client.post(
        "/habits/",
        json={"name": "Read 10 pages", "category": "Productivity", "target": "Daily", "frequency": "daily"},
        headers=_auth(token),
    )
    assert r.status_code == 200
    data = r.json()
    assert data["name"] == "Read 10 pages"
    assert data["category"] == "Productivity"

    # List
    r2 = client.get("/habits/", headers=_auth(token))
    assert r2.status_code == 200
    names = [h["name"] for h in r2.json()]
    assert "Read 10 pages" in names


# ---------------------------------------------------------------------------
# Habit logs
# ---------------------------------------------------------------------------

def _create_habit(token, name="Test Habit", category="Health"):
    r = client.post("/habits/", json={"name": name, "category": category}, headers=_auth(token))
    assert r.status_code == 200, r.text
    return r.json()["id"]


def test_create_habit_log():
    token, _ = _signup_and_login()
    habit_id = _create_habit(token, "Meditate", "Mindfulness")

    r = client.post(
        "/habits/logs",
        json={"habit_id": habit_id, "progress": 75, "date": "2026-05-09"},
        headers=_auth(token),
    )
    assert r.status_code == 200
    assert r.json()["progress"] == 75


def test_fetch_habit_logs():
    token, _ = _signup_and_login()
    habit_id = _create_habit(token, "Walk", "Health")
    client.post("/habits/logs", json={"habit_id": habit_id, "progress": 50, "date": "2026-05-09"}, headers=_auth(token))

    r = client.get("/habits/logs", headers=_auth(token))
    assert r.status_code == 200
    assert any(lg["habit_id"] == habit_id for lg in r.json())


def test_upsert_same_day_progress():
    """Posting the same habit_id + date twice should update, not duplicate."""
    token, _ = _signup_and_login()
    habit_id = _create_habit(token, "Yoga", "Mindfulness")

    client.post("/habits/logs", json={"habit_id": habit_id, "progress": 30, "date": "2026-05-09"}, headers=_auth(token))
    r = client.post("/habits/logs", json={"habit_id": habit_id, "progress": 90, "date": "2026-05-09"}, headers=_auth(token))
    assert r.status_code == 200
    assert r.json()["progress"] == 90

    # Exactly one log for that date
    logs = client.get("/habits/logs", params={"date": "2026-05-09"}, headers=_auth(token)).json()
    same_day = [l for l in logs if l["habit_id"] == habit_id]
    assert len(same_day) == 1


def test_delete_habit_log():
    token, _ = _signup_and_login()
    habit_id = _create_habit(token, "Run", "Health")

    r = client.post("/habits/logs", json={"habit_id": habit_id, "progress": 60, "date": "2026-05-09"}, headers=_auth(token))
    log_id = r.json()["id"]

    d = client.delete(f"/habits/logs/{log_id}", headers=_auth(token))
    assert d.status_code == 200

    logs = client.get("/habits/logs", headers=_auth(token)).json()
    assert not any(l["id"] == log_id for l in logs)


# ---------------------------------------------------------------------------
# Export data (verifies JOIN query after schema migration)
# ---------------------------------------------------------------------------

def test_export_data_after_schema():
    token, _ = _signup_and_login()
    habit_id = _create_habit(token, "Journal", "Mindfulness")
    client.post("/habits/logs", json={"habit_id": habit_id, "progress": 100, "date": "2026-05-09"}, headers=_auth(token))

    r = client.get("/export/data", headers=_auth(token))
    assert r.status_code == 200
    body = r.json()
    logs = body["data"]["habit_logs"]
    assert len(logs) >= 1
    # After JOIN fix, each log row must include "name"
    for log in logs:
        assert "name" in log
        assert log["name"] == "Journal"


# ---------------------------------------------------------------------------
# Predictions
# ---------------------------------------------------------------------------

def test_prediction_returns_source_field():
    """Each prediction must include a 'source' field."""
    token, _ = _signup_and_login()
    habit_id = _create_habit(token, "Study", "Productivity")
    client.post("/habits/logs", json={"habit_id": habit_id, "progress": 50, "date": "2026-05-09"}, headers=_auth(token))

    r = client.get("/predictions/lapse-risk", headers=_auth(token))
    assert r.status_code == 200
    for pred in r.json():
        assert pred["source"] in ("ml", "rule_based_fallback")
        assert "lapse_risk_score" in pred
        assert "risk_level" in pred


def test_prediction_no_habits_returns_empty():
    token, _ = _signup_and_login()
    r = client.get("/predictions/lapse-risk", headers=_auth(token))
    assert r.status_code == 200
    assert r.json() == []


# ---------------------------------------------------------------------------
# Check-in mood/energy normalization (pure unit tests)
# ---------------------------------------------------------------------------

def test_checkin_mood_normalization():
    from api.checkin import normalize_mood, normalize_energy

    assert normalize_mood("Great") == "Happy"
    assert normalize_mood("Medium") == "Neutral"
    assert normalize_mood("Bad") == "Sad"
    assert normalize_mood(None) == "Neutral"
    assert normalize_mood("") == "Neutral"
    assert normalize_mood("Happy") == "Happy"

    assert normalize_energy("Medium") == "Moderate"
    assert normalize_energy(None) == "Moderate"
    assert normalize_energy("Good") == "Good"
    assert normalize_energy("Drained") == "Drained"
    assert normalize_energy("") == "Moderate"
