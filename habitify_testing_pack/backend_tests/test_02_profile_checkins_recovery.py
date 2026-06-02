from datetime import date


def test_profile_onboarding_default_and_update(client, user_auth):
    headers = user_auth["headers"]

    default_res = client.get("/profile/onboarding", headers=headers)
    assert default_res.status_code == 200
    assert default_res.json()["goal"] == "focus"

    payload = {"goal": "fitness", "time_commitment": "15 min", "best_time": "Evening"}
    save_res = client.post("/profile/onboarding", json=payload, headers=headers)
    assert save_res.status_code == 200
    assert save_res.json() == payload

    get_res = client.get("/profile/onboarding", headers=headers)
    assert get_res.status_code == 200
    assert get_res.json() == payload


def test_daily_checkin_upsert(client, user_auth):
    headers = user_auth["headers"]
    today = date.today().isoformat()

    missing = client.get(f"/checkins/{today}", headers=headers)
    assert missing.status_code == 200
    assert missing.json()["date"] == today
    assert missing.json()["completed"] is False

    payload = {
        "date": today,
        "mood": "Good",
        "energy": "High",
        "had_urges": False,
        "difficult": "none",
        "note": "solid day",
        "completed": True,
    }
    create_res = client.post("/checkins", json=payload, headers=headers)
    assert create_res.status_code == 200
    assert create_res.json()["mood"] == "Good"
    assert create_res.json()["completed"] is True

    payload["mood"] = "Low"
    payload["had_urges"] = True
    update_res = client.post("/checkins", json=payload, headers=headers)
    assert update_res.status_code == 200
    assert update_res.json()["mood"] == "Low"
    assert update_res.json()["had_urges"] is True


def test_checkin_rejects_invalid_enum(client, user_auth):
    res = client.post(
        "/checkins",
        json={"date": date.today().isoformat(), "mood": "Exploding", "energy": "High"},
        headers=user_auth["headers"],
    )
    assert res.status_code == 422


def test_recovery_plan_events_and_stats(client, user_auth):
    headers = user_auth["headers"]

    plan = client.get("/recovery/plans/smoking")
    assert plan.status_code == 200
    assert plan.json()["habit_key"] == "smoking"
    assert isinstance(plan.json()["replacements"], list)

    relapse = client.post("/recovery/relapse", json={"habit_key": "smoking", "trigger": "stress"}, headers=headers)
    assert relapse.status_code == 200

    survived = client.post("/recovery/survived-urge", json={"habit_key": "smoking", "trigger": "stress"}, headers=headers)
    assert survived.status_code == 200

    stats = client.get("/recovery/stats/smoking", headers=headers)
    assert stats.status_code == 200
    data = stats.json()
    assert data["relapseCount"] >= 1
    assert data["survivedCount"] >= 1
    assert data["strongestTrigger"] == "stress"
