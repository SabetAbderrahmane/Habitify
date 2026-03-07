# backend/ml/train.py
import torch
import torch.nn as nn
import torch.optim as optim
from model import HabitPredictor
from utils import save_model
import numpy as np

# Check device
device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
print(f"Using device: {device}")

# -------------------
# 1. Generate synthetic data
# -------------------
np.random.seed(42)
num_samples = 5000

# Features: [yesterday_progress, habits_completed, mood_score]
X = np.random.rand(num_samples, 3).astype('float32')
# Label: some non-linear combination + noise
y = (
    0.3 * X[:, 0] + 
    0.4 * X[:, 1] + 
    0.3 * X[:, 2] + 
    0.05 * np.random.randn(num_samples)
)
y = np.clip(y, 0, 1)  # progress between 0 and 1

# Convert to tensors
X = torch.tensor(X).to(device)
y = torch.tensor(y).unsqueeze(1).to(device)

# -------------------
# 2. Define model
# -------------------
model = HabitPredictor(input_size=3, hidden_size=32).to(device)
criterion = nn.MSELoss()
optimizer = optim.Adam(model.parameters(), lr=0.001)

# -------------------
# 3. Training loop
# -------------------
epochs = 50
batch_size = 64

for epoch in range(epochs):
    perm = torch.randperm(X.size(0))
    epoch_loss = 0

    for i in range(0, X.size(0), batch_size):
        idx = perm[i:i + batch_size]
        batch_X, batch_y = X[idx], y[idx]

        optimizer.zero_grad()
        outputs = model(batch_X)
        loss = criterion(outputs, batch_y)
        loss.backward()
        optimizer.step()

        epoch_loss += loss.item() * batch_X.size(0)

    epoch_loss /= X.size(0)
    if (epoch + 1) % 5 == 0 or epoch == 0:
        print(f"Epoch [{epoch+1}/{epochs}], Loss: {epoch_loss:.4f}")

# -------------------
# 4. Save the trained model
# -------------------
save_model(model)
print("Model saved successfully.")
