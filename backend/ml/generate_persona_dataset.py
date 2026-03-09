import sqlite3
import uuid
import hashlib
import random
from dataclasses import dataclass
from datetime import date, timedelta
from pathlib import Path


DB_PATH = Path(__file__).resolve().parents[1] / "habitify.db"


@dataclass
class Persona:
    key: str
    email: str
    goal: str
    time_commitment: str
    best_time: str
    habits: list[str]
    recovery_key: str | None = None
    discipline: float = 0.7
    consistency: float = 0.7
    mood_base: float = 0.7
    energy_base: float = 0.7
    nudge_response: float = 0.5
    weekend_drop: float = 0.10
    burnout_risk: float = 0.10
    exam_stress: bool = False
    relapse_risk: float = 0.05


PERSONAS = [
    Persona(
        key="disciplined_student",
        email="persona_disciplined_student@example.com",
        goal="focus",
        time_commitment="25 min",
        best_time="Morning",
        habits=["Read 10 pages", "25-min deep work", "Drink water", "Sleep on time"],
        discipline=0.90,
        consistency=0.90,
        mood_base=0.72,
        energy_base=0.76,
        nudge_response=0.45,
        weekend_drop=0.05,
        burnout_risk=0.05,
    ),
    Persona(
        key="ambitious_inconsistent_student",
        email="persona_ambitious_inconsistent@example.com",
        goal="discipline",
        time_commitment="25 min",
        best_time="Evening",
        habits=["Finish 1 hard task", "Track your day", "Read 10 pages", "Drink water"],
        discipline=0.82,
        consistency=0.45,
        mood_base=0.64,
        energy_base=0.66,
        nudge_response=0.52,
        weekend_drop=0.12,
        burnout_risk=0.18,
    ),
    Persona(
        key="sleep_deprived_student",
        email="persona_sleep_deprived@example.com",
        goal="sleep",
        time_commitment="15 min",
        best_time="Night",
        habits=["Sleep before 11:30 PM", "No screens before bed", "Prepare tomorrow plan", "Drink water"],
        recovery_key="sleep_late",
        discipline=0.62,
        consistency=0.52,
        mood_base=0.52,
        energy_base=0.40,
        nudge_response=0.60,
        weekend_drop=0.15,
        burnout_risk=0.22,
        relapse_risk=0.08,
    ),
    Persona(
        key="gym_focused_student",
        email="persona_gym_focused@example.com",
        goal="fitness",
        time_commitment="20 min",
        best_time="Afternoon",
        habits=["10-min walk", "Stretch 5 min", "Bodyweight workout", "Drink water"],
        discipline=0.78,
        consistency=0.76,
        mood_base=0.74,
        energy_base=0.78,
        nudge_response=0.42,
        weekend_drop=0.08,
        burnout_risk=0.08,
    ),
    Persona(
        key="smoker_trying_to_quit",
        email="persona_smoker_quit@example.com",
        goal="mental",
        time_commitment="10 min",
        best_time="Morning",
        habits=["Breathing exercise", "Journal 5 min", "10-min walk", "Drink water"],
        recovery_key="smoking",
        discipline=0.60,
        consistency=0.48,
        mood_base=0.50,
        energy_base=0.55,
        nudge_response=0.74,
        weekend_drop=0.10,
        burnout_risk=0.25,
        relapse_risk=0.14,
    ),
    Persona(
        key="stressed_exam_student",
        email="persona_exam_stress@example.com",
        goal="focus",
        time_commitment="30 min",
        best_time="Morning",
        habits=["25-min deep work", "Read 10 pages", "No phone first 30 min", "Drink water"],
        discipline=0.75,
        consistency=0.58,
        mood_base=0.48,
        energy_base=0.52,
        nudge_response=0.65,
        weekend_drop=0.06,
        burnout_risk=0.28,
        exam_stress=True,
    ),
    Persona(
        key="comeback_after_bad_week",
        email="persona_comeback@example.com",
        goal="discipline",
        time_commitment="10 min",
        best_time="Morning",
        habits=["Make your bed", "Track your day", "10-min walk", "Drink water"],
        discipline=0.68,
        consistency=0.50,
        mood_base=0.58,
        energy_base=0.60,
        nudge_response=0.72,
        weekend_drop=0.10,
        burnout_risk=0.16,
    ),
    Persona(
        key="highly_nudge_responsive",
        email="persona_nudge_responsive@example.com",
        goal="energy",
        time_commitment="10 min",
        best_time="Morning",
        habits=["Morning sunlight", "Drink water", "10-min walk", "Journal 5 min"],
        discipline=0.58,
        consistency=0.46,
        mood_base=0.62,
        energy_base=0.64,
        nudge_response=0.92,
        weekend_drop=0.08,
        burnout_risk=0.12,
    ),
    Persona(
        key="productivity_addict",
        email="persona_productivity_addict@example.com",
        goal="focus",
        time_commitment="45 min",
        best_time="Morning",
        habits=["Deep work block", "Plan top 3 tasks", "Review goals", "No phone first 30 min"],
        discipline=0.88,
        consistency=0.72,
        mood_base=0.63,
        energy_base=0.70,
        nudge_response=0.30,
        weekend_drop=0.18,
        burnout_risk=0.30,
    ),
    Persona(
        key="low_energy_beginner",
        email="persona_low_energy_beginner@example.com",
        goal="energy",
        time_commitment="10 min",
        best_time="Morning",
        habits=["Drink water", "Morning sunlight", "10-min walk", "Sleep on time"],
        discipline=0.48,
        consistency=0.42,
        mood_base=0.46,
        energy_base=0.34,
        nudge_response=0.68,
        weekend_drop=0.10,
        burnout_risk=0.20,
    ),
    Persona(
        key="night_owl",
        email="persona_night_owl@example.com",
        goal="sleep",
        time_commitment="15 min",
        best_time="Night",
        habits=["Sleep before 11:30 PM", "No caffeine after 5 PM", "Prepare tomorrow plan", "No screens before bed"],
        recovery_key="sleep_late",
        discipline=0.56,
        consistency=0.43,
        mood_base=0.55,
        energy_base=0.38,
        nudge_response=0.62,
        weekend_drop=0.16,
        burnout_risk=0.18,
        relapse_risk=0.10,
    ),
    Persona(
        key="socially_distracted_student",
        email="persona_socially_distracted@example.com",
        goal="focus",
        time_commitment="20 min",
        best_time="Evening",
        habits=["25-min deep work", "No phone first 30 min", "Track your day", "Read 10 pages"],
        discipline=0.64,
        consistency=0.40,
        mood_base=0.62,
        energy_base=0.61,
        nudge_response=0.58,
        weekend_drop=0.20,
        burnout_risk=0.14,
    ),
    Persona(
        key="anxiety_prone_quitter",
        email="persona_anxiety_quitter@example.com",
        goal="mental",
        time_commitment="10 min",
        best_time="Morning",
        habits=["Breathing exercise", "Journal 5 min", "10-min walk", "Drink water"],
        recovery_key="smoking",
        discipline=0.52,
        consistency=0.38,
        mood_base=0.36,
        energy_base=0.44,
        nudge_response=0.76,
        weekend_drop=0.10,
        burnout_risk=0.26,
        relapse_risk=0.18,
    ),
    Persona(
        key="all_or_nothing_perfectionist",
        email="persona_perfectionist@example.com",
        goal="discipline",
        time_commitment="30 min",
        best_time="Morning",
        habits=["Finish 1 hard task", "Deep work block", "Track your day", "Read 10 pages"],
        discipline=0.84,
        consistency=0.36,
        mood_base=0.54,
        energy_base=0.63,
        nudge_response=0.40,
        weekend_drop=0.12,
        burnout_risk=0.32,
    ),
    Persona(
        key="hydration_only_beginner",
        email="persona_hydration_beginner@example.com",
        goal="energy",
        time_commitment="5 min",
        best_time="Morning",
        habits=["Drink water", "Morning sunlight", "Make your bed", "10-min walk"],
        discipline=0.50,
        consistency=0.60,
        mood_base=0.58,
        energy_base=0.57,
        nudge_response=0.72,
        weekend_drop=0.06,
        burnout_risk=0.08,
    ),
    Persona(
        key="relapse_recovery_rebound",
        email="persona_rebound@example.com",
        goal="mental",
        time_commitment="15 min",
        best_time="Morning",
        habits=["Breathing exercise", "Journal 5 min", "10-min walk", "Sleep on time"],
        recovery_key="smoking",
        discipline=0.66,
        consistency=0.54,
        mood_base=0.52,
        energy_base=0.56,
        nudge_response=0.82,
        weekend_drop=0.10,
        burnout_risk=0.14,
        relapse_risk=0.10,
    ),
]


