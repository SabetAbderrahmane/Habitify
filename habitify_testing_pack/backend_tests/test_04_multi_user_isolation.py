from datetime import date

from conftest import signup, login, auth_headers, create_habit


def test_users_cannot_see_or_mutate_each_others_habits(client):
    email_a, password_a = signup(client)
    token_a = login(client, email_a, password_a)
    headers_a = auth_headers(token_a)

    email_b, password_b = signup(client)
    token_b = login(client, email_b, password_b)
    headers_b = auth_headers(token_b)

    habit_a = create_habit(client, headers_a, name="Private Habit A")
    habit_b = create_habit(client, headers_b, name="Private Habit B")

    list_a = client.get("/habits/", headers=headers_a)
    assert list_a.status_code == 200
    ids_a = {h["id"] for h in list_a.json()}
    assert habit_a["id"] in ids_a
    assert habit_b["id"] not in ids_a

    list_b = client.get("/habits/", headers=headers_b)
    assert list_b.status_code == 200
    ids_b = {h["id"] for h in list_b.json()}
    assert habit_b["id"] in ids_b
    assert habit_a["id"] not in ids_b

    delete_other = client.delete(f"/habits/{habit_a['id']}", headers=headers_b)
    assert delete_other.status_code == 404

    log_other = client.post(
        "/habits/logs",
        json={"habit_id": habit_a["id"], "progress": 50, "date": date.today().isoformat()},
        headers=headers_b,
    )
    assert log_other.status_code == 404
