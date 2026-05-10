# backend/seed_demo_user_3_months.py

"""
Seed a synthetic 3-month Habitify demo user.

Purpose:
- Create realistic demo data for screenshots.
- Show habit progress, check-ins, insights, nudges, recovery, and export screens.
- This is synthetic demo data, not real user research data.

Run from backend/:

    .\env\Scripts\python seed_demo_user_3_months.py

Demo login:

    thesis.demo@habitify.local
    DemoPass123!
"""

from __future__ import annotations

import random
import uuid
from datetime import date, datetime, timedelta

from api.auth import hash_password
from db import get_connection, init_db, seed_recommended_and_core_data


DEMO_EMAIL = "thesis.demo.habitify@gmail.com"
DEMO_PASSWORD = "DemoPass123!"

random.seed(42)


def clamp(value: int, low: int = 0, high: int = 100) -> int:
    return max(low, min(high, value))


def iso(d: date) -> str:
    return d.isoformat()


def delete_existing_demo_user(conn, email: str) -> None:
    user = conn.execute("SELECT id FROM users WHERE email = ?", (email,)).fetchone()

    if not user:
        return

    user_id = user["id"]

    # Delete child records manually because not every FK has ON DELETE CASCADE.
    tables = [
        "prediction_history",
        "scheduled_notifications",
        "nudge_history",
        "recovery_events",
        "daily_checkins",
        "user_profiles",
        "habit_logs",
        "habits",
    ]

    for table in tables:
        conn.execute(f"DELETE FROM {table} WHERE user_id = ?", (user_id,))

    conn.execute("DELETE FROM users WHERE id = ?", (user_id,))
    conn.commit()


def create_demo_user(conn) -> int:
    conn.execute(
        """
        INSERT INTO users (email, password_hash)
        VALUES (?, ?)
        """,
        (DEMO_EMAIL, hash_password(DEMO_PASSWORD)),
    )
    conn.commit()

    user = conn.execute(
        "SELECT id FROM users WHERE email = ?",
        (DEMO_EMAIL,),
    ).fetchone()

    return user["id"]


def create_profile(conn, user_id: int) -> None:
    conn.execute(
        """
        INSERT INTO user_profiles (user_id, goal, time_commitment, best_time)
        VALUES (?, ?, ?, ?)
        """,
        (user_id, "discipline", "30 min", "Morning"),
    )


def create_habits(conn, user_id: int) -> dict[str, str]:
    habits = [
        {
            "name": "Drink water",
            "category": "Health",
            "target": "Daily",
            "frequency": "daily",
        },
        {
            "name": "Sleep on time",
            "category": "Sleep",
            "target": "Daily",
            "frequency": "daily",
        },
        {
            "name": "Walk 10 minutes",
            "category": "Fitness",
            "target": "Daily",
            "frequency": "daily",
        },
        {
            "name": "Read 10 pages",
            "category": "Productivity",
            "target": "Daily",
            "frequency": "daily",
        },
        {
            "name": "Stretch 5 minutes",
            "category": "Mobility",
            "target": "Daily",
            "frequency": "daily",
        },
        {
            "name": "Journal 5 min",
            "category": "Mindfulness",
            "target": "Daily",
            "frequency": "daily",
        },
        {
            "name": "No phone first 30 min",
            "category": "Discipline",
            "target": "Daily",
            "frequency": "daily",
        },
        {
            "name": "25-min deep work",
            "category": "Productivity",
            "target": "Daily",
            "frequency": "daily",
        },
    ]

    habit_ids: dict[str, str] = {}

    for habit in habits:
        habit_id = str(uuid.uuid4())

        conn.execute(
            """
            INSERT INTO habits (id, user_id, name, category, target, frequency, archived)
            VALUES (?, ?, ?, ?, ?, ?, 0)
            """,
            (
                habit_id,
                user_id,
                habit["name"],
                habit["category"],
                habit["target"],
                habit["frequency"],
            ),
        )

        habit_ids[habit["name"]] = habit_id

    return habit_ids


