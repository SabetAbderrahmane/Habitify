from __future__ import annotations

from collections import defaultdict
from datetime import date, datetime, time, timedelta
from typing import Iterable, Optional


WEEKDAY_NAMES = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
MIN_CONTEXT_SAMPLE_SIZE = 5
MIN_BUCKET_SAMPLE_SIZE = 3


def _today() -> date:
    return date.today()


def _parse_date(value) -> Optional[date]:
    if value is None:
        return None
    if isinstance(value, date) and not isinstance(value, datetime):
        return value
    text = str(value).strip()
    if not text:
        return None
    try:
        return datetime.fromisoformat(text.replace("Z", "+00:00")).date()
    except ValueError:
        try:
            return date.fromisoformat(text[:10])
        except ValueError:
            return None


def _parse_datetime(value) -> Optional[datetime]:
    if value is None:
        return None
    if isinstance(value, datetime):
        return value
    text = str(value).strip()
    if not text:
        return None
    try:
        return datetime.fromisoformat(text.replace(" ", "T").replace("Z", "+00:00"))
    except ValueError:
        parsed_date = _parse_date(text)
        return datetime.combine(parsed_date, time.min) if parsed_date else None


def _row_get(row, key: str, default=None):
    try:
        return row[key]
    except (KeyError, IndexError, TypeError):
        return default


def _is_completed(row) -> bool:
    return int(_row_get(row, "progress", 0) or 0) >= 100


def _completed_dates(logs: Iterable) -> set[date]:
    return {
        parsed
        for parsed in (_parse_date(_row_get(row, "date")) for row in logs)
        if parsed is not None and _is_completed(row)
    }


def calculate_current_streak(logs: Iterable, today: Optional[date] = None) -> int:
    completed = _completed_dates(logs)
    if not completed:
        return 0

    today = today or _today()
    cursor = today if today in completed else today - timedelta(days=1)
    streak = 0

    while cursor in completed:
        streak += 1
        cursor -= timedelta(days=1)

    return streak


def calculate_best_streak(logs: Iterable) -> int:
    completed = sorted(_completed_dates(logs))
    if not completed:
        return 0

    best = 1
    current = 1
    for previous, current_day in zip(completed, completed[1:]):
        if current_day == previous + timedelta(days=1):
            current += 1
        else:
            best = max(best, current)
            current = 1

    return max(best, current)


def calculate_completion_rate(
    logs: Iterable,
    *,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    denominator: Optional[int] = None,
) -> float:
    logs = list(logs)
    end_date = end_date or _today()
    start_date = start_date or end_date - timedelta(days=29)

    completed = {
        parsed
        for parsed in (_parse_date(_row_get(row, "date")) for row in logs if _is_completed(row))
        if parsed is not None and start_date <= parsed <= end_date
    }

    days = denominator if denominator is not None else (end_date - start_date).days + 1
    if days <= 0:
        return 0.0

    return round((len(completed) / days) * 100.0, 2)


def calculate_today_completion(habits: Iterable, logs: Iterable, today: Optional[date] = None) -> dict:
    today = today or _today()
    active_habit_ids = {
        _row_get(row, "id")
        for row in habits
        if not bool(_row_get(row, "archived", 0))
    }
    completed_today = {
        _row_get(row, "habit_id")
        for row in logs
        if _parse_date(_row_get(row, "date")) == today and _is_completed(row)
    }
    completed_count = len(active_habit_ids.intersection(completed_today))
    total = len(active_habit_ids)

    return {
        "date": today.isoformat(),
        "completed": completed_count,
        "total": total,
        "completion_rate": round((completed_count / total) * 100.0, 2) if total else 0.0,
    }


def calculate_weekly_progress(habits: Iterable, logs: Iterable, today: Optional[date] = None) -> list[dict]:
    today = today or _today()
    active_total = sum(1 for row in habits if not bool(_row_get(row, "archived", 0)))
    completed_by_date: dict[date, set[str]] = defaultdict(set)

    for row in logs:
        parsed = _parse_date(_row_get(row, "date"))
        if parsed and _is_completed(row):
            completed_by_date[parsed].add(_row_get(row, "habit_id"))

    days = []
    for offset in range(6, -1, -1):
        current = today - timedelta(days=offset)
        completed = len(completed_by_date.get(current, set()))
        days.append(
            {
                "date": current.isoformat(),
                "weekday": WEEKDAY_NAMES[current.weekday()],
                "completed": completed,
                "total": active_total,
                "completion_rate": round((completed / active_total) * 100.0, 2) if active_total else 0.0,
            }
        )

    return days


