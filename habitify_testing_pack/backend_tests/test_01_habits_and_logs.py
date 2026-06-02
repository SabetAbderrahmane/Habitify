from datetime import date
from uuid import uuid4

from conftest import create_habit


def test_habit_crud_and_archive_flow(client, user_auth):
    headers = user_auth["headers"]
    name = f"Drink Water {uuid4().hex[:8]}"

    created = create_habit(client, headers, name=name, category="Health")

    res = client.get("/habits/", headers=headers)
    assert res.status_code == 200
    assert any(h["id"] == created["id"] for h in res.json())

    dup = client.post("/habits/", json={"name": name, "category": "Health", "target": "Daily", "frequency": "daily"}, headers=headers)
    assert dup.status_code == 400

    patch = client.patch(
        f"/habits/{created['id']}",
        json={"name": name + " Updated", "category": "Productivity", "archived": True},
        headers=headers,
    )
    assert patch.status_code == 200
    assert patch.json()["archived"] is True

    active_only = client.get("/habits/", headers=headers)
    assert active_only.status_code == 200
    assert all(h["id"] != created["id"] for h in active_only.json())

    with_archived = client.get("/habits/?include_archived=true", headers=headers)
    assert with_archived.status_code == 200
    assert any(h["id"] == created["id"] for h in with_archived.json())

    delete_res = client.delete(f"/habits/{created['id']}", headers=headers)
    assert delete_res.status_code == 200

    missing_res = client.delete(f"/habits/{created['id']}", headers=headers)
    assert missing_res.status_code == 404


def test_habit_log_create_upsert_list_delete(client, user_auth):
    headers = user_auth["headers"]
    habit = create_habit(client, headers)
    today = date.today().isoformat()

    create_log = client.post(
        "/habits/logs",
        json={"habit_id": habit["id"], "progress": 40, "date": today},
        headers=headers,
    )
    assert create_log.status_code == 200, create_log.text
    log = create_log.json()
    assert log["progress"] == 40
    assert log["name"] == habit["name"]

    upsert_log = client.post(
        "/habits/logs",
        json={"habit_id": habit["id"], "progress": 90, "date": today},
        headers=headers,
    )
    assert upsert_log.status_code == 200
    assert upsert_log.json()["id"] == log["id"]
    assert upsert_log.json()["progress"] == 90

    by_date = client.get(f"/habits/logs?date={today}", headers=headers)
    assert by_date.status_code == 200
    assert any(row["id"] == log["id"] for row in by_date.json())

    by_habit = client.get(f"/habits/logs?habit_id={habit['id']}", headers=headers)
    assert by_habit.status_code == 200
    assert any(row["habit_id"] == habit["id"] for row in by_habit.json())

    delete_log = client.delete(f"/habits/logs/{log['id']}", headers=headers)
    assert delete_log.status_code == 200


def test_habit_log_validation_and_ownership(client, user_auth):
    headers = user_auth["headers"]

    bad_progress = client.post(
        "/habits/logs",
        json={"habit_id": "missing", "progress": 101, "date": date.today().isoformat()},
        headers=headers,
    )
    assert bad_progress.status_code == 422

    missing_habit = client.post(
        "/habits/logs",
        json={"habit_id": "missing", "progress": 50, "date": date.today().isoformat()},
        headers=headers,
    )
    assert missing_habit.status_code == 404
