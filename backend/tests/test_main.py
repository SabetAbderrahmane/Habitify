import pytest
from fastapi.testclient import TestClient
from main import app

client = TestClient(app)

def test_read_root():
    response = client.get("/")
    assert response.status_code == 200
    assert response.json() == {"message": "Welcome to the Habit Tracker API!"}

def test_auth_status_unauthorized():
    response = client.get("/status")
    assert response.status_code == 401