def calculate_habit_heatmap(
    logs: Iterable,
    *,
    days: int = 90,
    today: Optional[date] = None,
) -> list[dict]:
    today = today or _today()
    start = today - timedelta(days=days - 1)
    by_date: dict[date, list[int]] = defaultdict(list)

    for row in logs:
        parsed = _parse_date(_row_get(row, "date"))
        if parsed and start <= parsed <= today:
            by_date[parsed].append(int(_row_get(row, "progress", 0) or 0))

    heatmap = []
    for offset in range(days):
        current = start + timedelta(days=offset)
        values = by_date.get(current, [])
        completed = sum(1 for value in values if value >= 100)
        heatmap.append(
            {
                "date": current.isoformat(),
                "count": len(values),
                "completed": completed,
                "avg_progress": round(sum(values) / len(values), 2) if values else 0.0,
            }
        )

    return heatmap


def calculate_30_day_trend(
    habits: Iterable,
    logs: Iterable,
    today: Optional[date] = None,
) -> list[dict]:
    today = today or _today()
    active_total = sum(1 for row in habits if not bool(_row_get(row, "archived", 0)))
    completed_by_date: dict[date, set[str]] = defaultdict(set)

    for row in logs:
        parsed = _parse_date(_row_get(row, "date"))
        if parsed and _is_completed(row):
            completed_by_date[parsed].add(_row_get(row, "habit_id"))

    trend = []
    start = today - timedelta(days=29)
    for offset in range(30):
        current = start + timedelta(days=offset)
        completed = len(completed_by_date.get(current, set()))
        trend.append(
            {
                "date": current.isoformat(),
                "completed": completed,
                "total": active_total,
                "completion_rate": round((completed / active_total) * 100.0, 2) if active_total else 0.0,
            }
        )

    return trend


def _weekday_rates(logs: Iterable) -> list[dict]:
    totals = {idx: {"logged": 0, "completed": 0} for idx in range(7)}
    for row in logs:
        parsed = _parse_date(_row_get(row, "date"))
        if not parsed:
            continue
        bucket = totals[parsed.weekday()]
        bucket["logged"] += 1
        if _is_completed(row):
            bucket["completed"] += 1

    rates = []
    for idx, values in totals.items():
        if values["logged"] == 0:
            continue
        rates.append(
            {
                "weekday": WEEKDAY_NAMES[idx],
                "weekday_index": idx,
                "logged": values["logged"],
                "completed": values["completed"],
                "completion_rate": round((values["completed"] / values["logged"]) * 100.0, 2),
            }
        )
    return rates


def detect_best_weekday(logs: Iterable) -> Optional[dict]:
    rates = _weekday_rates(logs)
    if not rates:
        return None
    return max(rates, key=lambda row: (row["completion_rate"], row["completed"], row["logged"]))


def detect_weak_weekday(logs: Iterable) -> Optional[dict]:
    rates = _weekday_rates(logs)
    if not rates:
        return None
    return min(rates, key=lambda row: (row["completion_rate"], -row["logged"]))


def detect_best_log_time(logs: Iterable) -> Optional[dict]:
    windows = {
        "Morning": {"start": 5, "end": 12, "logged": 0, "completed": 0},
        "Afternoon": {"start": 12, "end": 17, "logged": 0, "completed": 0},
        "Evening": {"start": 17, "end": 22, "logged": 0, "completed": 0},
        "Night": {"start": 22, "end": 5, "logged": 0, "completed": 0},
    }

    for row in logs:
        logged_at = _parse_datetime(_row_get(row, "completed_at")) or _parse_datetime(_row_get(row, "created_at"))
        if not logged_at:
            continue

        hour = logged_at.hour
        for name, window in windows.items():
            if window["start"] < window["end"]:
                in_window = window["start"] <= hour < window["end"]
            else:
                in_window = hour >= window["start"] or hour < window["end"]
            if in_window:
                window["logged"] += 1
                if _is_completed(row):
                    window["completed"] += 1
                break

    candidates = []
    for name, values in windows.items():
        if values["logged"] == 0:
            continue
        candidates.append(
            {
                "time_window": name,
                "logged": values["logged"],
                "completed": values["completed"],
                "completion_rate": round((values["completed"] / values["logged"]) * 100.0, 2),
            }
        )

    if not candidates:
        return None
    return max(candidates, key=lambda row: (row["completion_rate"], row["completed"], row["logged"]))


