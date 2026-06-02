import csv
from datetime import date
from io import StringIO

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import Response

from api.deps import get_current_user
from db import get_connection

router = APIRouter(tags=["reports"])


def _parse_report_date(value: str, field_name: str) -> date:
    try:
        return date.fromisoformat(value)
    except ValueError:
        raise HTTPException(status_code=400, detail=f"{field_name} must be YYYY-MM-DD")


def _date_range(start_date: str, end_date: str) -> tuple[date, date]:
    start = _parse_report_date(start_date, "start_date")
    end = _parse_report_date(end_date, "end_date")
    if start > end:
        raise HTTPException(status_code=400, detail="start_date must be before or equal to end_date")
    return start, end


@router.get("/reports/summary")
async def report_summary(
    start_date: str = Query(..., pattern=r"^\d{4}-\d{2}-\d{2}$"),
    end_date: str = Query(..., pattern=r"^\d{4}-\d{2}-\d{2}$"),
    current_user=Depends(get_current_user),
):
    start, end = _date_range(start_date, end_date)
    conn = get_connection()
    try:
        logs = conn.execute(
            """
            SELECT hl.date, hl.progress, hl.note, hl.completed_at, hl.created_at,
                   h.id AS habit_id, h.name AS habit_name, h.category
            FROM habit_logs hl
            JOIN habits h ON hl.habit_id = h.id
            WHERE hl.user_id = ? AND hl.date BETWEEN ? AND ?
            ORDER BY hl.date ASC, h.name ASC
            """,
            (current_user["id"], start.isoformat(), end.isoformat()),
        ).fetchall()

        checkins = conn.execute(
            """
            SELECT date, mood, energy, had_urges, completed
            FROM daily_checkins
            WHERE user_id = ? AND date BETWEEN ? AND ?
            ORDER BY date ASC
            """,
            (current_user["id"], start.isoformat(), end.isoformat()),
        ).fetchall()

        by_habit = {}
        by_day = {}
        for row in logs:
            habit = by_habit.setdefault(
                row["habit_id"],
                {
                    "habit_id": row["habit_id"],
                    "habit_name": row["habit_name"],
                    "category": row["category"] or "",
                    "total_logs": 0,
                    "completed_logs": 0,
                    "average_progress": 0.0,
                },
            )
            habit["total_logs"] += 1
            habit["completed_logs"] += 1 if int(row["progress"] or 0) >= 100 else 0
            habit["average_progress"] += int(row["progress"] or 0)

            day = by_day.setdefault(row["date"], {"date": row["date"], "total_logs": 0, "completed_logs": 0})
            day["total_logs"] += 1
            day["completed_logs"] += 1 if int(row["progress"] or 0) >= 100 else 0

        for habit in by_habit.values():
            habit["completion_rate"] = round(
                (habit["completed_logs"] / habit["total_logs"]) * 100.0,
                2,
            ) if habit["total_logs"] else 0.0
            habit["average_progress"] = round(
                habit["average_progress"] / habit["total_logs"],
                2,
            ) if habit["total_logs"] else 0.0

        for day in by_day.values():
            day["completion_rate"] = round(
                (day["completed_logs"] / day["total_logs"]) * 100.0,
                2,
            ) if day["total_logs"] else 0.0

        completed_logs = sum(1 for row in logs if int(row["progress"] or 0) >= 100)
        return {
            "start_date": start.isoformat(),
            "end_date": end.isoformat(),
            "summary": {
                "total_logs": len(logs),
                "completed_logs": completed_logs,
                "completion_rate": round((completed_logs / len(logs)) * 100.0, 2) if logs else 0.0,
                "checkin_count": len(checkins),
                "urge_days": sum(1 for row in checkins if bool(row["had_urges"])),
            },
            "by_habit": list(by_habit.values()),
            "by_day": list(by_day.values()),
            "checkins": [
                {
                    "date": row["date"],
                    "mood": row["mood"] or "",
                    "energy": row["energy"] or "",
                    "had_urges": bool(row["had_urges"]),
                    "completed": bool(row["completed"]),
                }
                for row in checkins
            ],
        }
    finally:
        conn.close()


@router.get("/reports/export/csv")
async def export_report_csv(
    start_date: str = Query(..., pattern=r"^\d{4}-\d{2}-\d{2}$"),
    end_date: str = Query(..., pattern=r"^\d{4}-\d{2}-\d{2}$"),
    current_user=Depends(get_current_user),
):
    start, end = _date_range(start_date, end_date)
    conn = get_connection()
    try:
        rows = conn.execute(
            """
            SELECT hl.date, h.name AS habit_name, h.category, hl.progress,
                   hl.note, hl.completed_at, hl.created_at, hl.updated_at
            FROM habit_logs hl
            JOIN habits h ON hl.habit_id = h.id
            WHERE hl.user_id = ? AND hl.date BETWEEN ? AND ?
            ORDER BY hl.date ASC, h.name ASC
            """,
            (current_user["id"], start.isoformat(), end.isoformat()),
        ).fetchall()
    finally:
        conn.close()

    output = StringIO()
    writer = csv.writer(output)
    writer.writerow([
        "date",
        "habit_name",
        "category",
        "progress",
        "completed",
        "note",
        "completed_at",
        "created_at",
        "updated_at",
    ])
    for row in rows:
        writer.writerow([
            row["date"],
            row["habit_name"],
            row["category"] or "",
            row["progress"],
            int(row["progress"] or 0) >= 100,
            row["note"] or "",
            row["completed_at"] or "",
            row["created_at"],
            row["updated_at"],
        ])

    filename = f"habitify_report_{start.isoformat()}_{end.isoformat()}.csv"
    return Response(
        content=output.getvalue(),
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