def get_connection() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def ensure_db_exists() -> None:
    if not DB_PATH.exists():
        raise FileNotFoundError(
            f"Database not found at {DB_PATH}. Start your backend once so backend/habitify.db is created."
        )


def fake_password_hash(email: str) -> str:
    return hashlib.sha256(f"{email}:persona_seed".encode()).hexdigest()


def clamp(value: float, lo: float = 0.0, hi: float = 1.0) -> float:
    return max(lo, min(hi, value))


def choose_mood(score: float) -> str:
    if score >= 0.82:
        return "Great"
    if score >= 0.68:
        return "Good"
    if score >= 0.48:
        return "Medium"
    if score >= 0.30:
        return "Low"
    return "Bad"


def choose_energy(score: float) -> str:
    if score >= 0.78:
        return "High"
    if score >= 0.48:
        return "Medium"
    return "Low"


def create_or_get_user(cur: sqlite3.Cursor, persona: Persona) -> int:
    row = cur.execute("SELECT id FROM users WHERE email = ?", (persona.email,)).fetchone()
    if row:
        return row["id"]

    cur.execute(
        "INSERT INTO users (email, password_hash) VALUES (?, ?)",
        (persona.email, fake_password_hash(persona.email)),
    )
    return cur.lastrowid


def upsert_profile(cur: sqlite3.Cursor, user_id: int, persona: Persona) -> None:
    existing = cur.execute(
        "SELECT id FROM user_profiles WHERE user_id = ?",
        (user_id,),
    ).fetchone()

    if existing:
        cur.execute(
            """
            UPDATE user_profiles
            SET goal = ?, time_commitment = ?, best_time = ?, updated_at = CURRENT_TIMESTAMP
            WHERE user_id = ?
            """,
            (persona.goal, persona.time_commitment, persona.best_time, user_id),
        )
    else:
        cur.execute(
            """
            INSERT INTO user_profiles (user_id, goal, time_commitment, best_time)
            VALUES (?, ?, ?, ?)
            """,
            (user_id, persona.goal, persona.time_commitment, persona.best_time),
        )


