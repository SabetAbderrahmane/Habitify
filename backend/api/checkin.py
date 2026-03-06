from fastapi import APIRouter, Depends
from pydantic import BaseModel

from api.deps import get_current_user
from db import get_connection

router = APIRouter(tags=["checkins"])


class CheckinIn(BaseModel):
    date: str
    mood: str = ""
    energy: str = ""
    had_urges: bool = False
    difficult: str = ""
    note: str = ""
    completed: bool = True


class CheckinOut(BaseModel):
    date: str
    mood: str = ""
    energy: str = ""
    had_urges: bool = False
    difficult: str = ""
    note: str = ""
    completed: bool = False


@router.get("/checkins/{date}", response_model=CheckinOut)
async def get_checkin(date: str, current_user=Depends(get_current_user)):
    conn = get_connection()
    row = conn.execute(
        """
        SELECT date, mood, energy, had_urges, difficult, note, completed
        FROM daily_checkins
        WHERE user_id = ? AND date = ?
        """,
        (current_user["id"], date),
    ).fetchone()
    conn.close()

    if not row:
        return CheckinOut(date=date)

    return CheckinOut(
        date=row["date"],
        mood=row["mood"] or "",
        energy=row["energy"] or "",
        had_urges=bool(row["had_urges"]),
        difficult=row["difficult"] or "",
        note=row["note"] or "",
        completed=bool(row["completed"]),
    )


@router.post("/checkins", response_model=CheckinOut)
async def save_checkin(payload: CheckinIn, current_user=Depends(get_current_user)):
    conn = get_connection()

    existing = conn.execute(
        """
        SELECT id
        FROM daily_checkins
        WHERE user_id = ? AND date = ?
        """,
        (current_user["id"], payload.date),
    ).fetchone()

    if existing:
        conn.execute(
            """
            UPDATE daily_checkins
            SET mood = ?, energy = ?, had_urges = ?, difficult = ?, note = ?, completed = ?, updated_at = CURRENT_TIMESTAMP
            WHERE user_id = ? AND date = ?
            """,
            (
                payload.mood,
                payload.energy,
                1 if payload.had_urges else 0,
                payload.difficult,
                payload.note,
                1 if payload.completed else 0,
                current_user["id"],
                payload.date,
            ),
        )
    else:
        conn.execute(
            """
            INSERT INTO daily_checkins (user_id, date, mood, energy, had_urges, difficult, note, completed)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                current_user["id"],
                payload.date,
                payload.mood,
                payload.energy,
                1 if payload.had_urges else 0,
                payload.difficult,
                payload.note,
                1 if payload.completed else 0,
            ),
        )

    conn.commit()

    row = conn.execute(
        """
        SELECT date, mood, energy, had_urges, difficult, note, completed
        FROM daily_checkins
        WHERE user_id = ? AND date = ?
        """,
        (current_user["id"], payload.date),
    ).fetchone()
    conn.close()

    return CheckinOut(
        date=row["date"],
        mood=row["mood"] or "",
        energy=row["energy"] or "",
        had_urges=bool(row["had_urges"]),
        difficult=row["difficult"] or "",
        note=row["note"] or "",
        completed=bool(row["completed"]),
    )
