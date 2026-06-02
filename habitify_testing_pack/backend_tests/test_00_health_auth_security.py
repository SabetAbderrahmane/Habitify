from conftest import signup, login, auth_headers, unique_email


def test_root_health(client):
    res = client.get("/")
    assert res.status_code == 200
    assert res.json()["message"] == "Welcome to the Habit Tracker API!"


def test_signup_login_and_status(client):
    email, password = signup(client)
    token = login(client, email, password)

    res = client.get("/status", headers=auth_headers(token))
    assert res.status_code == 200
    assert res.json()["status"] == "authenticated"
    assert res.json()["email"] == email


def test_signup_rejects_weak_password(client):
    res = client.post("/signup", json={"email": unique_email(), "password": "123"})
    assert res.status_code == 400
    assert "password" in res.text.lower()


def test_signup_rejects_invalid_email(client):
    res = client.post("/signup", json={"email": "not-an-email", "password": "password123"})
    assert res.status_code == 422


def test_login_rejects_wrong_password(client):
    email, _ = signup(client)
    res = client.post("/login", json={"email": email, "password": "wrong-password"})
    assert res.status_code == 400
    assert "invalid" in res.text.lower()


def test_protected_route_rejects_missing_token(client):
    res = client.get("/status")
    assert res.status_code == 401


def test_protected_route_rejects_malformed_token(client):
    res = client.get("/status", headers={"Authorization": "Bearer broken.token.value"})
    assert res.status_code == 401