def progress_for_habit(habit_name: str, day_index: int, current_day: date) -> int | None:
    """
    Return progress for a habit on a given day.

    None means no log for that habit/day.
    The pattern intentionally improves across 3 months:
    - Month 1: unstable
    - Month 2: improving
    - Month 3: stronger consistency
    """

    weekday = current_day.weekday()
    weekend = weekday >= 5

    # Three phases across 90 days.
    if day_index < 30:
        consistency_bonus = -15
        skip_chance = 0.24
    elif day_index < 60:
        consistency_bonus = 0
        skip_chance = 0.14
    else:
        consistency_bonus = 12
        skip_chance = 0.07

    # Some habits are more likely to be missed.
    habit_skip_modifier = {
        "Drink water": -0.12,
        "Sleep on time": 0.08,
        "Walk 10 minutes": 0.00,
        "Read 10 pages": 0.05,
        "Stretch 5 minutes": 0.03,
        "Journal 5 min": 0.09,
        "No phone first 30 min": 0.12,
        "25-min deep work": 0.10,
    }.get(habit_name, 0)

    final_skip_chance = max(0.02, min(0.60, skip_chance + habit_skip_modifier))

    # Weekend makes productivity/discipline habits more volatile.
    if weekend and habit_name in {"Read 10 pages", "No phone first 30 min", "25-min deep work"}:
        final_skip_chance += 0.08

    if random.random() < final_skip_chance:
        return None

    base = {
        "Drink water": 78,
        "Sleep on time": 58,
        "Walk 10 minutes": 66,
        "Read 10 pages": 52,
        "Stretch 5 minutes": 55,
        "Journal 5 min": 45,
        "No phone first 30 min": 38,
        "25-min deep work": 48,
    }.get(habit_name, 50)

    noise = random.randint(-22, 20)

    # Specific behavior patterns.
    if habit_name == "Drink water":
        noise += random.randint(5, 18)

    if habit_name == "Sleep on time" and weekend:
        noise -= random.randint(8, 25)

    if habit_name == "Walk 10 minutes" and weekend:
        noise += random.randint(0, 12)

    if habit_name == "No phone first 30 min":
        # This one improves sharply after the first month.
        if day_index > 45:
            noise += 18
        if day_index > 70:
            noise += 10

    if habit_name == "25-min deep work":
        if weekday in {0, 1, 2, 3}:
            noise += 12
        if weekend:
            noise -= 18

    return clamp(base + consistency_bonus + noise)


def create_habit_logs(conn, user_id: int, habit_ids: dict[str, str], start_day: date, days: int) -> None:
    for day_index in range(days):
        current = start_day + timedelta(days=day_index)

        for habit_name, habit_id in habit_ids.items():
            progress = progress_for_habit(habit_name, day_index, current)

            if progress is None:
                continue

            conn.execute(
                """
                INSERT INTO habit_logs (id, habit_id, user_id, progress, date)
                VALUES (?, ?, ?, ?, ?)
                """,
                (
                    str(uuid.uuid4()),
                    habit_id,
                    user_id,
                    progress,
                    iso(current),
                ),
            )


