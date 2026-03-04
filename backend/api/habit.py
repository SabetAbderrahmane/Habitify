from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import List, Optional
from uuid import uuid4

router = APIRouter(tags=["habits"])

class HabitCreate(BaseModel):
    name: str = Field(min_length=2, max_length=80)
    progress: int = Field(ge=0, le=100)
    date: str  # YYYY-MM-DD

class HabitUpdate(BaseModel):
    name: Optional[str] = Field(default=None, min_length=2, max_length=80)
    progress: Optional[int] = Field(default=None, ge=0, le=100)
    date: Optional[str] = None  # YYYY-MM-DD

class HabitOut(BaseModel):
    id: str
    name: str
    progress: int
    date: str

# In-memory storage (we'll move to SQLite later)
habit_db: List[HabitOut] = []

@router.get("/habits/", response_model=List[HabitOut])
async def get_habits():
    # newest first
    return list(reversed(habit_db))

@router.get("/habits/names", response_model=List[str])
async def get_habit_names():
    # unique names, alphabetical
    names = sorted({h.name for h in habit_db})
    return names

@router.post("/habits/", response_model=HabitOut)
async def add_habit(habit: HabitCreate):
    # If same name+date exists -> update progress instead of creating new row
    for i, h in enumerate(habit_db):
        if h.name == habit.name and h.date == habit.date:
            updated = HabitOut(id=h.id, name=h.name, progress=habit.progress, date=h.date)
            habit_db[i] = updated
            return updated

    new_habit = HabitOut(id=str(uuid4()), name=habit.name, progress=habit.progress, date=habit.date)
    habit_db.append(new_habit)
    return new_habit

@router.patch("/habits/{habit_id}", response_model=HabitOut)
async def update_habit(habit_id: str, patch: HabitUpdate):
    for i, h in enumerate(habit_db):
        if h.id == habit_id:
            new_name = patch.name if patch.name is not None else h.name
            new_progress = patch.progress if patch.progress is not None else h.progress
            new_date = patch.date if patch.date is not None else h.date

            updated = HabitOut(id=h.id, name=new_name, progress=new_progress, date=new_date)
            habit_db[i] = updated
            return updated

    raise HTTPException(status_code=404, detail="Habit not found")

@router.delete("/habits/{habit_id}")
async def delete_habit(habit_id: str):
    for i, h in enumerate(habit_db):
        if h.id == habit_id:
            habit_db.pop(i)
            return {"message": "Deleted"}
    raise HTTPException(status_code=404, detail="Habit not found")
