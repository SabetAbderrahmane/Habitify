import json
import numpy as np
from datetime import datetime, timedelta
from pathlib import Path
from typing import List, Optional

from fastapi import APIRouter, Depends
from pydantic import BaseModel

from api.deps import get_current_user
from db import get_connection

router = APIRouter(tags=["predictions"])

MODEL_PATH = Path(__file__).resolve().parent.parent / "ml" / "habit_predictor_best.pth"
MODEL_PARAMS = {
    "tabular_input_size": 14,
    "tabular_hidden_size": 128,
    "seq_input_size": 1,
    "seq_hidden_size": 64,
    "seq_layers": 2,
    "fusion_hidden_size": 128,
    "dropout": 0.20,
}

# Lazy-load model only if weights exist
_model = None
_model_loaded = False


def _try_load_model():
    """Load the trained model if its weights file exists. Returns (model, loaded_ok)."""
    global _model, _model_loaded
    if _model_loaded:
        return _model, _model is not None

    if not MODEL_PATH.exists():
        _model_loaded = True
        _model = None
        return None, False

    try:
        import torch
        from ml.model import HybridHabitPredictor
        device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        m = HybridHabitPredictor(**MODEL_PARAMS).to(device)
        m.load_state_dict(torch.load(str(MODEL_PATH), map_location=device))
        m.eval()
        _model = (m, device)
        _model_loaded = True
        return _model, True
    except Exception:
        _model_loaded = True
        _model = None
        return None, False


class PredictionOut(BaseModel):
    habit_id: str
    habit_name: str
    lapse_risk_score: float
    risk_level: str
    source: str                      # "ml" or "rule_based_fallback"
    confidence: Optional[float] = None
    factors: List[str]
    predicted_at: str


@router.get("/predictions/lapse-risk", response_model=List[PredictionOut])
async def get_lapse_risk_predictions(current_user=Depends(get_current_user)):
    conn = get_connection()
    try:
        habits = conn.execute(
            "SELECT id, name FROM habits WHERE user_id = ? AND archived = 0",
            (current_user["id"],)
        ).fetchall()

        if not habits:
            return []

        profile = conn.execute(
            "SELECT goal, time_commitment, best_time FROM user_profiles WHERE user_id = ?",
            (current_user["id"],)
        ).fetchone() or {"goal": "focus", "time_commitment": "5 min", "best_time": "Morning"}

        today = datetime.now().date()
        date_14d_ago = today - timedelta(days=14)

        checkins = conn.execute(
            "SELECT * FROM daily_checkins WHERE user_id = ? AND date >= ?",
            (current_user["id"], str(date_14d_ago))
        ).fetchall()

        nudge_count = conn.execute(
            "SELECT COUNT(*) FROM nudge_history WHERE user_id = ? AND date(shown_at) = ?",
            (current_user["id"], str(today))
        ).fetchone()[0]

        recovery_count = conn.execute(
            "SELECT COUNT(*) FROM recovery_events WHERE user_id = ? AND date(created_at) = ?",
            (current_user["id"], str(today))
        ).fetchone()[0]

        ml_bundle, ml_ok = _try_load_model()
        predictions = []

        for habit in habits:
            logs = conn.execute(
                "SELECT date, progress FROM habit_logs WHERE habit_id = ? AND date >= ? ORDER BY date ASC",
                (habit["id"], str(date_14d_ago))
            ).fetchall()

            features = extract_features(habit, logs, profile, checkins, nudge_count, recovery_count)

            if ml_ok and ml_bundle is not None:
                # --- ML inference ---
                import torch
                model, device = ml_bundle
                tabular_tensor = torch.tensor([features["tabular"]], dtype=torch.float32, device=device)
                seq_tensor = torch.tensor([features["sequence"]], dtype=torch.float32, device=device)
                with torch.no_grad():
                    raw_score = model(tabular_tensor, seq_tensor).item()
                risk_score = float(1.0 - raw_score)
                source = "ml"
                confidence = float(max(raw_score, 1.0 - raw_score))
            else:
                # --- Deterministic rule-based fallback ---
                risk_score = _rule_based_risk(features)
                source = "rule_based_fallback"
                confidence = None

            risk_level = "Low"
            if risk_score > 0.7:
                risk_level = "High"
            elif risk_score > 0.4:
                risk_level = "Medium"

            factors = identify_risk_factors(features)

            predictions.append(PredictionOut(
                habit_id=habit["id"],
                habit_name=habit["name"],
                lapse_risk_score=round(risk_score, 4),
                risk_level=risk_level,
                source=source,
                confidence=round(confidence, 4) if confidence is not None else None,
                factors=factors,
                predicted_at=datetime.now().isoformat(),
            ))

            conn.execute(
                """
                INSERT INTO prediction_history (user_id, habit_id, prediction_score, prediction_label, features_json)
                VALUES (?, ?, ?, ?, ?)
                """,
                (current_user["id"], habit["id"], risk_score, risk_level, json.dumps(features))
            )

        conn.commit()
        return predictions
    finally:
        conn.close()