def create_checkins(conn, user_id: int, start_day: date, days: int) -> None:
    mood_cycle = ["Neutral", "Good", "Good", "Low", "Neutral", "Happy", "Good"]
    energy_cycle = ["Moderate", "Good", "High", "Low", "Moderate", "Good", "Moderate"]

    difficult_options = [
        "",
        "Phone distraction",
        "Low sleep",
        "Workload",
        "Low motivation",
        "Too much screen time",
        "Late night routine",
    ]

    notes = [
        "Kept the basic routine alive.",
        "Small progress but better than skipping.",
        "Felt more focused after morning habits.",
        "Struggled a bit but completed key tasks.",
        "Good momentum today.",
        "Need to sleep earlier tomorrow.",
        "Strong day. Discipline felt easier.",
        "",
    ]

    for day_index in range(days):
        current = start_day + timedelta(days=day_index)

        # Skip some check-ins in month 1, fewer later.
        if day_index < 30 and random.random() < 0.22:
            continue
        if 30 <= day_index < 60 and random.random() < 0.12:
            continue
        if day_index >= 60 and random.random() < 0.06:
            continue

        mood = mood_cycle[(day_index + random.randint(0, 2)) % len(mood_cycle)]
        energy = energy_cycle[(day_index + random.randint(0, 2)) % len(energy_cycle)]

        # Improvement trend.
        if day_index > 60 and random.random() < 0.35:
            mood = random.choice(["Good", "Happy"])
            energy = random.choice(["Good", "High"])

        had_urges = 1 if random.random() < (0.22 if day_index < 45 else 0.10) else 0

        conn.execute(
            """
            INSERT INTO daily_checkins (
                user_id, date, mood, energy, had_urges, difficult, note, completed
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, 1)
            """,
            (
                user_id,
                iso(current),
                mood,
                energy,
                had_urges,
                random.choice(difficult_options),
                random.choice(notes),
            ),
        )


def create_recovery_events(conn, user_id: int, start_day: date) -> None:
    """
    Add a few synthetic recovery events so the recovery screen has something to show.
    This should be described as synthetic demo data only.
    """

    events = [
        (8, "smoking", "survived_urge", "Stress after studying"),
        (15, "doomscrolling", "relapse", "Late night phone use"),
        (24, "smoking", "survived_urge", "After coffee"),
        (35, "doomscrolling", "survived_urge", "Boredom"),
        (48, "smoking", "relapse", "Social trigger"),
        (59, "doomscrolling", "survived_urge", "Before sleep"),
        (71, "smoking", "survived_urge", "Anxiety"),
        (82, "doomscrolling", "survived_urge", "Weekend boredom"),
    ]

    for offset, habit_key, event_type, trigger in events:
        created_at = datetime.combine(
            start_day + timedelta(days=offset),
            datetime.min.time(),
        ).replace(hour=random.choice([10, 15, 21]), minute=random.randint(0, 59))

        conn.execute(
            """
            INSERT INTO recovery_events (user_id, habit_key, event_type, trigger, created_at)
            VALUES (?, ?, ?, ?, ?)
            """,
            (
                user_id,
                habit_key,
                event_type,
                trigger,
                created_at.isoformat(sep=" "),
            ),
        )


def create_nudge_history(conn, user_id: int, start_day: date) -> None:
    nudge_rows = [
        (5, "no_logs_today", ""),
        (13, "core_missed_2days", "Sleep on time"),
        (20, "recommended_not_started", "25-min deep work"),
        (31, "low_mood_2days", ""),
        (44, "core_missed_2days", "No phone first 30 min"),
        (58, "relapse_yesterday", ""),
        (76, "recommended_not_started", "Journal 5 min"),
    ]

    for offset, nudge_type, habit_name in nudge_rows:
        shown_at = datetime.combine(
            start_day + timedelta(days=offset),
            datetime.min.time(),
        ).replace(hour=random.choice([8, 12, 19]), minute=random.randint(0, 59))

        conn.execute(
            """
            INSERT INTO nudge_history (user_id, nudge_type, habit_name, shown_at)
            VALUES (?, ?, ?, ?)
            """,
            (
                user_id,
                nudge_type,
                habit_name,
                shown_at.isoformat(sep=" "),
            ),
        )


