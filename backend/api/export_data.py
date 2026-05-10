import json
from datetime import datetime
from fastapi import APIRouter, Depends
from fastapi.responses import Response

from api.deps import get_current_user
from db import get_connection

router = APIRouter(tags=["export"])


def fetch_all_user_data(user_id: int):
    conn = get_connection()

    user = conn.execute(
        """
        SELECT id, email, created_at
        FROM users
        WHERE id = ?
        """,
        (user_id,),
    ).fetchone()

    profile = conn.execute(
        """
        SELECT user_id, goal, time_commitment, best_time, updated_at
        FROM user_profiles
        WHERE user_id = ?
        """,
        (user_id,),
    ).fetchone()

    habit_logs = conn.execute(
        """
        SELECT
            hl.id,
            hl.user_id,
            hl.habit_id,
            h.name,
            hl.progress,
            hl.date,
            hl.created_at
        FROM habit_logs hl
        JOIN habits h ON hl.habit_id = h.id
        WHERE hl.user_id = ?
        ORDER BY hl.date ASC, h.name ASC
        """,
        (user_id,),
    ).fetchall()

    daily_checkins = conn.execute(
        """
        SELECT id, user_id, date, mood, energy, had_urges, difficult, note, completed, created_at, updated_at
        FROM daily_checkins
        WHERE user_id = ?
        ORDER BY date ASC
        """,
        (user_id,),
    ).fetchall()

    recovery_events = conn.execute(
        """
        SELECT id, user_id, habit_key, event_type, trigger, created_at
        FROM recovery_events
        WHERE user_id = ?
        ORDER BY created_at ASC
        """,
        (user_id,),
    ).fetchall()

    nudge_history = conn.execute(
        """
        SELECT id, user_id, nudge_type, habit_name, shown_at
        FROM nudge_history
        WHERE user_id = ?
        ORDER BY shown_at ASC
        """,
        (user_id,),
    ).fetchall()

    scheduled_notifications = conn.execute(
        """
        SELECT id, user_id, nudge_type, habit_name, title, message, action_path, scheduled_for, status, created_at
        FROM scheduled_notifications
        WHERE user_id = ?
        ORDER BY created_at ASC
        """,
        (user_id,),
    ).fetchall()

    conn.close()

    return {
        "user": dict(user) if user else None,
        "profile": dict(profile) if profile else None,
        "habit_logs": [dict(row) for row in habit_logs],
        "daily_checkins": [dict(row) for row in daily_checkins],
        "recovery_events": [dict(row) for row in recovery_events],
        "nudge_history": [dict(row) for row in nudge_history],
        "scheduled_notifications": [dict(row) for row in scheduled_notifications],
    }


@router.get("/export/data")
async def export_user_data(current_user=Depends(get_current_user)):
    payload = {
        "exported_at": datetime.utcnow().isoformat(timespec="seconds") + "Z",
        "format_version": 1,
        "source": "Habitify local export",
        "data": fetch_all_user_data(current_user["id"]),
    }

    safe_email = current_user["email"].replace("@", "_at_").replace(".", "_")
    filename = f"habitify_export_{safe_email}.json"

    return Response(
        content=json.dumps(payload, ensure_ascii=False, indent=2),
        media_type="application/json",
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"'
        },
    )