def clear_existing_persona_data(cur: sqlite3.Cursor, user_id: int) -> None:
    cur.execute("DELETE FROM habit_logs WHERE user_id = ?", (user_id,))
    cur.execute("DELETE FROM daily_checkins WHERE user_id = ?", (user_id,))
    cur.execute("DELETE FROM recovery_events WHERE user_id = ?", (user_id,))
    cur.execute("DELETE FROM nudge_history WHERE user_id = ?", (user_id,))
    cur.execute("DELETE FROM scheduled_notifications WHERE user_id = ?", (user_id,))


def insert_habit_log(cur: sqlite3.Cursor, user_id: int, habit_name: str, progress: int, day_str: str) -> None:
    cur.execute(
        """
        INSERT OR REPLACE INTO habit_logs (id, user_id, name, progress, date)
        VALUES (?, ?, ?, ?, ?)
        """,
        (str(uuid.uuid4()), user_id, habit_name, progress, day_str),
    )


def insert_checkin(
    cur: sqlite3.Cursor,
    user_id: int,
    day_str: str,
    mood: str,
    energy: str,
    had_urges: bool,
    difficult: str,
    note: str,
    completed: bool,
) -> None:
    cur.execute(
        """
        INSERT OR REPLACE INTO daily_checkins
        (user_id, date, mood, energy, had_urges, difficult, note, completed, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
        """,
        (user_id, day_str, mood, energy, int(had_urges), difficult, note, int(completed)),
    )


