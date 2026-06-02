#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import sqlite3
from pathlib import Path

TABLES = [
    "users",
    "habits",
    "habit_logs",
    "daily_checkins",
    "recovery_events",
    "recommended_packs",
    "recommended_habits",
    "core_habits",
    "user_profiles",
    "nudge_history",
    "scheduled_notifications",
    "prediction_history",
]


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--db", required=True, help="Path to SQLite DB, e.g. backend/habitify.db")
    args = parser.parse_args()

    db_path = Path(args.db)
    if not db_path.exists():
        raise SystemExit(f"Database not found: {db_path}")

    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")

    result = {"db": str(db_path), "tables": {}, "foreign_key_check": []}

    for table in TABLES:
        try:
            count = conn.execute(f"SELECT COUNT(*) AS c FROM {table}").fetchone()["c"]
            result["tables"][table] = count
        except sqlite3.OperationalError as exc:
            result["tables"][table] = f"MISSING: {exc}"

    fk_rows = conn.execute("PRAGMA foreign_key_check").fetchall()
    result["foreign_key_check"] = [dict(row) for row in fk_rows]
    conn.close()

    print(json.dumps(result, indent=2))
    if fk_rows:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
