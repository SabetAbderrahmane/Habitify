from datetime import date, timedelta, datetime
from typing import List, Optional

from fastapi import APIRouter, Depends
from pydantic import BaseModel

from api.deps import get_current_user
from db import get_connection

router = APIRouter(tags=["nudges"])


class NudgeAction(BaseModel):
    label: str
    path: str


class NudgeOut(BaseModel):
    id: str
    type: str
    title: str
    message: str
    priority: int = 3
    action: Optional[NudgeAction] = None


def iso(d: date) -> str:
    return d.isoformat()


def parse_sqlite_dt(value: str) -> datetime:
    return datetime.fromisoformat(value.replace(" ", "T"))


def recently_shown(conn, user_id: int, nudge_type: str, habit_name: str = "", cooldown_hours: int = 24) -> bool:
    row = conn.execute(
        """
        SELECT shown_at
        FROM nudge_history
        WHERE user_id = ? AND nudge_type = ? AND habit_name = ?
        ORDER BY shown_at DESC
        LIMIT 1
        """,
        (user_id, nudge_type, habit_name),
    ).fetchone()

    if not row:
        return False

    shown_at = parse_sqlite_dt(row["shown_at"])
    return (datetime.utcnow() - shown_at) < timedelta(hours=cooldown_hours)


def mark_shown(conn, user_id: int, nudge_type: str, habit_name: str = ""):
    conn.execute(
        """
        INSERT INTO nudge_history (user_id, nudge_type, habit_name)
        VALUES (?, ?, ?)
        """,
        (user_id, nudge_type, habit_name),
    )


