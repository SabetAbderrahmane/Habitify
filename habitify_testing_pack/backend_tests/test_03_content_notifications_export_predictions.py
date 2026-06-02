from datetime import date, timedelta

from conftest import create_habit


def test_public_recommended_and_core_content(client):
    goals = client.get("/recommended/goals")
    assert goals.status_code == 200
    assert isinstance(goals.json(), list)
    assert len(goals.json()) >= 1

    pack = client.get("/recommended/packs/focus")
    assert pack.status_code == 200
    assert pack.json()["goal"] == "focus"
    assert isinstance(pack.json()["habits"], list)

    unknown = client.get("/recommended/packs/not-real")
    assert unknown.status_code == 200
    assert unknown.json()["habits"] == []

    core = client.get("/core-habits")
    assert core.status_code == 200
    assert isinstance(core.json(), list)
    assert len(core.json()) >= 1


def test_nudges_notifications_export_and_predictions(client, user_auth):
    headers = user_auth["headers"]
    habit = create_habit(client, headers, name="Drink water")

    # Create several logs so predictions/export have real data.
    today = date.today()
    for i in range(5):
        d = (today - timedelta(days=i)).isoformat()
        res = client.post(
            "/habits/logs",
            json={"habit_id": habit["id"], "progress": 100 if i % 2 == 0 else 50, "date": d},
            headers=headers,
        )
        assert res.status_code == 200, res.text

    checkin = client.post(
        "/checkins",
        json={
            "date": today.isoformat(),
            "mood": "Good",
            "energy": "Moderate",
            "had_urges": False,
            "difficult": "",
            "note": "",
            "completed": True,
        },
        headers=headers,
    )
    assert checkin.status_code == 200

    nudges = client.get("/nudges/today", headers=headers)
    assert nudges.status_code == 200
    assert isinstance(nudges.json(), list)

    generated = client.post("/notifications/generate", headers=headers)
    assert generated.status_code == 200
    assert "created" in generated.json()
    assert "skipped" in generated.json()

    pending = client.get("/notifications/pending", headers=headers)
    assert pending.status_code == 200
    assert isinstance(pending.json(), list)

    if pending.json():
        notification_id = pending.json()[0]["id"]
        dismiss = client.post(f"/notifications/{notification_id}/dismiss", headers=headers)
        assert dismiss.status_code == 200

    export = client.get("/export/data", headers=headers)
    assert export.status_code == 200
    assert export.headers["content-type"].startswith("application/json")
    payload = export.json()
    assert payload["format_version"] == 1
    assert payload["data"]["user"]["email"] == user_auth["email"]

    predictions = client.get("/predictions/lapse-risk", headers=headers)
    assert predictions.status_code == 200
    data = predictions.json()
    assert isinstance(data, list)
    assert any(item["habit_id"] == habit["id"] for item in data)
    for item in data:
        assert 0 <= item["lapse_risk_score"] <= 1
        assert item["risk_level"] in {"Low", "Medium", "High"}
        assert item["source"] in {"ml", "rule_based_fallback"}
