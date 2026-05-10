from enum import Enum
from typing import List, Optional
from uuid import uuid4
from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field

from api.deps import get_current_user
from db import get_connection

router = APIRouter(tags=["habits"])


# --- Habit Definition Models ---

class HabitCategory(str, Enum):
    HEALTH = "Health"
    PRODUCTIVITY = "Productivity"
    MINDFULNESS = "Mindfulness"
    RELATIONSHIPS = "Relationships"
    OTHER = "Other"


class HabitFrequency(str, Enum):
    DAILY = "daily"
    WEEKLY = "weekly"


class HabitCreate(BaseModel):
    name: str = Field(..., min_length=2)
    category: HabitCategory = HabitCategory.OTHER
    target: str = "Daily"
    frequency: HabitFrequency = HabitFrequency.DAILY


class HabitUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=2, max_length=80)
    category: Optional[str] = None
    target: Optional[str] = None
    frequency: Optional[str] = None
    archived: Optional[bool] = None


class HabitOut(BaseModel):
    id: str
    user_id: int
    name: str
    category: str
    target: str
    frequency: str
    archived: bool
    created_at: str


# --- Habit Log Models ---

class HabitLogCreate(BaseModel):
    habit_id: str
    progress: int = Field(..., ge=0, le=100)
    date: date


class HabitLogUpdate(BaseModel):
    progress: int = Field(..., ge=0, le=100)


class HabitLogOut(BaseModel):
    id: str
    habit_id: str
    user_id: int
    progress: int
    date: str
    name: Optional[str] = None # Helper for frontend


# --- Habit Definition Routes ---

@router.get("/habits/", response_model=List[HabitOut])
async def get_habit_definitions(
    include_archived: bool = False,
    current_user=Depends(get_current_user)
):
    conn = get_connection()
    query = "SELECT * FROM habits WHERE user_id = ?"
    params = [current_user["id"]]
    
    if not include_archived:
        query += " AND archived = 0"
    
    rows = conn.execute(query, params).fetchall()
    conn.close()

    return [
        HabitOut(
            id=row["id"],
            user_id=row["user_id"],
            name=row["name"],
            category=row["category"],
            target=row["target"],
            frequency=row["frequency"],
            archived=bool(row["archived"]),
            created_at=row["created_at"]
        )
        for row in rows
    ]


@router.post("/habits/", response_model=HabitOut)
async def create_habit_definition(habit: HabitCreate, current_user=Depends(get_current_user)):
    conn = get_connection()
    
    # Check if duplicate name for user
    existing = conn.execute(
        "SELECT id FROM habits WHERE user_id = ? AND name = ?",
        (current_user["id"], habit.name)
    ).fetchone()
    
    if existing:
        conn.close()
        raise HTTPException(status_code=400, detail="Habit with this name already exists")

    habit_id = str(uuid4())
    conn.execute(
        """
        INSERT INTO habits (id, user_id, name, category, target, frequency)
        VALUES (?, ?, ?, ?, ?, ?)
        """,
        (habit_id, current_user["id"], habit.name, habit.category, habit.target, habit.frequency)
    )
    conn.commit()
    
    row = conn.execute("SELECT * FROM habits WHERE id = ?", (habit_id,)).fetchone()
    conn.close()

    return HabitOut(
        id=row["id"],
        user_id=row["user_id"],
        name=row["name"],
        category=row["category"],
        target=row["target"],
        frequency=row["frequency"],
        archived=bool(row["archived"]),
        created_at=row["created_at"]
    )


@router.patch("/habits/{habit_id}", response_model=HabitOut)
async def update_habit_definition(habit_id: str, patch: HabitUpdate, current_user=Depends(get_current_user)):
    conn = get_connection()
    row = conn.execute(
        "SELECT * FROM habits WHERE id = ? AND user_id = ?",
        (habit_id, current_user["id"])
    ).fetchone()

    if not row:
        conn.close()
        raise HTTPException(status_code=404, detail="Habit not found")

    new_name = patch.name if patch.name is not None else row["name"]
    new_category = patch.category if patch.category is not None else row["category"]
    new_target = patch.target if patch.target is not None else row["target"]
    new_frequency = patch.frequency if patch.frequency is not None else row["frequency"]
    new_archived = int(patch.archived) if patch.archived is not None else row["archived"]

    conn.execute(
        """
        UPDATE habits
        SET name = ?, category = ?, target = ?, frequency = ?, archived = ?
        WHERE id = ?
        """,
        (new_name, new_category, new_target, new_frequency, new_archived, habit_id)
    )
    conn.commit()
    
    updated = conn.execute("SELECT * FROM habits WHERE id = ?", (habit_id,)).fetchone()
    conn.close()

    return HabitOut(
        id=updated["id"],
        user_id=updated["user_id"],
        name=updated["name"],
        category=updated["category"],
        target=updated["target"],
        frequency=updated["frequency"],
        archived=bool(updated["archived"]),
        created_at=updated["created_at"]
    )


