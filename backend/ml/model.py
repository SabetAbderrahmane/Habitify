import torch
import torch.nn as nn


class TabularBranch(nn.Module):
    def __init__(self, input_size: int, hidden_size: int = 128, dropout: float = 0.20):
        super().__init__()
        self.net = nn.Sequential(
            nn.Linear(input_size, hidden_size),
            nn.BatchNorm1d(hidden_size),
            nn.ReLU(),
            nn.Dropout(dropout),

            nn.Linear(hidden_size, hidden_size),
            nn.BatchNorm1d(hidden_size),
            nn.ReLU(),
            nn.Dropout(dropout),

            nn.Linear(hidden_size, hidden_size // 2),
            nn.BatchNorm1d(hidden_size // 2),
            nn.ReLU(),
        )

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        return self.net(x)


class SequenceBranch(nn.Module):
    def __init__(
        self,
        input_size: int = 1,
        hidden_size: int = 64,
        num_layers: int = 2,
        dropout: float = 0.20,
    ):
        super().__init__()
        self.lstm = nn.LSTM(
            input_size=input_size,
            hidden_size=hidden_size,
            num_layers=num_layers,
            batch_first=True,
            dropout=dropout if num_layers > 1 else 0.0,
        )

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        _, (h_n, _) = self.lstm(x)
        return h_n[-1]


class HybridHabitPredictor(nn.Module):
    """
    Hybrid model:
    - tabular branch for summary/user state features
    - sequence branch for recent history
    - fusion head for final binary completion probability
    """

    def __init__(
        self,
        tabular_input_size: int = 8,
        tabular_hidden_size: int = 128,
        seq_input_size: int = 1,
        seq_hidden_size: int = 64,
        seq_layers: int = 2,
        fusion_hidden_size: int = 128,
        dropout: float = 0.20,
    ):
        super().__init__()

        self.tabular_branch = TabularBranch(
            input_size=tabular_input_size,
            hidden_size=tabular_hidden_size,
            dropout=dropout,
        )

        self.sequence_branch = SequenceBranch(
            input_size=seq_input_size,
            hidden_size=seq_hidden_size,
            num_layers=seq_layers,
            dropout=dropout,
        )

        fusion_input_size = (tabular_hidden_size // 2) + seq_hidden_size

        self.fusion_head = nn.Sequential(
            nn.Linear(fusion_input_size, fusion_hidden_size),
            nn.BatchNorm1d(fusion_hidden_size),
            nn.ReLU(),
            nn.Dropout(dropout),

            nn.Linear(fusion_hidden_size, fusion_hidden_size // 2),
            nn.BatchNorm1d(fusion_hidden_size // 2),
            nn.ReLU(),
            nn.Dropout(dropout),

            nn.Linear(fusion_hidden_size // 2, 1),
            nn.Sigmoid(),
        )

    def forward(self, tabular_x: torch.Tensor, sequence_x: torch.Tensor) -> torch.Tensor:
        tabular_features = self.tabular_branch(tabular_x)
        sequence_features = self.sequence_branch(sequence_x)
        fused = torch.cat([tabular_features, sequence_features], dim=1)
        return self.fusion_head(fused)
