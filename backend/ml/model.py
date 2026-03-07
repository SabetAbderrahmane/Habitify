import torch
import torch.nn as nn

class HabitPredictor(nn.Module):
    def __init__(self, input_size=3, hidden_size=16):
        super(HabitPredictor, self).__init__()
        self.model = nn.Sequential(
            nn.Linear(input_size, hidden_size),
            nn.ReLU(),
            nn.Linear(hidden_size, hidden_size),
            nn.ReLU(),
            nn.Linear(hidden_size, 1),
            nn.Sigmoid()
        )

    def forward(self, x):
        return self.model(x)
