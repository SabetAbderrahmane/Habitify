from datetime import datetime

from fastapi import APIRouter, Depends
from pydantic import BaseModel

from api.deps import get_current_user
from db import get_connection

router = APIRouter(tags=["recovery"])


class RecoveryEventIn(BaseModel):
    habit_key: str
    trigger: str = ""


class RecoveryStatsOut(BaseModel):
    relapseCount: int
    survivedCount: int
    strongestTrigger: str
    cleanStreak: int


@router.post("/recovery/relapse")
async def log_relapse(payload: RecoveryEventIn, current_user=Depends(get_current_user)):
    conn = get_connection()
    conn.execute(
        """
        INSERT INTO recovery_events (user_id, habit_key, event_type, trigger)
        VALUES (?, ?, ?, ?)
        """,
        (current_user["id"], payload.habit_key, "relapse", payload.trigger),
    )
    conn.commit()
    conn.close()
    return {"message": "Relapse logged"}


@router.post("/recovery/survived-urge")
async def log_survived_urge(payload: RecoveryEventIn, current_user=Depends(get_current_user)):
    conn = get_connection()
    conn.execute(
        """
        INSERT INTO recovery_events (user_id, habit_key, event_type, trigger)
        VALUES (?, ?, ?, ?)
        """,
        (current_user["id"], payload.habit_key, "survived_urge", payload.trigger),
    )
    conn.commit()
    conn.close()
    return {"message": "Urge survived logged"}


@router.get("/recovery/stats/{habit_key}", response_model=RecoveryStatsOut)
async def get_recovery_stats(habit_key: str, current_user=Depends(get_current_user)):
    conn = get_connection()

    relapse_count_row = conn.execute(
        """
        SELECT COUNT(*) AS count
        FROM recovery_events
        WHERE user_id = ? AND habit_key = ? AND event_type = 'relapse'
        """,
        (current_user["id"], habit_key),
    ).fetchone()

    survived_count_row = conn.execute(
        """
        SELECT COUNT(*) AS count
        FROM recovery_events
        WHERE user_id = ? AND habit_key = ? AND event_type = 'survived_urge'
        """,
        (current_user["id"], habit_key),
    ).fetchone()

    trigger_rows = conn.execute(
        """
        SELECT trigger, COUNT(*) AS count
        FROM recovery_events
        WHERE user_id = ? AND habit_key = ? AND trigger != ''
        GROUP BY trigger
        ORDER BY count DESC
        """,
        (current_user["id"], habit_key),
    ).fetchall()

    last_relapse_row = conn.execute(
        """
        SELECT created_at
        FROM recovery_events
        WHERE user_id = ? AND habit_key = ? AND event_type = 'relapse'
        ORDER BY created_at DESC
        LIMIT 1
        """,
        (current_user["id"], habit_key),
    ).fetchone()

    conn.close()

    relapse_count = relapse_count_row["count"] if relapse_count_row else 0
    survived_count = survived_count_row["count"] if survived_count_row else 0

    strongest_trigger = "—"
    if trigger_rows:
        strongest_trigger = trigger_rows[0]["trigger"]

    if last_relapse_row and last_relapse_row["created_at"]:
        last_relapse = datetime.fromisoformat(last_relapse_row["created_at"].replace("Z", ""))
        now = datetime.utcnow()
        clean_streak = max(0, (now - last_relapse).days)
    else:
        clean_streak = survived_count if survived_count > 0 else 0

    return RecoveryStatsOut(
        relapseCount=relapse_count,
        survivedCount=survived_count,
        strongestTrigger=strongest_trigger,
        cleanStreak=clean_streak,
    )
