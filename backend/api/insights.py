from datetime import date, timedelta

from fastapi import APIRouter, Depends

from api.deps import get_current_user
from api.nudges import compute_nudges
from api.predictions import get_lapse_risk_predictions
from db import get_connection
from services.analytics import detect_best_log_time, detect_best_weekday, detect_weak_weekday

router = APIRouter(tags=["insights"])


MOOD_SCORE = {"Happy": 1.0, "Good": 0.8, "Neutral": 0.5, "Low": 0.3, "Sad": 0.1}
ENERGY_SCORE = {"High": 1.0, "Good": 0.7, "Moderate": 0.5, "Low": 0.3, "Drained": 0.1}


def _dump_model(model):
    if hasattr(model, "model_dump"):
        return model.model_dump()
    return model.dict()


def _average_score(rows, column: str, mapping: dict[str, float]):
    values = [mapping[row[column]] for row in rows if row[column] in mapping]
    if not values:
        return None
    return round(sum(values) / len(values), 4)


@router.get("/insights/wellness")
async def wellness_insights(current_user=Depends(get_current_user)):
    predictions = await get_lapse_risk_predictions(current_user)

    conn = get_connection()
    try:
        start_14d = (date.today() - timedelta(days=13)).isoformat()
        checkins = conn.execute(
            """
            SELECT date, mood, energy, had_urges, difficult, note, completed
            FROM daily_checkins
            WHERE user_id = ? AND date >= ?
            ORDER BY date ASC
            """,
            (current_user["id"], start_14d),
        ).fetchall()

        logs = conn.execute(
            """
            SELECT hl.*, h.name AS habit_name
            FROM habit_logs hl
            JOIN habits h ON hl.habit_id = h.id
            WHERE hl.user_id = ? AND hl.date >= ?
            ORDER BY hl.date ASC, hl.created_at ASC
            """,
            (current_user["id"], start_14d),
        ).fetchall()

        completed_logs = [row for row in logs if int(row["progress"] or 0) >= 100]
        nudges = compute_nudges(
            current_user["id"],
            mark_as_shown=False,
            respect_history=True,
        )

        return {
            "lapse_risk_predictions": [_dump_model(item) for item in predictions],
            "analytics_patterns": {
                "best_weekday": detect_best_weekday(logs),
                "weak_weekday": detect_weak_weekday(logs),
                "best_log_time": detect_best_log_time(logs),
            },
            "mood_energy": {
                "checkin_count": len(checkins),
                "average_mood_score": _average_score(checkins, "mood", MOOD_SCORE),
                "average_energy_score": _average_score(checkins, "energy", ENERGY_SCORE),
                "urge_days": sum(1 for row in checkins if bool(row["had_urges"])),
                "latest_checkin": {
                    "date": checkins[-1]["date"],
                    "mood": checkins[-1]["mood"] or "",
                    "energy": checkins[-1]["energy"] or "",
                    "had_urges": bool(checkins[-1]["had_urges"]),
                    "completed": bool(checkins[-1]["completed"]),
                } if checkins else None,
            },
            "nudges": [
                {
                    "id": nudge.id,
                    "type": nudge.type,
                    "title": nudge.title,
                    "message": nudge.message,
                    "priority": nudge.priority,
                    "action": _dump_model(nudge.action) if nudge.action else None,
                }
                for nudge in nudges
            ],
            "habit_logs": {
                "window_start": start_14d,
                "window_end": date.today().isoformat(),
                "total_logs": len(logs),
                "completed_logs": len(completed_logs),
                "completion_rate": round((len(completed_logs) / len(logs)) * 100.0, 2) if logs else 0.0,
            },
            "environmental_factor": None,
            "sleep_metrics": None,
        }
    finally:
        conn.close()
