from datetime import date, datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException

from api.deps import get_current_user
from db import get_connection
from services.analytics import (
    calculate_30_day_trend,
    calculate_best_streak,
    calculate_completion_rate,
    calculate_current_streak,
    calculate_habit_heatmap,
    calculate_today_completion,
    calculate_weekly_progress,
    calculate_sleep_completion_correlation,
    calculate_weather_completion_correlation,
    detect_best_log_time,
    detect_best_weekday,
    detect_weak_weekday,
)

router = APIRouter(tags=["analytics"])


def _parse_date(value):
    if not value:
        return None
    try:
        return date.fromisoformat(str(value)[:10])
    except ValueError:
        return None


def _active_habits(conn, user_id: int):
    return conn.execute(
        "SELECT * FROM habits WHERE user_id = ? AND archived = 0 ORDER BY created_at ASC",
        (user_id,),
    ).fetchall()


def _habit_logs(conn, user_id: int, habit_id: str | None = None):
    query = """
        SELECT hl.*, h.name AS habit_name
        FROM habit_logs hl
        JOIN habits h ON hl.habit_id = h.id
        WHERE hl.user_id = ?
    """
    params = [user_id]
    if habit_id:
        query += " AND hl.habit_id = ?"
        params.append(habit_id)
    query += " ORDER BY hl.date ASC, hl.created_at ASC"
    return conn.execute(query, params).fetchall()


def _last_logged_at(logs) -> str | None:
    latest = None
    for row in logs:
        value = row["completed_at"] or row["created_at"]
        if not value:
            continue
        try:
            parsed = datetime.fromisoformat(str(value).replace(" ", "T"))
        except ValueError:
            continue
        if latest is None or parsed > latest:
            latest = parsed
    return latest.isoformat() if latest else None


def _today_completed(logs) -> bool:
    today = date.today().isoformat()
    return any(row["date"] == today and int(row["progress"] or 0) >= 100 for row in logs)


def _ai_suggestion(habit, logs, current_streak: int, completion_rate: float) -> str:
    if not logs:
        return f"Start with one small {habit['goal_unit'] or 'session'} today."
    if _today_completed(logs):
        return "Already completed today. Keep the next session lightweight."
    if completion_rate < 40:
        return "Reduce friction: choose the smallest version you can complete today."
    if current_streak >= 7:
        return "Protect the streak by logging at your usual high-success time."
    return "Log this habit today to keep the weekly trend steady."


def _habit_library_item(habit, logs) -> dict:
    created_at = _parse_date(habit["created_at"]) or date.today()
    start = max(created_at, date.today() - timedelta(days=29))
    denominator = (date.today() - start).days + 1
    current_streak = calculate_current_streak(logs)
    best_streak = calculate_best_streak(logs)
    completion_rate = calculate_completion_rate(
        logs,
        start_date=start,
        end_date=date.today(),
        denominator=denominator,
    )

    return {
        "id": habit["id"],
        "name": habit["name"],
        "category": habit["category"] or "",
        "target": habit["target"] or "Daily",
        "frequency": habit["frequency"] or "daily",
        "archived": bool(habit["archived"]),
        "current_streak": current_streak,
        "best_streak": best_streak,
        "completion_rate": completion_rate,
        "total_logs": len(logs),
        "last_logged_at": _last_logged_at(logs),
        "today_completed": _today_completed(logs),
        "ai_suggestion": _ai_suggestion(habit, logs, current_streak, completion_rate),
    }


