from datetime import date


def test_create_habit_requires_valid_contract(client, user_auth):
    headers = user_auth["headers"]

    too_short = client.post(
        "/habits/",
        json={"name": "A", "category": "Health", "target": "Daily", "frequency": "daily"},
        headers=headers,
    )
    assert too_short.status_code == 422

    bad_frequency = client.post(
        "/habits/",
        json={"name": "Valid Name", "category": "Health", "target": "Daily", "frequency": "monthly"},
        headers=headers,
    )
    assert bad_frequency.status_code == 422


def test_export_requires_authentication(client):
    res = client.get("/export/data")
    assert res.status_code == 401


def test_notifications_missing_id_returns_404(client, user_auth):
    res = client.post("/notifications/99999999/dismiss", headers=user_auth["headers"])
    assert res.status_code == 404


def test_invalid_log_date_is_rejected(client, user_auth):
    res = client.post(
        "/habits/logs",
        json={"habit_id": "anything", "progress": 50, "date": "not-a-date"},
        headers=user_auth["headers"],
    )
    assert res.status_code == 422