def insert_recovery_event(
    cur: sqlite3.Cursor,
    user_id: int,
    habit_key: str,
    event_type: str,
    trigger: str,
    created_at: str,
) -> None:
    cur.execute(
        """
        INSERT INTO recovery_events (user_id, habit_key, event_type, trigger, created_at)
        VALUES (?, ?, ?, ?, ?)
        """,
        (user_id, habit_key, event_type, trigger, created_at),
    )


def insert_nudge(cur: sqlite3.Cursor, user_id: int, nudge_type: str, habit_name: str, shown_at: str) -> None:
    cur.execute(
        """
        INSERT INTO nudge_history (user_id, nudge_type, habit_name, shown_at)
        VALUES (?, ?, ?, ?)
        """,
        (user_id, nudge_type, habit_name, shown_at),
    )


def insert_notification(
    cur: sqlite3.Cursor,
    user_id: int,
    nudge_type: str,
    habit_name: str,
    title: str,
    message: str,
    action_path: str,
    scheduled_for: str,
    status: str,
) -> None:
    cur.execute(
        """
        INSERT INTO scheduled_notifications
        (user_id, nudge_type, habit_name, title, message, action_path, scheduled_for, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (user_id, nudge_type, habit_name, title, message, action_path, scheduled_for, status),
    )


def maybe_exam_pressure(persona: Persona, day_index: int, total_days: int) -> float:
    if not persona.exam_stress:
        return 0.0
    if day_index > total_days - 10:
        return 0.28
    if day_index > total_days - 20:
        return 0.18
    return 0.0


def simulate_persona(
    cur: sqlite3.Cursor,
    user_id: int,
    persona: Persona,
    total_days: int = 60,
    seed: int = 42,
) -> dict:
    rng = random.Random(f"{persona.key}:{seed}")

    start_day = date.today() - timedelta(days=total_days - 1)

    streak = {habit: 0 for habit in persona.habits}
    missed_last_two = {habit: 0 for habit in persona.habits}

    mood_level = persona.mood_base
    energy_level = persona.energy_base

    stats = {
        "habit_logs": 0,
        "checkins": 0,
        "recovery_events": 0,
        "nudges": 0,
        "notifications": 0,
    }

    for i in range(total_days):
        current_day = start_day + timedelta(days=i)
        day_str = current_day.isoformat()
        weekday = current_day.weekday()
        is_weekend = weekday >= 5
        exam_pressure = maybe_exam_pressure(persona, i, total_days)

        burnout_hit = 1.0 if rng.random() < persona.burnout_risk * (1.25 if is_weekend else 1.0) else 0.0

        mood_level = clamp(
            0.55 * mood_level
            + 0.20 * persona.mood_base
            + 0.10 * persona.consistency
            - 0.12 * exam_pressure
            - 0.15 * burnout_hit
            + rng.uniform(-0.08, 0.08)
        )

        energy_level = clamp(
            0.55 * energy_level
            + 0.22 * persona.energy_base
            + 0.10 * persona.discipline
            - 0.14 * exam_pressure
            - 0.12 * burnout_hit
            - (persona.weekend_drop if is_weekend else 0.0)
            + rng.uniform(-0.08, 0.08)
        )

        nudged_today = set()
        for habit in persona.habits:
            if missed_last_two[habit] >= 2 and rng.random() < 0.70:
                ts = f"{day_str} 08:{rng.randint(0,59):02d}:00"
                insert_nudge(cur, user_id, "core_missed_2days", habit, ts)
                stats["nudges"] += 1
                nudged_today.add(habit)

                if rng.random() < 0.45:
                    insert_notification(
                        cur,
                        user_id,
                        "core_missed_2days",
                        habit,
                        f"Friendly reminder: {habit}",
                        "A small step today can restart momentum.",
                        "/app/notifications",
                        ts.replace(" 08:", "T08:"),
                        "pending" if rng.random() < 0.70 else "dismissed",
                    )
                    stats["notifications"] += 1

        daily_completion_count = 0
        had_urges = False
        difficult_reason = ""

        for habit in persona.habits:
            habit_difficulty = 0.15 if "Drink water" in habit else 0.25
            if any(x in habit for x in ["Bodyweight workout", "25-min deep work", "Deep work block", "Finish 1 hard task"]):
                habit_difficulty = 0.42
            if any(x in habit for x in ["Sleep before 11:30 PM", "No screens before bed", "No caffeine after 5 PM"]):
                habit_difficulty = 0.50

            probability = (
                0.28
                + 0.26 * persona.discipline
                + 0.20 * persona.consistency
                + 0.12 * mood_level
                + 0.12 * energy_level
                - 0.24 * habit_difficulty
                - (persona.weekend_drop if is_weekend else 0.0)
                - 0.12 * exam_pressure
                + (0.18 * persona.nudge_response if habit in nudged_today else 0.0)
                + min(streak[habit], 10) * 0.012
                + rng.uniform(-0.10, 0.10)
            )
            probability = clamp(probability, 0.02, 0.98)

            success = rng.random() < probability

            if success:
                if probability > 0.82:
                    progress = rng.randint(82, 100)
                elif probability > 0.62:
                    progress = rng.randint(65, 90)
                else:
                    progress = rng.randint(45, 75)
                streak[habit] += 1
                missed_last_two[habit] = 0
                daily_completion_count += 1
            else:
                progress = rng.randint(0, 35)
                streak[habit] = 0
                missed_last_two[habit] += 1

            insert_habit_log(cur, user_id, habit, progress, day_str)
            stats["habit_logs"] += 1

        if persona.recovery_key:
            urge_prob = 0.18 + 0.20 * exam_pressure + 0.12 * burnout_hit + 0.10 * (1.0 - mood_level)
            if rng.random() < urge_prob:
                had_urges = True
                difficult_reason = "Managing cravings / self-control pressure"
                insert_recovery_event(
                    cur,
                    user_id,
                    persona.recovery_key,
                    "urge",
                    "stress" if exam_pressure > 0 else "routine trigger",
                    f"{day_str} {rng.randint(9,22):02d}:{rng.randint(0,59):02d}:00",
                )
                stats["recovery_events"] += 1

            relapse_prob = persona.relapse_risk + 0.08 * had_urges + 0.08 * burnout_hit + 0.08 * (1.0 - energy_level)
            if rng.random() < relapse_prob:
                insert_recovery_event(
                    cur,
                    user_id,
                    persona.recovery_key,
                    "relapse",
                    "stress spike" if exam_pressure > 0 else "late-night trigger",
                    f"{day_str} {rng.randint(18,23):02d}:{rng.randint(0,59):02d}:00",
                )
                stats["recovery_events"] += 1
                difficult_reason = "Relapse risk was high today"

        completed_day = daily_completion_count >= max(1, len(persona.habits) // 2)
        note = (
            "Strong day with steady progress."
            if completed_day and mood_level >= 0.65
            else "Mixed day, but still moving forward."
            if completed_day
            else "Rough day with lower consistency."
        )

        insert_checkin(
            cur,
            user_id,
            day_str,
            choose_mood(mood_level),
            choose_energy(energy_level),
            had_urges,
            difficult_reason,
            note,
            completed_day,
        )
        stats["checkins"] += 1

    return stats


def main() -> None:
    ensure_db_exists()

    conn = get_connection()
    cur = conn.cursor()

    total_users = 0
    total_logs = 0
    total_checkins = 0
    total_recovery = 0
    total_nudges = 0
    total_notifications = 0

    for persona in PERSONAS:
        user_id = create_or_get_user(cur, persona)
        upsert_profile(cur, user_id, persona)
        clear_existing_persona_data(cur, user_id)

        stats = simulate_persona(cur, user_id, persona, total_days=60, seed=42)

        total_users += 1
        total_logs += stats["habit_logs"]
        total_checkins += stats["checkins"]
        total_recovery += stats["recovery_events"]
        total_nudges += stats["nudges"]
        total_notifications += stats["notifications"]

    conn.commit()
    conn.close()

    print(f"Database: {DB_PATH}")
    print(f"Persona users generated: {total_users}")
    print(f"Habit logs inserted: {total_logs}")
    print(f"Check-ins inserted: {total_checkins}")
    print(f"Recovery events inserted: {total_recovery}")
    print(f"Nudges inserted: {total_nudges}")
    print(f"Notifications inserted: {total_notifications}")


if __name__ == "__main__":
    main()
