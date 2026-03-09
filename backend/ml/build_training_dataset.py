import csv
import sqlite3
from collections import defaultdict
from dataclasses import dataclass
from datetime import datetime, timedelta
from pathlib import Path


DB_PATH = Path(__file__).resolve().parents[1] / "habitify.db"
OUTPUT_CSV = Path(__file__).resolve().parent / "persona_training_dataset.csv"


@dataclass
class DayState:
    date: str
    habits: dict
    checkin: dict | None
    recovery_events: list
    nudges: list


def get_connection() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def safe_float(value, default=0.0) -> float:
    try:
        return float(value)
    except (TypeError, ValueError):
        return default


def date_range(start_date: datetime, end_date: datetime):
    current = start_date
    while current <= end_date:
        yield current
        current += timedelta(days=1)


def mood_to_score(mood: str | None) -> float:
    mapping = {
        "Bad": 0.10,
        "Low": 0.30,
        "Medium": 0.55,
        "Good": 0.80,
        "Great": 1.00,
    }
    return mapping.get((mood or "").strip(), 0.50)


def energy_to_score(energy: str | None) -> float:
    mapping = {
        "Low": 0.20,
        "Medium": 0.60,
        "High": 1.00,
    }
    return mapping.get((energy or "").strip(), 0.50)


def fetch_all_data(conn: sqlite3.Connection):
    users = conn.execute("SELECT id, email FROM users ORDER BY id ASC").fetchall()
    profiles = conn.execute("SELECT * FROM user_profiles").fetchall()
    habit_logs = conn.execute("SELECT * FROM habit_logs ORDER BY date ASC").fetchall()
    checkins = conn.execute("SELECT * FROM daily_checkins ORDER BY date ASC").fetchall()
    recovery_events = conn.execute("SELECT * FROM recovery_events ORDER BY created_at ASC").fetchall()
    nudges = conn.execute("SELECT * FROM nudge_history ORDER BY shown_at ASC").fetchall()
    return users, profiles, habit_logs, checkins, recovery_events, nudges


def build_lookup_maps(users, profiles, habit_logs, checkins, recovery_events, nudges):
    profile_by_user = {row["user_id"]: dict(row) for row in profiles}

    habits_by_user_date = defaultdict(list)
    for row in habit_logs:
        habits_by_user_date[(row["user_id"], row["date"])].append(dict(row))

    checkin_by_user_date = {}
    for row in checkins:
        checkin_by_user_date[(row["user_id"], row["date"])] = dict(row)

    recovery_by_user_date = defaultdict(list)
    for row in recovery_events:
        created_at = row["created_at"] or ""
        event_date = created_at[:10]
        recovery_by_user_date[(row["user_id"], event_date)].append(dict(row))

    nudges_by_user_date = defaultdict(list)
    for row in nudges:
        shown_at = row["shown_at"] or ""
        shown_date = shown_at[:10]
        nudges_by_user_date[(row["user_id"], shown_date)].append(dict(row))

    return (
        profile_by_user,
        habits_by_user_date,
        checkin_by_user_date,
        recovery_by_user_date,
        nudges_by_user_date,
    )


def normalize_best_time(value: str | None) -> float:
    mapping = {
        "Morning": 0.20,
        "Afternoon": 0.50,
        "Evening": 0.75,
        "Night": 0.95,
    }
    return mapping.get((value or "").strip(), 0.50)


def normalize_time_commitment(value: str | None) -> float:
    text = (value or "").lower()
    if "5" in text:
        return 0.15
    if "10" in text:
        return 0.25
    if "15" in text:
        return 0.35
    if "20" in text:
        return 0.45
    if "25" in text:
        return 0.55
    if "30" in text:
        return 0.65
    if "45" in text:
        return 0.85
    return 0.50


def normalize_goal(value: str | None) -> float:
    mapping = {
        "focus": 0.20,
        "discipline": 0.40,
        "energy": 0.60,
        "fitness": 0.75,
        "sleep": 0.85,
        "mental": 1.00,
    }
    return mapping.get((value or "").strip().lower(), 0.50)


def build_day_state(
    user_id: int,
    day_str: str,
    habits_by_user_date,
    checkin_by_user_date,
    recovery_by_user_date,
    nudges_by_user_date,
) -> DayState:
    habits = habits_by_user_date.get((user_id, day_str), [])
    habits_map = {row["name"]: row for row in habits}
    checkin = checkin_by_user_date.get((user_id, day_str))
    recovery = recovery_by_user_date.get((user_id, day_str), [])
    nudges = nudges_by_user_date.get((user_id, day_str), [])

    return DayState(
        date=day_str,
        habits=habits_map,
        checkin=checkin,
        recovery_events=recovery,
        nudges=nudges,
    )


def habit_progress_for_day(state: DayState, habit_name: str) -> float:
    row = state.habits.get(habit_name)
    if not row:
        return 0.0
    return safe_float(row.get("progress", 0.0), 0.0) / 100.0


def habit_completed_for_day(state: DayState, habit_name: str, threshold: int = 80) -> int:
    row = state.habits.get(habit_name)
    if not row:
        return 0
    return 1 if safe_float(row.get("progress", 0.0), 0.0) >= threshold else 0


def count_recovery_events(state: DayState, event_type: str | None = None) -> int:
    if event_type is None:
        return len(state.recovery_events)
    return sum(1 for row in state.recovery_events if (row.get("event_type") or "") == event_type)