def _rule_based_risk(features) -> float:
    """
    Deterministic rule-based fallback. Returns a risk score [0, 1].
    Based entirely on observable features, no random/untrained weights.
    """
    tabular = features["tabular"]
    # index 6 = miss_rate_14d, index 3 = recent_progress_mean
    miss_rate = tabular[6]          # 0–1, higher = more missed days
    progress_mean = tabular[3]      # 0–1, higher = better
    mood = tabular[7]               # 0–1, higher = better mood
    energy = tabular[8]             # 0–1, higher = more energy
    has_urges = tabular[9]          # 0 or 1
    weekend = tabular[13]           # 0 or 1

    risk = (
        miss_rate * 0.45
        + (1.0 - progress_mean) * 0.25
        + (1.0 - mood) * 0.10
        + (1.0 - energy) * 0.10
        + has_urges * 0.05
        + weekend * 0.05
    )
    return round(min(max(risk, 0.0), 1.0), 4)


def extract_features(habit, logs, profile, checkins, nudge_count, recovery_count):
    goal_map = {"focus": 0.2, "fitness": 0.4, "sleep": 0.6, "energy": 0.8, "mental": 0.9, "discipline": 1.0}
    goal_score = goal_map.get((profile["goal"] or "focus").lower(), 0.5)

    time_map = {"5 min": 0.2, "15 min": 0.4, "30 min": 0.6, "1 hour": 0.8, "2+ hours": 1.0}
    time_score = time_map.get(profile["time_commitment"] or "5 min", 0.5)

    bt_map = {"Morning": 0.2, "Afternoon": 0.5, "Evening": 0.8, "Anytime": 1.0}
    bt_score = bt_map.get(profile["best_time"] or "Morning", 0.5)

    today = datetime.now().date()
    log_map = {l["date"]: l["progress"] / 100.0 for l in logs}
    history_seq = []
    for i in range(13, -1, -1):
        d = str(today - timedelta(days=i))
        history_seq.append([log_map.get(d, 0.0)])

    recent_progress_mean = float(np.mean([v[0] for v in history_seq]))
    recent_progress_std = float(np.std([v[0] for v in history_seq]))

    mood_vals = [0.5] if not checkins else [
        {"Happy": 1.0, "Good": 0.8, "Neutral": 0.5, "Low": 0.3, "Sad": 0.1}.get(c["mood"], 0.5)
        for c in checkins
    ]
    energy_vals = [0.5] if not checkins else [
        {"High": 1.0, "Good": 0.7, "Moderate": 0.5, "Low": 0.3, "Drained": 0.1}.get(c["energy"], 0.5)
        for c in checkins
    ]

    mood_proxy = float(np.mean(mood_vals))
    energy_proxy = float(np.mean(energy_vals))
    has_urges = 1.0 if any(c["had_urges"] for c in checkins[-3:]) else 0.0
    checkin_completed = 1.0 if checkins and checkins[-1]["date"] == str(today) else 0.0
    norm_nudges = min(1.0, nudge_count / 5.0)
    norm_recovery = min(1.0, recovery_count / 3.0)
    weekend_effect = 1.0 if today.weekday() >= 5 else 0.0
    streak_strength = 0.5
    miss_rate_14d = 1.0 - (len(logs) / 14.0)

    tabular = [
        goal_score, time_score, bt_score,
        recent_progress_mean, recent_progress_std,
        streak_strength, miss_rate_14d,
        mood_proxy, energy_proxy, has_urges, checkin_completed,
        norm_nudges, norm_recovery, weekend_effect,
    ]

    return {"tabular": tabular, "sequence": history_seq}


def identify_risk_factors(features):
    factors = []
    tabular = features["tabular"]
    if tabular[6] > 0.5: factors.append("High miss rate in last 14 days")
    if tabular[7] < 0.4: factors.append("Low average mood reported")
    if tabular[8] < 0.4: factors.append("Low energy levels reported")
    if tabular[9] > 0.5: factors.append("Reported urges recently")
    if tabular[3] < 0.3: factors.append("Decreasing trend in progress")
    if not factors:
        factors.append("Consistent baseline performance")
    return factors[:3]
