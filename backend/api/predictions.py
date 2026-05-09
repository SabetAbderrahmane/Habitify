import json
import torch
import numpy as np
from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from api.deps import get_current_user
from db import get_connection
from ml.model import HybridHabitPredictor

router = APIRouter(tags=["predictions"])

# Model Configuration (Matching ml/predict.py)
DEVICE = torch.device("cuda" if torch.cuda.is_available() else "cpu")
MODEL_PARAMS = {
    "tabular_input_size": 14,
    "tabular_hidden_size": 128,
    "seq_input_size": 1,
    "seq_hidden_size": 64,
    "seq_layers": 2,
    "fusion_hidden_size": 128,
    "dropout": 0.20,
}

# Global model instance for efficiency (Lazy loaded)
_model = None

def get_model():
    global _model
    if _model is None:
        from pathlib import Path
        model_path = Path(__file__).resolve().parent.parent / "ml" / "habit_predictor_best.pth"
        _model = HybridHabitPredictor(**MODEL_PARAMS).to(DEVICE)
        if model_path.exists():
            _model.load_state_dict(torch.load(model_path, map_location=DEVICE))
        _model.eval()
    return _model

class PredictionOut(BaseModel):
    habit_id: str
    habit_name: str
    lapse_risk_score: float  # 0 to 1
    risk_level: str          # Low, Medium, High
    factors: List[str]      # Top factors contributing to risk
    predicted_at: str

@router.get("/predictions/lapse-risk", response_model=List[PredictionOut])
async def get_lapse_risk_predictions(current_user=Depends(get_current_user)):
    conn = get_connection()
    try:
        # 1. Fetch user habits
        habits = conn.execute(
            "SELECT id, name FROM habits WHERE user_id = ? AND archived = 0",
            (current_user["id"],)
        ).fetchall()
        
        if not habits:
            return []

        # 2. Fetch User Profile for tabular features
        profile = conn.execute(
            "SELECT goal, time_commitment, best_time FROM user_profiles WHERE user_id = ?",
            (current_user["id"],)
        ).fetchone() or {"goal": "focus", "time_commitment": "5 min", "best_time": "Morning"}

        # 3. Fetch recent checkins (last 14 days)
        today = datetime.now().date()
        date_14d_ago = today - timedelta(days=14)
        checkins = conn.execute(
            "SELECT * FROM daily_checkins WHERE user_id = ? AND date >= ?",
            (current_user["id"], str(date_14d_ago))
        ).fetchall()
        
        # 4. Fetch nudges and recovery events for today
        nudge_count = conn.execute(
            "SELECT COUNT(*) FROM nudge_history WHERE user_id = ? AND date(shown_at) = ?",
            (current_user["id"], str(today))
        ).fetchone()[0]
        
        recovery_count = conn.execute(
            "SELECT COUNT(*) FROM recovery_events WHERE user_id = ? AND date(created_at) = ?",
            (current_user["id"], str(today))
        ).fetchone()[0]

        predictions = []
        model = get_model()

        for habit in habits:
            # 5. Fetch habit logs for last 14 days
            logs = conn.execute(
                "SELECT date, progress FROM habit_logs WHERE habit_id = ? AND date >= ? ORDER BY date ASC",
                (habit["id"], str(date_14d_ago))
            ).fetchall()
            
            # Preprocess features
            features = extract_features(habit, logs, profile, checkins, nudge_count, recovery_count)
            
            # Prepare tensor data
            tabular_tensor = torch.tensor([features["tabular"]], dtype=torch.float32, device=DEVICE)
            seq_tensor = torch.tensor([features["sequence"]], dtype=torch.float32, device=DEVICE)
            
            # Inference
            with torch.no_grad():
                # Fix for Task 3.2: ensure batch norm works for single sample by calling eval() (already done)
                # and using correct dimensions
                score = model(tabular_tensor, seq_tensor).item()
            
            # Map score to risk (model predicts completion probability, so risk = 1 - score)
            risk_score = 1.0 - score
            risk_level = "Low"
            if risk_score > 0.7: risk_level = "High"
            elif risk_score > 0.4: risk_level = "Medium"
            
            factors = identify_risk_factors(features)

            predictions.append(PredictionOut(
                habit_id=habit["id"],
                habit_name=habit["name"],
                lapse_risk_score=float(risk_score),
                risk_level=risk_level,
                factors=factors,
                predicted_at=datetime.now().isoformat()
            ))

            # Store in history (Task 3.4)
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