@router.delete("/habits/{habit_id}")
async def delete_habit_definition(habit_id: str, current_user=Depends(get_current_user)):
    conn = get_connection()
    # Check ownership
    existing = conn.execute(
        "SELECT id FROM habits WHERE id = ? AND user_id = ?",
        (habit_id, current_user["id"])
    ).fetchone()
    
    if not existing:
        conn.close()
        raise HTTPException(status_code=404, detail="Habit not found")
        
    conn.execute("DELETE FROM habits WHERE id = ?", (habit_id,))
    conn.commit()
    conn.close()
    return {"message": "Habit and its logs deleted"}


# --- Habit Log Routes ---

@router.get("/habits/logs", response_model=List[HabitLogOut])
async def get_habit_logs(
    date: Optional[date] = None,
    habit_id: Optional[str] = None,
    current_user=Depends(get_current_user)
):
    conn = get_connection()
    query = """
        SELECT hl.*, h.name 
        FROM habit_logs hl
        JOIN habits h ON hl.habit_id = h.id
        WHERE hl.user_id = ?
    """
    params = [current_user["id"]]
    
    if date:
        query += " AND hl.date = ?"
        params.append(str(date))
        
    if habit_id:
        query += " AND hl.habit_id = ?"
        params.append(habit_id)
        
    query += " ORDER BY hl.date DESC, hl.created_at DESC"
    
    rows = conn.execute(query, params).fetchall()
    conn.close()

    return [
        HabitLogOut(
            id=row["id"],
            habit_id=row["habit_id"],
            user_id=row["user_id"],
            progress=row["progress"],
            date=row["date"],
            name=row["name"]
        )
        for row in rows
    ]


@router.post("/habits/logs", response_model=HabitLogOut)
async def log_habit_progress(log: HabitLogCreate, current_user=Depends(get_current_user)):
    conn = get_connection()
    
    # Verify habit ownership
    habit = conn.execute(
        "SELECT id, name FROM habits WHERE id = ? AND user_id = ?",
        (log.habit_id, current_user["id"])
    ).fetchone()
    
    if not habit:
        conn.close()
        raise HTTPException(status_code=404, detail="Habit definition not found")

    date_str = str(log.date)
    
    # Upsert logic
    existing = conn.execute(
        "SELECT id FROM habit_logs WHERE user_id = ? AND habit_id = ? AND date = ?",
        (current_user["id"], log.habit_id, date_str)
    ).fetchone()
    
    if existing:
        conn.execute(
            "UPDATE habit_logs SET progress = ? WHERE id = ?",
            (log.progress, existing["id"])
        )
        log_id = existing["id"]
    else:
        log_id = str(uuid4())
        conn.execute(
            """
            INSERT INTO habit_logs (id, habit_id, user_id, progress, date)
            VALUES (?, ?, ?, ?, ?)
            """,
            (log_id, log.habit_id, current_user["id"], log.progress, date_str)
        )
    
    conn.commit()
    
    row = conn.execute(
        "SELECT hl.*, h.name FROM habit_logs hl JOIN habits h ON hl.habit_id = h.id WHERE hl.id = ?",
        (log_id,)
    ).fetchone()
    conn.close()

    return HabitLogOut(
        id=row["id"],
        habit_id=row["habit_id"],
        user_id=row["user_id"],
        progress=row["progress"],
        date=row["date"],
        name=row["name"]
    )


@router.delete("/habits/logs/{log_id}")
async def delete_habit_log(log_id: str, current_user=Depends(get_current_user)):
    conn = get_connection()
    # Check ownership
    existing = conn.execute(
        "SELECT id FROM habit_logs WHERE id = ? AND user_id = ?",
        (log_id, current_user["id"])
    ).fetchone()
    
    if not existing:
        conn.close()
        raise HTTPException(status_code=404, detail="Log not found")
        
    conn.execute("DELETE FROM habit_logs WHERE id = ?", (log_id,))
    conn.commit()
    conn.close()
    return {"message": "Log deleted"}


# Compatibility route for existing frontend calls if necessary
# The frontend currently calls GET /habits/ to get all logs.
# We'll keep a temporary compatible route or update the frontend now.
# Given Task 2.3 specifically covers both, I'll update the frontend next.