def _completion_rate_bucket(total: int, completed: int) -> Optional[float]:
    if total < MIN_BUCKET_SAMPLE_SIZE:
        return None
    return round((completed / total) * 100.0, 2)


def _sleep_band(sleep_hours) -> Optional[str]:
    if sleep_hours is None:
        return None
    try:
        hours = float(sleep_hours)
    except (TypeError, ValueError):
        return None
    if hours < 0:
        return None
    if hours < 6:
        return "<6h"
    if hours < 7:
        return "6-7h"
    if hours < 8:
        return "7-8h"
    return "8h+"


def calculate_sleep_completion_correlation(user_id: int) -> dict:
    from db import get_connection

    buckets = {
        "<6h": {"sample_size": 0, "completed": 0, "completion_rate": None},
        "6-7h": {"sample_size": 0, "completed": 0, "completion_rate": None},
        "7-8h": {"sample_size": 0, "completed": 0, "completion_rate": None},
        "8h+": {"sample_size": 0, "completed": 0, "completion_rate": None},
    }

    conn = get_connection()
    try:
        rows = conn.execute(
            """
            SELECT hl.progress, dc.sleep_hours
            FROM habit_logs hl
            JOIN daily_checkins dc
              ON dc.user_id = hl.user_id
             AND dc.date = hl.date
            WHERE hl.user_id = ?
              AND dc.sleep_hours IS NOT NULL
            """,
            (user_id,),
        ).fetchall()
    finally:
        conn.close()

    for row in rows:
        band = _sleep_band(row["sleep_hours"])
        if band is None:
            continue
        buckets[band]["sample_size"] += 1
        if int(row["progress"] or 0) >= 100:
            buckets[band]["completed"] += 1

    sample_size = sum(bucket["sample_size"] for bucket in buckets.values())
    for bucket in buckets.values():
        bucket["completion_rate"] = _completion_rate_bucket(
            bucket["sample_size"],
            bucket["completed"],
        )

    available = sample_size >= MIN_CONTEXT_SAMPLE_SIZE and any(
        bucket["completion_rate"] is not None for bucket in buckets.values()
    )
    return {
        "available": available,
        "sample_size": sample_size,
        "completion_rate_by_sleep_band": buckets,
    }


def calculate_weather_completion_correlation(user_id: int) -> dict:
    from db import get_connection

    buckets: dict[str, dict] = {}
    conn = get_connection()
    try:
        rows = conn.execute(
            """
            SELECT hl.progress, dc.weather_condition
            FROM habit_logs hl
            JOIN daily_checkins dc
              ON dc.user_id = hl.user_id
             AND dc.date = hl.date
            WHERE hl.user_id = ?
              AND TRIM(COALESCE(dc.weather_condition, '')) != ''
            """,
            (user_id,),
        ).fetchall()
    finally:
        conn.close()

    for row in rows:
        condition = str(row["weather_condition"] or "").strip()
        if not condition:
            continue
        key = condition.title()
        bucket = buckets.setdefault(
            key,
            {"sample_size": 0, "completed": 0, "completion_rate": None},
        )
        bucket["sample_size"] += 1
        if int(row["progress"] or 0) >= 100:
            bucket["completed"] += 1

    sample_size = sum(bucket["sample_size"] for bucket in buckets.values())
    for bucket in buckets.values():
        bucket["completion_rate"] = _completion_rate_bucket(
            bucket["sample_size"],
            bucket["completed"],
        )

    available = sample_size >= MIN_CONTEXT_SAMPLE_SIZE and any(
        bucket["completion_rate"] is not None for bucket in buckets.values()
    )
    return {
        "available": available,
        "sample_size": sample_size,
        "completion_rate_by_weather": dict(sorted(buckets.items())),
    }