def create_scheduled_notifications(conn, user_id: int, start_day: date) -> None:
    notifications = [
        ("no_logs_today", "", "Quick check-in", "Log one small habit today.", "/app"),
        ("core_missed_2days", "Sleep on time", "Protect sleep", "Try sleeping earlier tonight.", "/app/core"),
        ("recommended_not_started", "25-min deep work", "Start focus habit", "Do one 25-minute deep work session.", "/app/recommended"),
        ("low_mood_2days", "", "Stabilizer routine", "Water, walk, and early sleep today.", "/app/checkin"),
    ]

    for i, item in enumerate(notifications):
        scheduled_for = datetime.combine(
            start_day + timedelta(days=80 + i),
            datetime.min.time(),
        ).replace(hour=9 + i, minute=0)

        conn.execute(
            """
            INSERT INTO scheduled_notifications (
                user_id, nudge_type, habit_name, title, message, action_path, scheduled_for, status
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                user_id,
                item[0],
                item[1],
                item[2],
                item[3],
                item[4],
                scheduled_for.isoformat(sep=" "),
                "pending" if i < 2 else "seen",
            ),
        )


def create_prediction_history(conn, user_id: int, habit_ids: dict[str, str], start_day: date) -> None:
    """
    Optional historical prediction rows.
    The live /predictions/lapse-risk endpoint will also generate prediction rows.
    """

    selected_habits = [
        "Sleep on time",
        "No phone first 30 min",
        "25-min deep work",
        "Read 10 pages",
    ]

    for offset in [20, 35, 50, 65, 80]:
        for habit_name in selected_habits:
            habit_id = habit_ids[habit_name]

            # Risk improves over time.
            base_risk = 0.68 - (offset / 180)
            noise = random.uniform(-0.08, 0.08)
            score = round(max(0.12, min(0.85, base_risk + noise)), 4)

            if score > 0.7:
                label = "High"
            elif score > 0.4:
                label = "Medium"
            else:
                label = "Low"

            features = {
                "demo": True,
                "source": "synthetic_seed",
                "habit_name": habit_name,
                "offset_day": offset,
            }

            conn.execute(
                """
                INSERT INTO prediction_history (
                    user_id, habit_id, prediction_score, prediction_label, features_json, created_at
                )
                VALUES (?, ?, ?, ?, ?, ?)
                """,
                (
                    user_id,
                    habit_id,
                    score,
                    label,
                    str(features),
                    datetime.combine(start_day + timedelta(days=offset), datetime.min.time()).isoformat(sep=" "),
                ),
            )


def main() -> None:
    init_db()
    seed_recommended_and_core_data()

    end_day = date.today()
    days = 90
    start_day = end_day - timedelta(days=days - 1)

    conn = get_connection()

    try:
        delete_existing_demo_user(conn, DEMO_EMAIL)

        user_id = create_demo_user(conn)
        create_profile(conn, user_id)
        habit_ids = create_habits(conn, user_id)

        create_habit_logs(conn, user_id, habit_ids, start_day, days)
        create_checkins(conn, user_id, start_day, days)
        create_recovery_events(conn, user_id, start_day)
        create_nudge_history(conn, user_id, start_day)
        create_scheduled_notifications(conn, user_id, start_day)
        create_prediction_history(conn, user_id, habit_ids, start_day)

        conn.commit()

        log_count = conn.execute(
            "SELECT COUNT(*) AS c FROM habit_logs WHERE user_id = ?",
            (user_id,),
        ).fetchone()["c"]

        checkin_count = conn.execute(
            "SELECT COUNT(*) AS c FROM daily_checkins WHERE user_id = ?",
            (user_id,),
        ).fetchone()["c"]

        print("Synthetic demo user seeded successfully.")
        print(f"Email:    {DEMO_EMAIL}")
        print(f"Password: {DEMO_PASSWORD}")
        print(f"User ID:  {user_id}")
        print(f"Date range: {start_day.isoformat()} to {end_day.isoformat()}")
        print(f"Habit definitions: {len(habit_ids)}")
        print(f"Habit logs:        {log_count}")
        print(f"Check-ins:         {checkin_count}")

    finally:
        conn.close()


if __name__ == "__main__":
    main()