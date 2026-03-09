from pathlib import Path

import torch

from model import HybridHabitPredictor


BASE_DIR = Path(__file__).resolve().parent
DEVICE = torch.device("cuda" if torch.cuda.is_available() else "cpu")
MODEL_PATH = BASE_DIR / "habit_predictor_best.pth"


def main() -> None:
    model = HybridHabitPredictor(
        tabular_input_size=14,
        tabular_hidden_size=128,
        seq_input_size=1,
        seq_hidden_size=64,
        seq_layers=2,
        fusion_hidden_size=128,
        dropout=0.20,
    ).to(DEVICE)

    model.load_state_dict(torch.load(MODEL_PATH, map_location=DEVICE))
    model.eval()

    # 14 tabular features
    sample_tabular = torch.tensor(
        [[
            0.20,  # goal_score
            0.55,  # time_commitment_score
            0.20,  # best_time_score
            0.72,  # recent_progress_mean
            0.11,  # recent_progress_std
            0.66,  # streak_strength
            0.15,  # miss_rate_14d
            0.80,  # mood_proxy
            0.70,  # energy_proxy
            0.00,  # had_urges
            1.00,  # checkin_completed
            1.00,  # nudge_count_today
            0.00,  # recovery_events_today
            0.00,  # weekend_effect
        ]],
        dtype=torch.float32,
        device=DEVICE,
    )

    # 14-day sequence
    sample_sequence = torch.tensor(
        [[[0.42], [0.48], [0.51], [0.55], [0.58], [0.61], [0.63],
          [0.65], [0.68], [0.70], [0.72], [0.75], [0.78], [0.82]]],
        dtype=torch.float32,
        device=DEVICE,
    )

    with torch.no_grad():
        prob = model(sample_tabular, sample_sequence).item()
        label = 1 if prob > 0.5 else 0

    print(f"Using device: {DEVICE}")
    print(f"Model path: {MODEL_PATH}")
    print(f"Predicted probability: {prob:.4f}")
    print(f"Predicted label: {label}")


if __name__ == "__main__":
    main()
