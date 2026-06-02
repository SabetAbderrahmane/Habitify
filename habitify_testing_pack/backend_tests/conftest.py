import os
import sys
import tempfile
from pathlib import Path
from uuid import uuid4

# repo root: Habitify/habitify_testing_pack/backend_tests/conftest.py -> parents[2]
REPO_ROOT = Path(__file__).resolve().parents[2]
BACKEND_DIR = REPO_ROOT / "backend"

if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

TEST_DB_DIR = Path(tempfile.mkdtemp(prefix="habitify_test_db_"))
TEST_DB_PATH = TEST_DB_DIR / "habitify_test.sqlite3"

os.environ.setdefault("SECRET_KEY", "test-secret-key-not-for-production")
os.environ.setdefault("JWT_ALGORITHM", "HS256")
os.environ.setdefault("ACCESS_TOKEN_EXPIRE_HOURS", "12")
os.environ.setdefault("DATABASE_PATH", str(TEST_DB_PATH))
os.environ.setdefault("CORS_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173")

import pytest
from fastapi.testclient import TestClient
from main import app


@pytest.fixture(scope="session")
def client():
    with TestClient(app) as c:
        yield c


def unique_email(prefix="testuser"):
    return f"{prefix}_{uuid4().hex[:12]}@example.com"


def signup(client, email=None, password="password123"):
    email = email or unique_email()
    res = client.post("/signup", json={"email": email, "password": password})
    assert res.status_code in (200, 400), res.text
    if res.status_code == 400:
        assert "already" in res.text.lower()
    return email, password


def login(client, email, password="password123"):
    res = client.post("/login", json={"email": email, "password": password})
    assert res.status_code == 200, res.text
    token = res.json()["access_token"]
    assert token
    return token


def auth_headers(token):
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def user_auth(client):
    email, password = signup(client)
    token = login(client, email, password)
    return {"email": email, "password": password, "token": token, "headers": auth_headers(token)}


def create_habit(client, headers, name=None, category="Health", target="Daily", frequency="daily"):
    payload = {
        "name": name or f"Habit {uuid4().hex[:8]}",
        "category": category,
        "target": target,
        "frequency": frequency,
    }
    res = client.post("/habits/", json=payload, headers=headers)
    assert res.status_code == 200, res.text
    data = res.json()
    assert data["id"]
    assert data["name"] == payload["name"]
    return data