@router.get("/analytics/dashboard")
async def analytics_dashboard(current_user=Depends(get_current_user)):
    conn = get_connection()
    try:
        habits = _active_habits(conn, current_user["id"])
        logs = _habit_logs(conn, current_user["id"])
        today_completion = calculate_today_completion(habits, logs)
        all_completion_rate = calculate_completion_rate(logs)

        checkins_14d = conn.execute(
            """
            SELECT date, mood, energy, had_urges, completed
            FROM daily_checkins
            WHERE user_id = ? AND date >= ?
            ORDER BY date ASC
            """,
            (current_user["id"], (date.today() - timedelta(days=13)).isoformat()),
        ).fetchall()

        return {
            "summary": {
                "active_habits": len(habits),
                "total_logs": len(logs),
                "today_completed": today_completion["completed"],
                "today_total": today_completion["total"],
                "today_completion_rate": today_completion["completion_rate"],
                "completion_rate_30d": all_completion_rate,
            },
            "today_completion": today_completion,
            "weekly_progress": calculate_weekly_progress(habits, logs),
            "heatmap": calculate_habit_heatmap(logs),
            "trend_30d": calculate_30_day_trend(habits, logs),
            "patterns": {
                "best_weekday": detect_best_weekday(logs),
                "weak_weekday": detect_weak_weekday(logs),
                "best_log_time": detect_best_log_time(logs),
            },
            "checkins": [
                {
                    "date": row["date"],
                    "mood": row["mood"] or "",
                    "energy": row["energy"] or "",
                    "had_urges": bool(row["had_urges"]),
                    "completed": bool(row["completed"]),
                }
                for row in checkins_14d
            ],
        }
    finally:
        conn.close()


@router.get("/analytics/habits/{habit_id}")
async def habit_analytics(habit_id: str, current_user=Depends(get_current_user)):
    conn = get_connection()
    try:
        habit = conn.execute(
            "SELECT * FROM habits WHERE id = ? AND user_id = ?",
            (habit_id, current_user["id"]),
        ).fetchone()

        if not habit:
            raise HTTPException(status_code=404, detail="Habit not found")

        logs = _habit_logs(conn, current_user["id"], habit_id)
        return {
            "habit": {
                "id": habit["id"],
                "name": habit["name"],
                "category": habit["category"] or "",
                "target": habit["target"] or "Daily",
                "frequency": habit["frequency"] or "daily",
                "archived": bool(habit["archived"]),
            },
            "stats": _habit_library_item(habit, logs),
            "heatmap": calculate_habit_heatmap(logs),
            "trend_30d": calculate_30_day_trend([habit], logs),
            "patterns": {
                "best_weekday": detect_best_weekday(logs),
                "weak_weekday": detect_weak_weekday(logs),
                "best_log_time": detect_best_log_time(logs),
            },
            "logs": [
                {
                    "id": row["id"],
                    "date": row["date"],
                    "progress": row["progress"],
                    "note": row["note"] or "",
                    "completed_at": row["completed_at"] or "",
                    "created_at": row["created_at"],
                    "updated_at": row["updated_at"],
                }
                for row in logs
            ],
        }
    finally:
        conn.close()


@router.get("/analytics/habit-library")
async def habit_library_stats(include_archived: bool = True, current_user=Depends(get_current_user)):
    conn = get_connection()
    try:
        query = "SELECT * FROM habits WHERE user_id = ?"
        params = [current_user["id"]]
        if not include_archived:
            query += " AND archived = 0"
        query += " ORDER BY archived ASC, created_at ASC"
        habits = conn.execute(query, params).fetchall()

        return [
            _habit_library_item(habit, _habit_logs(conn, current_user["id"], habit["id"]))
            for habit in habits
        ]
    finally:
        conn.close()


@router.get("/analytics/context-correlations")
async def context_correlations(current_user=Depends(get_current_user)):
    sleep = calculate_sleep_completion_correlation(current_user["id"])
    weather = calculate_weather_completion_correlation(current_user["id"])
    sample_size = max(sleep["sample_size"], weather["sample_size"])
    available = sleep["available"] or weather["available"]

    if available:
        message = "Context analytics are based on logged check-ins joined with habit logs."
    elif sample_size == 0:
        message = "No sleep or weather context has been logged with habit activity yet."
    else:
        message = (
            "Not enough sleep/weather samples yet to report completion-rate claims. "
            "Keep logging context with check-ins."
        )

    return {
        "available": available,
        "sample_size": sample_size,
        "message": message,
        "completion_rate_by_sleep_band": sleep["completion_rate_by_sleep_band"],
        "completion_rate_by_weather": weather["completion_rate_by_weather"],
    }
