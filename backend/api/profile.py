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