def extract_features(habit, logs, profile, checkins, nudge_count, recovery_count):
    # Goal Mapping
    goal_map = {"focus": 0.2, "fitness": 0.4, "sleep": 0.6, "energy": 0.8, "mental": 0.9, "discipline": 1.0}
    goal_score = goal_map.get(profile["goal"].lower(), 0.5)
    
    # Time Commitment Mapping
    time_map = {"5 min": 0.2, "15 min": 0.4, "30 min": 0.6, "1 hour": 0.8, "2+ hours": 1.0}
    time_score = time_map.get(profile["time_commitment"], 0.5)
    
    # Best Time Mapping
    bt_map = {"Morning": 0.2, "Afternoon": 0.5, "Evening": 0.8, "Anytime": 1.0}
    bt_score = bt_map.get(profile["best_time"], 0.5)
    
    # Progress logs (last 14 days)
    # Fill missing days with 0
    today = datetime.now().date()
    log_map = {l["date"]: l["progress"] / 100.0 for l in logs}
    history_seq = []
    for i in range(13, -1, -1):
        d = str(today - timedelta(days=i))
        history_seq.append([log_map.get(d, 0.0)])
    
    recent_progress_mean = np.mean([val[0] for val in history_seq])
    recent_progress_std = np.std([val[0] for val in history_seq])
    
    # Checkins (mood/energy)
    mood_vals = [0.5] if not checkins else [
        {"Happy": 1.0, "Good": 0.8, "Neutral": 0.5, "Low": 0.3, "Sad": 0.1}.get(c["mood"], 0.5) 
        for c in checkins
    ]
    energy_vals = [0.5] if not checkins else [
        {"High": 1.0, "Good": 0.7, "Moderate": 0.5, "Low": 0.3, "Drained": 0.1}.get(c["energy"], 0.5)
        for c in checkins
    ]
    
    mood_proxy = np.mean(mood_vals)
    energy_proxy = np.mean(energy_vals)
    
    # Urges and checkin completion
    has_urges = 1.0 if any(c["had_urges"] for c in checkins[-3:]) else 0.0
    checkin_completed = 1.0 if checkins and checkins[-1]["date"] == str(today) else 0.0
    
    # Nudges and recovery
    norm_nudges = min(1.0, nudge_count / 5.0)
    norm_recovery = min(1.0, recovery_count / 3.0)
    
    # Weekend Effect
    weekend_effect = 1.0 if today.weekday() >= 5 else 0.0
    
    # Streak (Simplified for now)
    streak_strength = 0.5 # Placeholder or calculate if needed
    miss_rate_14d = 1.0 - (len(logs) / 14.0)

    # 14 tabular features in order of ml/predict.py
    tabular = [
        goal_score,
        time_score,
        bt_score,
        recent_progress_mean,
        recent_progress_std,
        streak_strength,
        miss_rate_14d,
        mood_proxy,
        energy_proxy,
        has_urges,
        checkin_completed,
        norm_nudges,
        norm_recovery,
        weekend_effect
    ]
    
    return {
        "tabular": tabular,
        "sequence": history_seq
    }

def identify_risk_factors(features):
    factors = []
    tabular = features["tabular"]
    
    # Map index to feature name based on list above
    if tabular[6] > 0.5: factors.append("High miss rate in last 14 days")
    if tabular[7] < 0.4: factors.append("Low average mood reported")
    if tabular[8] < 0.4: factors.append("Low energy levels reported")
    if tabular[9] > 0.5: factors.append("Reported urges recently")
    if tabular[3] < 0.3: factors.append("Decreasing trend in progress")
    
    if not factors:
        factors.append("Consistent baseline performance")
        
    return factors[:3]
