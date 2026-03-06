from datetime import datetime
from typing import List

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from api.deps import get_current_user
from api.nudges import compute_nudges
from db import get_connection

router = APIRouter(tags=["notifications"])


class NotificationOut(BaseModel):
    id: int
    nudge_type: str
    habit_name: str = ""
    title: str
    message: str
    action_path: str = ""
    scheduled_for: str
    status: str


class GenerateNotificationsOut(BaseModel):
    created: int
    skipped: int


def utc_now_iso() -> str:
    return datetime.utcnow().isoformat(timespec="seconds")


@router.post("/notifications/generate", response_model=GenerateNotificationsOut)
async def generate_notifications(current_user=Depends(get_current_user)):
    conn = get_connection()
    created = 0
    skipped = 0

    # Ignore nudge_history here; scheduled_notifications handles deduping
    nudges = compute_nudges(
        current_user["id"],
        mark_as_shown=False,
        respect_history=False,
    )

    for n in nudges:
        action_path = n.action.path if n.action else ""
        habit_name = ""

        if n.type == "core_missed_2days" and n.title.startswith("Friendly reminder: "):
            habit_name = n.title.replace("Friendly reminder: ", "", 1)
        elif n.type == "recommended_not_started":
            habit_name = n.message

        existing = conn.execute(
            """
            SELECT id
            FROM scheduled_notifications
            WHERE user_id = ?
              AND nudge_type = ?
              AND habit_name = ?
              AND status = 'pending'
            """,
            (current_user["id"], n.type, habit_name),
        ).fetchone()

        if existing:
            skipped += 1
            continue

        conn.execute(
            """
            INSERT INTO scheduled_notifications
            (
                user_id, nudge_type, habit_name, title, message,
                action_path, scheduled_for, status
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, 'pending')
            """,
            (
                current_user["id"],
                n.type,
                habit_name,
                n.title,
                n.message,
                action_path,
                utc_now_iso(),
            ),
        )
        created += 1

    conn.commit()
    conn.close()

    return GenerateNotificationsOut(created=created, skipped=skipped)


@router.get("/notifications/pending", response_model=List[NotificationOut])
async def get_pending_notifications(current_user=Depends(get_current_user)):
    conn = get_connection()
    rows = conn.execute(
        """
        SELECT id, nudge_type, habit_name, title, message, action_path, scheduled_for, status
        FROM scheduled_notifications
        WHERE user_id = ? AND status = 'pending'
        ORDER BY created_at DESC
        """,
        (current_user["id"],),
    ).fetchall()
    conn.close()

    return [
        NotificationOut(
            id=row["id"],
            nudge_type=row["nudge_type"],
            habit_name=row["habit_name"] or "",
            title=row["title"],
            message=row["message"],
            action_path=row["action_path"] or "",
            scheduled_for=row["scheduled_for"],
            status=row["status"],
        )
        for row in rows
    ]


@router.post("/notifications/{notification_id}/dismiss")
async def dismiss_notification(notification_id: int, current_user=Depends(get_current_user)):
    conn = get_connection()

    row = conn.execute(
        """
        SELECT id
        FROM scheduled_notifications
        WHERE id = ? AND user_id = ?
        """,
        (notification_id, current_user["id"]),
    ).fetchone()

    if not row:
        conn.close()
        raise HTTPException(status_code=404, detail="Notification not found")

    conn.execute(
        """
        UPDATE scheduled_notifications
        SET status = 'dismissed'
        WHERE id = ? AND user_id = ?
        """,
        (notification_id, current_user["id"]),
    )
    conn.commit()
    conn.close()

    return {"message": "Notification dismissed"}
