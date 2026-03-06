import sqlite3
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent
DB_PATH = BASE_DIR / "habitify.db"


def get_connection() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db() -> None:
    conn = get_connection()
    cur = conn.cursor()

    cur.execute(
        """
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            email TEXT NOT NULL UNIQUE,
            password_hash TEXT NOT NULL,
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
        """
    )

    cur.execute(
        """
        CREATE TABLE IF NOT EXISTS habit_logs (
            id TEXT PRIMARY KEY,
            user_id INTEGER NOT NULL,
            name TEXT NOT NULL,
            progress INTEGER NOT NULL,
            date TEXT NOT NULL,
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(user_id, name, date),
            FOREIGN KEY (user_id) REFERENCES users(id)
        )
        """
    )
    cur.execute(
        """
        CREATE TABLE IF NOT EXISTS daily_checkins (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            date TEXT NOT NULL,
            mood TEXT DEFAULT '',
            energy TEXT DEFAULT '',
            had_urges INTEGER NOT NULL DEFAULT 0,
            difficult TEXT DEFAULT '',
            note TEXT DEFAULT '',
            completed INTEGER NOT NULL DEFAULT 0,
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(user_id, date),
            FOREIGN KEY (user_id) REFERENCES users(id)
        )
        """
    )
    cur.execute(
        """
        CREATE TABLE IF NOT EXISTS recovery_events (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            habit_key TEXT NOT NULL,
            event_type TEXT NOT NULL,
            trigger TEXT NOT NULL DEFAULT '',
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id)
        )
        """
    )
    cur.execute(
        """
        CREATE TABLE IF NOT EXISTS recommended_packs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            goal_key TEXT NOT NULL UNIQUE,
            title TEXT NOT NULL
        )
        """
    )

    cur.execute(
        """
        CREATE TABLE IF NOT EXISTS recommended_habits (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            pack_id INTEGER NOT NULL,
            name TEXT NOT NULL,
            description TEXT NOT NULL,
            difficulty TEXT NOT NULL,
            default_progress INTEGER NOT NULL DEFAULT 0,
            FOREIGN KEY (pack_id) REFERENCES recommended_packs(id)
        )
        """
    )

    cur.execute(
        """
        CREATE TABLE IF NOT EXISTS core_habits (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL UNIQUE,
            description TEXT NOT NULL,
            category TEXT NOT NULL,
            target TEXT NOT NULL,
            difficulty TEXT NOT NULL
        )
        """
    )
    cur.execute(
        """
        CREATE TABLE IF NOT EXISTS user_profiles (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL UNIQUE,
            goal TEXT NOT NULL DEFAULT 'focus',
            time_commitment TEXT NOT NULL DEFAULT '5 min',
            best_time TEXT NOT NULL DEFAULT 'Morning',
            updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id)
        )
        """
    )
    cur.execute(
        """
        CREATE TABLE IF NOT EXISTS nudge_history (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            nudge_type TEXT NOT NULL,
            habit_name TEXT DEFAULT '',
            shown_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id)
        )
        """
    )
    cur.execute(
        """
        CREATE TABLE IF NOT EXISTS scheduled_notifications (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            nudge_type TEXT NOT NULL,
            habit_name TEXT DEFAULT '',
            title TEXT NOT NULL,
            message TEXT NOT NULL,
            action_path TEXT DEFAULT '',
            scheduled_for TEXT NOT NULL,
            status TEXT NOT NULL DEFAULT 'pending',
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id)
        )
        """
    )



def seed_recommended_and_core_data() -> None:
    conn = get_connection()
    cur = conn.cursor()

    pack_count = cur.execute("SELECT COUNT(*) AS count FROM recommended_packs").fetchone()["count"]
    core_count = cur.execute("SELECT COUNT(*) AS count FROM core_habits").fetchone()["count"]

    if pack_count == 0:
        packs = {
            "focus": {
                "title": "Focus Pack",
                "habits": [
                    ("Read 10 pages", "Build concentration and learning momentum daily.", "Easy", 0),
                    ("25-min deep work", "A short focused work block without distractions.", "Medium", 0),
                    ("No phone first 30 min", "Protect your morning attention from instant distractions.", "Medium", 0),
                ],
            },
            "fitness": {
                "title": "Fitness Starter Pack",
                "habits": [
                    ("10-min walk", "Low-friction movement that is easy to sustain.", "Easy", 0),
                    ("Stretch 5 min", "Improve mobility and reduce stiffness.", "Easy", 0),
                    ("Bodyweight workout", "A short strength session to build consistency.", "Medium", 0),
                ],
            },
            "sleep": {
                "title": "Sleep Reset Pack",
                "habits": [
                    ("Sleep before 11:30 PM", "Anchor your sleep routine around a target bedtime.", "Medium", 0),
                    ("No screens before bed", "Reduce stimulation and make it easier to fall asleep.", "Medium", 0),
                    ("Prepare tomorrow plan", "Clear your mind before bed by planning tomorrow.", "Easy", 0),
                ],
            },
            "energy": {
                "title": "Energy Pack",
                "habits": [
                    ("Drink water", "A daily essential that supports mood and energy.", "Easy", 0),
                    ("Morning sunlight", "Get natural light early to support alertness.", "Easy", 0),
                    ("10-min walk", "A quick reset when your energy drops.", "Easy", 0),
                ],
            },
            "mental": {
                "title": "Mental Health Pack",
                "habits": [
                    ("Journal 5 min", "Clear mental clutter and reflect briefly.", "Easy", 0),
                    ("Breathing exercise", "Reduce stress with a short calming routine.", "Easy", 0),
                    ("Gratitude note", "Train attention toward positive moments.", "Easy", 0),
                ],
            },
            "discipline": {
                "title": "Discipline Pack",
                "habits": [
                    ("Make your bed", "Start the day with a quick win.", "Easy", 0),
                    ("Track your day", "Build awareness and accountability.", "Easy", 0),
                    ("Finish 1 hard task", "Train follow-through by completing one important thing.", "Medium", 0),
                ],
            },
        }

        for goal_key, pack in packs.items():
            cur.execute(
                "INSERT INTO recommended_packs (goal_key, title) VALUES (?, ?)",
                (goal_key, pack["title"]),
            )
            pack_id = cur.lastrowid

            for habit in pack["habits"]:
                cur.execute(
                    """
                    INSERT INTO recommended_habits (pack_id, name, description, difficulty, default_progress)
                    VALUES (?, ?, ?, ?, ?)
                    """,
                    (pack_id, habit[0], habit[1], habit[2], habit[3]),
                )

    if core_count == 0:
        core_habits = [
            ("Drink water", "A daily essential for energy, focus, and health.", "Health", "Daily", "Easy"),
            ("Sleep on time", "Protect your recovery by going to bed at a healthy time.", "Sleep", "Daily", "Medium"),
            ("Walk 10 minutes", "A low-friction movement habit that keeps momentum alive.", "Fitness", "Daily", "Easy"),
            ("Stretch 5 minutes", "Reduce stiffness and keep your body active.", "Mobility", "Daily", "Easy"),
            ("Take vitamins", "Stay consistent with your daily supplements or medicine routine.", "Health", "Daily", "Easy"),
        ]

        for habit in core_habits:
            cur.execute(
                """
                INSERT INTO core_habits (name, description, category, target, difficulty)
                VALUES (?, ?, ?, ?, ?)
                """,
                habit,
            )
    conn.commit()
    conn.close()
