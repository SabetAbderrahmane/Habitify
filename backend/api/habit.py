from typing import List, Optional
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from api.deps import get_current_user
from db import get_connection

router = APIRouter(tags=["habits"])


class HabitCreate(BaseModel):
    name: str = Field(min_length=2, max_length=80)
    progress: int = Field(ge=0, le=100)
    date: str  # YYYY-MM-DD


class HabitUpdate(BaseModel):
    name: Optional[str] = Field(default=None, min_length=2, max_length=80)
    progress: Optional[int] = Field(default=None, ge=0, le=100)
    date: Optional[str] = None


class HabitOut(BaseModel):
    id: str
    name: str
    progress: int
    date: str


@router.get("/habits/", response_model=List[HabitOut])
async def get_habits(current_user=Depends(get_current_user)):
    conn = get_connection()
    rows = conn.execute(
        """
        SELECT id, name, progress, date
        FROM habit_logs
        WHERE user_id = ?
        ORDER BY date DESC, created_at DESC
        """,
        (current_user["id"],),
    ).fetchall()
    conn.close()

    return [
        HabitOut(
            id=row["id"],
            name=row["name"],
            progress=row["progress"],
            date=row["date"],
        )
        for row in rows
    ]


@router.get("/habits/names", response_model=List[str])
async def get_habit_names(current_user=Depends(get_current_user)):
    conn = get_connection()
    rows = conn.execute(
        """
        SELECT DISTINCT name
        FROM habit_logs
        WHERE user_id = ?
        ORDER BY name ASC
        """,
        (current_user["id"],),
    ).fetchall()
    conn.close()

    return [row["name"] for row in rows]


@router.post("/habits/", response_model=HabitOut)
async def add_habit(habit: HabitCreate, current_user=Depends(get_current_user)):
    conn = get_connection()

    existing = conn.execute(
        """
        SELECT id
        FROM habit_logs
        WHERE user_id = ? AND name = ? AND date = ?
        """,
        (current_user["id"], habit.name, habit.date),
    ).fetchone()

    if existing:
        conn.execute(
            """
            UPDATE habit_logs
            SET progress = ?
            WHERE id = ?
            """,
            (habit.progress, existing["id"]),
        )
        conn.commit()

        row = conn.execute(
            "SELECT id, name, progress, date FROM habit_logs WHERE id = ?",
            (existing["id"],),
        ).fetchone()
        conn.close()

        return HabitOut(
            id=row["id"],
            name=row["name"],
            progress=row["progress"],
            date=row["date"],
        )

    habit_id = str(uuid4())
    conn.execute(
        """
        INSERT INTO habit_logs (id, user_id, name, progress, date)
        VALUES (?, ?, ?, ?, ?)
        """,
        (habit_id, current_user["id"], habit.name, habit.progress, habit.date),
    )
    conn.commit()

    row = conn.execute(
        "SELECT id, name, progress, date FROM habit_logs WHERE id = ?",
        (habit_id,),
    ).fetchone()
    conn.close()

    return HabitOut(
        id=row["id"],
        name=row["name"],
        progress=row["progress"],
        date=row["date"],
    )


@router.patch("/habits/{habit_id}", response_model=HabitOut)
async def update_habit(habit_id: str, patch: HabitUpdate, current_user=Depends(get_current_user)):
    conn = get_connection()
    row = conn.execute(
        """
        SELECT id, name, progress, date
        FROM habit_logs
        WHERE id = ? AND user_id = ?
        """,
        (habit_id, current_user["id"]),
    ).fetchone()

    if not row:
        conn.close()
        raise HTTPException(status_code=404, detail="Habit not found")

    new_name = patch.name if patch.name is not None else row["name"]
    new_progress = patch.progress if patch.progress is not None else row["progress"]
    new_date = patch.date if patch.date is not None else row["date"]

    conn.execute(
        """
        UPDATE habit_logs
        SET name = ?, progress = ?, date = ?
        WHERE id = ? AND user_id = ?
        """,
        (new_name, new_progress, new_date, habit_id, current_user["id"]),
    )
    conn.commit()

    updated = conn.execute(
        """
        SELECT id, name, progress, date
        FROM habit_logs
        WHERE id = ? AND user_id = ?
        """,
        (habit_id, current_user["id"]),
    ).fetchone()
    conn.close()

    return HabitOut(
        id=updated["id"],
        name=updated["name"],
        progress=updated["progress"],
        date=updated["date"],
    )


@router.delete("/habits/{habit_id}")
async def delete_habit(habit_id: str, current_user=Depends(get_current_user)):
    conn = get_connection()
    row = conn.execute(
        """
        SELECT id
        FROM habit_logs
        WHERE id = ? AND user_id = ?
        """,
        (habit_id, current_user["id"]),
    ).fetchone()

    if not row:
        conn.close()
        raise HTTPException(status_code=404, detail="Habit not found")

    conn.execute(
        "DELETE FROM habit_logs WHERE id = ? AND user_id = ?",
        (habit_id, current_user["id"]),
    )
    conn.commit()
    conn.close()

    return {"message": "Deleted"}
