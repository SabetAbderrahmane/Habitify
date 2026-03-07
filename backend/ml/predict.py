# backend/ml/predict.py
import torch
from model import HabitPredictor
from utils import load_model
import numpy as np

# Check device
device = torch.device("cuda" if torch.cuda.is_available() else "cpu")

# Load trained model
model = load_model(HabitPredictor, device=device, input_size=3, hidden_size=32)

# Example: predict for a new user input
# Features: yesterday_progress, habits_completed, mood_score
new_data = np.array([[0.5, 0.8, 0.7]], dtype='float32')
X_new = torch.tensor(new_data).to(device)

with torch.no_grad():
    prediction = model(X_new)
print(f"Predicted progress today: {prediction.item():.2f}")