def compute_nudges(
    user_id: int,
    mark_as_shown: bool = False,
    respect_history: bool = True,
) -> List[NudgeOut]:
    today = date.today()
    yesterday = today - timedelta(days=1)
    day_before = today - timedelta(days=2)

    today_s = iso(today)
    y_s = iso(yesterday)
    db_s = iso(day_before)

    conn = get_connection()
    nudges: List[NudgeOut] = []

    def add_nudge_if_allowed(
        *,
        nudge_type: str,
        title: str,
        message: str,
        priority: int,
        action: Optional[NudgeAction] = None,
        habit_name: str = "",
        cooldown_hours: int = 24,
        nudge_id: str,
    ):
        if respect_history and recently_shown(conn, user_id, nudge_type, habit_name, cooldown_hours):
            return

        nudges.append(
            NudgeOut(
                id=nudge_id,
                type=nudge_type,
                title=title,
                message=message,
                priority=priority,
                action=action,
            )
        )

        if mark_as_shown:
            mark_shown(conn, user_id, nudge_type, habit_name)

    # Rule 1: No habits logged today
    row = conn.execute(
        """
        SELECT COUNT(*) AS c
        FROM habit_logs
        WHERE user_id = ? AND date = ?
        """,
        (user_id, today_s),
    ).fetchone()

    if row and row["c"] == 0:
        add_nudge_if_allowed(
            nudge_type="no_logs_today",
            title="No habits logged today",
            message="A small win today keeps momentum alive - log just one habit.",
            priority=2,
            action=NudgeAction(label="Go to Dashboard", path="/app"),
            cooldown_hours=12,
            nudge_id=f"no_logs_{today_s}",
        )

    # Rule 2: Core habits missed for 2 days
    core = conn.execute("SELECT name FROM core_habits ORDER BY id ASC").fetchall()

    for r in core:
        name = r["name"]

        y_hit = conn.execute(
            """
            SELECT 1
            FROM habit_logs
            WHERE user_id = ? AND name = ? AND date = ? AND progress > 0
            LIMIT 1
            """,
            (user_id, name, y_s),
        ).fetchone()

        db_hit = conn.execute(
            """
            SELECT 1
            FROM habit_logs
            WHERE user_id = ? AND name = ? AND date = ? AND progress > 0
            LIMIT 1
            """,
            (user_id, name, db_s),
        ).fetchone()

        if (y_hit is None) and (db_hit is None):
            add_nudge_if_allowed(
                nudge_type="core_missed_2days",
                habit_name=name,
                title=f"Friendly reminder: {name}",
                message="You missed this core habit for 2 days. No pressure - one small comeback today matters.",
                priority=1,
                action=NudgeAction(label="Open Core Habits", path="/app/core"),
                cooldown_hours=24,
                nudge_id=f"core_missed_{name}_{today_s}",
            )

    # Rule 3: Low mood for 2 days
    low = conn.execute(
        """
        SELECT date, mood
        FROM daily_checkins
        WHERE user_id = ? AND date IN (?, ?) AND completed = 1
        """,
        (user_id, y_s, db_s),
    ).fetchall()

    low_moods = {row["date"]: (row["mood"] or "") for row in low}
    if low_moods.get(y_s) in ("Low", "Bad") and low_moods.get(db_s) in ("Low", "Bad"):
        add_nudge_if_allowed(
            nudge_type="low_mood_2days",
            title="Two low-mood days detected",
            message="Try a tiny stabilizer today: water + 10-minute walk + early sleep. You've got this.",
            priority=2,
            action=NudgeAction(label="Daily Check-in", path="/app/checkin"),
            cooldown_hours=24,
            nudge_id=f"low_mood_{today_s}",
        )

    # Rule 4: Relapse yesterday
    relapse_y = conn.execute(
        """
        SELECT COUNT(*) AS c
        FROM recovery_events
        WHERE user_id = ? AND event_type = 'relapse' AND DATE(created_at) = ?
        """,
        (user_id, y_s),
    ).fetchone()

    if relapse_y and relapse_y["c"] > 0:
        add_nudge_if_allowed(
            nudge_type="relapse_yesterday",
            title="Reset mode",
            message="Yesterday had a slip. Today can be a reset - hit 'Urge Action Mode' if you feel the loop starting.",
            priority=1,
            action=NudgeAction(label="Open Recovery", path="/app/recovery"),
            cooldown_hours=18,
            nudge_id=f"relapse_y_{today_s}",
        )

    # Rule 5: Recommended pack not started
    prof = conn.execute(
        """
        SELECT goal
        FROM user_profiles
        WHERE user_id = ?
        """,
        (user_id,),
    ).fetchone()

    goal = (prof["goal"] if prof else "focus") or "focus"

    pack = conn.execute(
        """
        SELECT id, title
        FROM recommended_packs
        WHERE goal_key = ?
        """,
        (goal,),
    ).fetchone()

    if pack:
        pack_habits = conn.execute(
            """
            SELECT name
            FROM recommended_habits
            WHERE pack_id = ?
            """,
            (pack["id"],),
        ).fetchall()

        for ph in pack_habits:
            hname = ph["name"]
            started = conn.execute(
                """
                SELECT 1
                FROM habit_logs
                WHERE user_id = ? AND name = ?
                LIMIT 1
                """,
                (user_id, hname),
            ).fetchone()

            if started is None:
                add_nudge_if_allowed(
                    nudge_type="recommended_not_started",
                    habit_name=hname,
                    title=f"Start your {pack['title']}",
                    message=f"Quick win: add and log '{hname}' today to kickstart your goal.",
                    priority=3,
                    action=NudgeAction(label="Recommended", path="/app/recommended"),
                    cooldown_hours=24,
                    nudge_id=f"rec_not_started_{goal}_{today_s}",
                )
                break

    if mark_as_shown:
        conn.commit()

    conn.close()
    nudges.sort(key=lambda n: n.priority)
    return nudges


@router.get("/nudges/today", response_model=List[NudgeOut])
async def nudges_today(current_user=Depends(get_current_user)):
    return compute_nudges(
        current_user["id"],
        mark_as_shown=True,
        respect_history=True,
    )