def count_nudges_for_habit(state: DayState, habit_name: str) -> int:
    return sum(1 for row in state.nudges if (row.get("habit_name") or "") == habit_name)


def rolling_mean(values: list[float]) -> float:
    if not values:
        return 0.0
    return sum(values) / len(values)


def rolling_std(values: list[float]) -> float:
    if not values:
        return 0.0
    mean = rolling_mean(values)
    variance = sum((v - mean) ** 2 for v in values) / len(values)
    return variance ** 0.5


def streak_until(states: list[DayState], habit_name: str, threshold: int = 80) -> float:
    count = 0
    for state in reversed(states):
        if habit_completed_for_day(state, habit_name, threshold=threshold):
            count += 1
        else:
            break
    return min(count, 30) / 30.0


def build_rows():
    conn = get_connection()
    users, profiles, habit_logs, checkins, recovery_events, nudges = fetch_all_data(conn)
    (
        profile_by_user,
        habits_by_user_date,
        checkin_by_user_date,
        recovery_by_user_date,
        nudges_by_user_date,
    ) = build_lookup_maps(users, profiles, habit_logs, checkins, recovery_events, nudges)

    all_rows = []

    for user in users:
        user_id = user["id"]
        profile = profile_by_user.get(user_id, {})

        user_habit_rows = [row for row in habit_logs if row["user_id"] == user_id]
        if not user_habit_rows:
            continue

        user_dates = sorted({row["date"] for row in user_habit_rows})
        start_dt = datetime.strptime(user_dates[0], "%Y-%m-%d")
        end_dt = datetime.strptime(user_dates[-1], "%Y-%m-%d")

        daily_states = {}
        for dt in date_range(start_dt, end_dt):
            day_str = dt.strftime("%Y-%m-%d")
            daily_states[day_str] = build_day_state(
                user_id,
                day_str,
                habits_by_user_date,
                checkin_by_user_date,
                recovery_by_user_date,
                nudges_by_user_date,
            )

        habit_names = sorted({row["name"] for row in user_habit_rows})

        for habit_name in habit_names:
            for current_dt in date_range(start_dt + timedelta(days=14), end_dt - timedelta(days=1)):
                current_day = current_dt.strftime("%Y-%m-%d")
                next_day = (current_dt + timedelta(days=1)).strftime("%Y-%m-%d")

                history_days = [
                    (current_dt - timedelta(days=offset)).strftime("%Y-%m-%d")
                    for offset in range(13, -1, -1)
                ]
                history_states = [daily_states[d] for d in history_days]

                seq_values = [habit_progress_for_day(state, habit_name) for state in history_states]

                current_state = daily_states[current_day]
                next_state = daily_states[next_day]

                mood_score = mood_to_score(current_state.checkin["mood"] if current_state.checkin else None)
                energy_score = energy_to_score(current_state.checkin["energy"] if current_state.checkin else None)
                had_urges = 1.0 if current_state.checkin and current_state.checkin.get("had_urges") else 0.0
                checkin_completed = 1.0 if current_state.checkin and current_state.checkin.get("completed") else 0.0

                row = {
                    "user_id": user_id,
                    "email": user["email"],
                    "date": current_day,
                    "habit_name": habit_name,

                    # profile features
                    "goal_score": normalize_goal(profile.get("goal")),
                    "time_commitment_score": normalize_time_commitment(profile.get("time_commitment")),
                    "best_time_score": normalize_best_time(profile.get("best_time")),

                    # tabular features
                    "recent_progress_mean": rolling_mean(seq_values),
                    "recent_progress_std": rolling_std(seq_values),
                    "streak_strength": streak_until(history_states, habit_name),
                    "miss_rate_14d": 1.0 - (sum(1 for v in seq_values if v >= 0.80) / len(seq_values)),
                    "mood_proxy": mood_score,
                    "energy_proxy": energy_score,
                    "had_urges": had_urges,
                    "checkin_completed": checkin_completed,
                    "nudge_count_today": float(count_nudges_for_habit(current_state, habit_name)),
                    "recovery_events_today": float(count_recovery_events(current_state)),
                    "recovery_relapse_today": float(count_recovery_events(current_state, "relapse")),
                    "recovery_urge_today": float(count_recovery_events(current_state, "urge")),
                    "weekday_norm": current_dt.weekday() / 6.0,
                    "weekend_effect": 1.0 if current_dt.weekday() >= 5 else 0.0,

                    # target
                    "target_completed_next_day": float(habit_completed_for_day(next_state, habit_name)),
                }

                for i, value in enumerate(seq_values, start=1):
                    row[f"seq_day_{i}"] = value

                all_rows.append(row)

    conn.close()
    return all_rows


def write_csv(rows, output_path: Path):
    if not rows:
        raise ValueError("No training rows were generated.")

    fieldnames = list(rows[0].keys())
    with output_path.open("w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)


def main():
    if not DB_PATH.exists():
        raise FileNotFoundError(f"Database not found at {DB_PATH}")

    rows = build_rows()
    write_csv(rows, OUTPUT_CSV)

    print(f"Database: {DB_PATH}")
    print(f"Output CSV: {OUTPUT_CSV}")
    print(f"Training rows generated: {len(rows)}")
    print("Features included:")
    print("- 14-day sequence history")
    print("- profile features")
    print("- mood / energy / urges")
    print("- nudge and recovery signals")
    print("- next-day completion label")


if __name__ == "__main__":
    main()
