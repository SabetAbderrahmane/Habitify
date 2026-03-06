from typing import List

from fastapi import APIRouter
from pydantic import BaseModel

from db import get_connection

router = APIRouter(tags=["content"])


class GoalOut(BaseModel):
    key: str
    title: str


class RecommendedHabitOut(BaseModel):
    name: str
    description: str
    difficulty: str
    defaultProgress: int


class RecommendedPackOut(BaseModel):
    goal: str
    title: str
    habits: List[RecommendedHabitOut]


class CoreHabitOut(BaseModel):
    name: str
    description: str
    category: str
    target: str
    difficulty: str


@router.get("/recommended/goals", response_model=List[GoalOut])
async def get_recommended_goals():
    conn = get_connection()
    rows = conn.execute(
        """
        SELECT goal_key, title
        FROM recommended_packs
        ORDER BY goal_key ASC
        """
    ).fetchall()
    conn.close()

    return [GoalOut(key=row["goal_key"], title=row["title"]) for row in rows]


@router.get("/recommended/packs/{goal_key}", response_model=RecommendedPackOut)
async def get_recommended_pack(goal_key: str):
    conn = get_connection()

    pack = conn.execute(
        """
        SELECT id, goal_key, title
        FROM recommended_packs
        WHERE goal_key = ?
        """,
        (goal_key,),
    ).fetchone()

    if not pack:
        conn.close()
        return RecommendedPackOut(goal=goal_key, title="Unknown Pack", habits=[])

    habits = conn.execute(
        """
        SELECT name, description, difficulty, default_progress
        FROM recommended_habits
        WHERE pack_id = ?
        ORDER BY id ASC
        """,
        (pack["id"],),
    ).fetchall()
    conn.close()

    return RecommendedPackOut(
        goal=pack["goal_key"],
        title=pack["title"],
        habits=[
            RecommendedHabitOut(
                name=row["name"],
                description=row["description"],
                difficulty=row["difficulty"],
                defaultProgress=row["default_progress"],
            )
            for row in habits
        ],
    )


@router.get("/core-habits", response_model=List[CoreHabitOut])
async def get_core_habits():
    conn = get_connection()
    rows = conn.execute(
        """
        SELECT name, description, category, target, difficulty
        FROM core_habits
        ORDER BY id ASC
        """
    ).fetchall()
    conn.close()

    return [
        CoreHabitOut(
            name=row["name"],
            description=row["description"],
            category=row["category"],
            target=row["target"],
            difficulty=row["difficulty"],
        )
        for row in rows
    ]
