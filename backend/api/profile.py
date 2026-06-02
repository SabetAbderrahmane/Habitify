from typing import Optional

from fastapi import APIRouter, Depends
from pydantic import BaseModel

from api.deps import get_current_user
from db import get_connection

router = APIRouter(tags=["profile"])


class OnboardingProfileIn(BaseModel):
    goal: str = "focus"
    time_commitment: str = "5 min"
    best_time: str = "Morning"


class OnboardingProfileOut(BaseModel):
    goal: str = "focus"
    time_commitment: str = "5 min"
    best_time: str = "Morning"


class ProfileOut(BaseModel):
    email: str
    goal: str = "focus"
    time_commitment: str = "5 min"
    best_time: str = "Morning"
    notification_preferences: Optional[dict] = None


class ProfilePatch(BaseModel):
    goal: Optional[str] = None
    time_commitment: Optional[str] = None
    best_time: Optional[str] = None


def _get_profile_row(conn, user_id: int):
    return conn.execute(
        """
        SELECT goal, time_commitment, best_time
        FROM user_profiles
        WHERE user_id = ?
        """,
        (user_id,),
    ).fetchone()


def _profile_out(current_user, row) -> ProfileOut:
    return ProfileOut(
        email=current_user["email"],
        goal=(row["goal"] if row else None) or "focus",
        time_commitment=(row["time_commitment"] if row else None) or "5 min",
        best_time=(row["best_time"] if row else None) or "Morning",
        notification_preferences=None,
    )


@router.get("/profile", response_model=ProfileOut)
async def get_profile(current_user=Depends(get_current_user)):
    conn = get_connection()
    row = _get_profile_row(conn, current_user["id"])
    conn.close()
    return _profile_out(current_user, row)


@router.patch("/profile", response_model=ProfileOut)
async def update_profile(payload: ProfilePatch, current_user=Depends(get_current_user)):
    conn = get_connection()
    row = _get_profile_row(conn, current_user["id"])

    goal = payload.goal if payload.goal is not None else ((row["goal"] if row else None) or "focus")
    time_commitment = (
        payload.time_commitment
        if payload.time_commitment is not None
        else ((row["time_commitment"] if row else None) or "5 min")
    )
    best_time = (
        payload.best_time
        if payload.best_time is not None
        else ((row["best_time"] if row else None) or "Morning")
    )

    if row:
        conn.execute(
            """
            UPDATE user_profiles
            SET goal = ?, time_commitment = ?, best_time = ?, updated_at = CURRENT_TIMESTAMP
            WHERE user_id = ?
            """,
            (goal, time_commitment, best_time, current_user["id"]),
        )
    else:
        conn.execute(
            """
            INSERT INTO user_profiles (user_id, goal, time_commitment, best_time)
            VALUES (?, ?, ?, ?)
            """,
            (current_user["id"], goal, time_commitment, best_time),
        )

    conn.commit()
    updated = _get_profile_row(conn, current_user["id"])
    conn.close()
    return _profile_out(current_user, updated)


@router.get("/profile/onboarding", response_model=OnboardingProfileOut)
async def get_onboarding_profile(current_user=Depends(get_current_user)):
    conn = get_connection()
    row = conn.execute(
        """
        SELECT goal, time_commitment, best_time
        FROM user_profiles
        WHERE user_id = ?
        """,
        (current_user["id"],),
    ).fetchone()
    conn.close()

    if not row:
        return OnboardingProfileOut()

    return OnboardingProfileOut(
        goal=row["goal"] or "focus",
        time_commitment=row["time_commitment"] or "5 min",
        best_time=row["best_time"] or "Morning",
    )


@router.post("/profile/onboarding", response_model=OnboardingProfileOut)
async def save_onboarding_profile(payload: OnboardingProfileIn, current_user=Depends(get_current_user)):
    conn = get_connection()

    existing = conn.execute(
        """
        SELECT id
        FROM user_profiles
        WHERE user_id = ?
        """,
        (current_user["id"],),
    ).fetchone()

    if existing:
        conn.execute(
            """
            UPDATE user_profiles
            SET goal = ?, time_commitment = ?, best_time = ?, updated_at = CURRENT_TIMESTAMP
            WHERE user_id = ?
            """,
            (
                payload.goal,
                payload.time_commitment,
                payload.best_time,
                current_user["id"],
            ),
        )
    else:
        conn.execute(
            """
            INSERT INTO user_profiles (user_id, goal, time_commitment, best_time)
            VALUES (?, ?, ?, ?)
            """,
            (
                current_user["id"],
                payload.goal,
                payload.time_commitment,
                payload.best_time,
            ),
        )

    conn.commit()

    row = conn.execute(
        """
        SELECT goal, time_commitment, best_time
        FROM user_profiles
        WHERE user_id = ?
        """,
        (current_user["id"],),
    ).fetchone()
    conn.close()

    return OnboardingProfileOut(
        goal=row["goal"],
        time_commitment=row["time_commitment"],
        best_time=row["best_time"],
    )
