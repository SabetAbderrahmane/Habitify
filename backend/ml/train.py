import copy
import csv
import os
from dataclasses import dataclass
from pathlib import Path

import torch
import torch.nn as nn
import torch.optim as optim
from torch.utils.data import DataLoader, TensorDataset, random_split

from model import HybridHabitPredictor
from utils import evaluate_classification


BASE_DIR = Path(__file__).resolve().parent
DEVICE = torch.device("cuda" if torch.cuda.is_available() else "cpu")


@dataclass(frozen=True)
class TrainConfig:
    batch_size: int = 256
    epochs: int = 80
    learning_rate: float = 6e-4

    best_model_path: str = str(BASE_DIR / "habit_predictor_best.pth")
    latest_model_path: str = str(BASE_DIR / "habit_predictor_latest.pth")
    dataset_csv_path: str = str(BASE_DIR / "persona_training_dataset.csv")

    val_split_ratio: float = 0.2

    tabular_input_size: int = 14
    tabular_hidden_size: int = 128
    seq_input_size: int = 1
    seq_hidden_size: int = 64
    seq_layers: int = 2
    fusion_hidden_size: int = 128
    dropout: float = 0.20

    target_accuracy: float = 0.95
    early_stopping_patience: int = 12

    seed: int = 42
    deterministic: bool = True
    resume_from_checkpoint: bool = False
    log_weight_change: bool = True


TABULAR_COLUMNS = [
    "goal_score",
    "time_commitment_score",
    "best_time_score",
    "recent_progress_mean",
    "recent_progress_std",
    "streak_strength",
    "miss_rate_14d",
    "mood_proxy",
    "energy_proxy",
    "had_urges",
    "checkin_completed",
    "nudge_count_today",
    "recovery_events_today",
    "weekend_effect",
]

SEQ_COLUMNS = [f"seq_day_{i}" for i in range(1, 15)]
TARGET_COLUMN = "target_completed_next_day"


def set_reproducibility(seed: int, deterministic: bool) -> None:
    torch.manual_seed(seed)
    if torch.cuda.is_available():
        torch.cuda.manual_seed_all(seed)

    if deterministic:
        torch.backends.cudnn.deterministic = True
        torch.backends.cudnn.benchmark = False
    else:
        torch.backends.cudnn.deterministic = False
        torch.backends.cudnn.benchmark = True


def maybe_load_checkpoint(model: nn.Module, path: str) -> bool:
    if not os.path.exists(path):
        return False
    state = torch.load(path, map_location=DEVICE)
    model.load_state_dict(state)
    return True


def get_weight_snapshot(model: nn.Module) -> torch.Tensor:
    return model.tabular_branch.net[0].weight[0][:8].detach().cpu().clone()


def load_csv_dataset(csv_path: str):
    csv_file = Path(csv_path).resolve()

    if not csv_file.exists():
        raise FileNotFoundError(f"Training CSV not found: {csv_file}")

    tabular_rows = []
    sequence_rows = []
    targets = []

    with csv_file.open("r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            tabular_rows.append([float(row[col]) for col in TABULAR_COLUMNS])
            sequence_rows.append([[float(row[col])] for col in SEQ_COLUMNS])
            targets.append([float(row[TARGET_COLUMN])])

    tabular_tensor = torch.tensor(tabular_rows, dtype=torch.float32)
    sequence_tensor = torch.tensor(sequence_rows, dtype=torch.float32)
    target_tensor = torch.tensor(targets, dtype=torch.float32)

    return tabular_tensor, sequence_tensor, target_tensor, str(csv_file)


def build_dataloaders(
    tabular_x: torch.Tensor,
    sequence_x: torch.Tensor,
    y: torch.Tensor,
    batch_size: int,
    val_split_ratio: float,
    seed: int,
):
    dataset = TensorDataset(tabular_x, sequence_x, y)

    val_size = int(len(dataset) * val_split_ratio)
    train_size = len(dataset) - val_size

    generator = torch.Generator().manual_seed(seed)
    train_dataset, val_dataset = random_split(dataset, [train_size, val_size], generator=generator)

    train_loader = DataLoader(
        train_dataset,
        batch_size=batch_size,
        shuffle=True,
        num_workers=0,
        pin_memory=torch.cuda.is_available(),
    )

    val_loader = DataLoader(
        val_dataset,
        batch_size=batch_size,
        shuffle=False,
        num_workers=0,
        pin_memory=torch.cuda.is_available(),
    )

    return train_loader, val_loader


def train_one_epoch(
    model: nn.Module,
    dataloader,
    criterion,
    optimizer,
    device: torch.device,
) -> float:
    model.train()
    running_loss = 0.0
    total = 0

    for batch_tabular, batch_sequence, batch_y in dataloader:
        batch_tabular = batch_tabular.to(device, non_blocking=True)
        batch_sequence = batch_sequence.to(device, non_blocking=True)
        batch_y = batch_y.to(device, non_blocking=True)

        optimizer.zero_grad(set_to_none=True)

        outputs = model(batch_tabular, batch_sequence)
        loss = criterion(outputs, batch_y)

        loss.backward()
        optimizer.step()

        running_loss += loss.item() * batch_tabular.size(0)
        total += batch_tabular.size(0)

    return running_loss / total if total else 0.0


def main() -> None:
    config = TrainConfig()

    set_reproducibility(config.seed, config.deterministic)

    print(f"Using device: {DEVICE}")
    print(f"Seed: {config.seed}")
    print(f"Deterministic mode: {config.deterministic}")
    print(f"Resume from checkpoint: {config.resume_from_checkpoint}")

    tabular_x, sequence_x, y, resolved_csv_path = load_csv_dataset(config.dataset_csv_path)
    print(f"Loaded CSV: {resolved_csv_path}")
    print(f"Loaded dataset rows: {len(y)}")
    print(f"Tabular shape: {tuple(tabular_x.shape)}")
    print(f"Sequence shape: {tuple(sequence_x.shape)}")
    print(f"Target shape: {tuple(y.shape)}")

    train_loader, val_loader = build_dataloaders(
        tabular_x,
        sequence_x,
        y,
        batch_size=config.batch_size,
        val_split_ratio=config.val_split_ratio,
        seed=config.seed,
    )

    model = HybridHabitPredictor(
        tabular_input_size=config.tabular_input_size,
        tabular_hidden_size=config.tabular_hidden_size,
        seq_input_size=config.seq_input_size,
        seq_hidden_size=config.seq_hidden_size,
        seq_layers=config.seq_layers,
        fusion_hidden_size=config.fusion_hidden_size,
        dropout=config.dropout,
    ).to(DEVICE)

    resumed = False
    if config.resume_from_checkpoint:
        resumed = maybe_load_checkpoint(model, config.latest_model_path)

    if config.log_weight_change:
        before_weights = get_weight_snapshot(model)
        print("Before training weights:", before_weights.tolist())

    criterion = nn.BCELoss()
    optimizer = optim.AdamW(model.parameters(), lr=config.learning_rate, weight_decay=1e-4)
    scheduler = optim.lr_scheduler.ReduceLROnPlateau(
        optimizer,
        mode="max",
        factor=0.5,
        patience=4,
    )

    best_val_acc = 0.0
    best_state = None
    epochs_without_improvement = 0

    if resumed:
        print(f"Loaded checkpoint from {config.latest_model_path}")
    else:
        print("Starting from scratch")

    print(f"Training on persona CSV for up to {config.epochs} epochs...")

    for epoch in range(1, config.epochs + 1):
        train_loss = train_one_epoch(
            model=model,
            dataloader=train_loader,
            criterion=criterion,
            optimizer=optimizer,
            device=DEVICE,
        )

        val_loss, val_acc = evaluate_classification(
            model=model,
            dataloader=val_loader,
            device=DEVICE,
        )

        scheduler.step(val_acc)

        improved = val_acc > best_val_acc
        if improved:
            best_val_acc = val_acc
            best_state = copy.deepcopy(model.state_dict())
            torch.save(best_state, config.best_model_path)
            epochs_without_improvement = 0
            save_note = " [best saved]"
        else:
            epochs_without_improvement += 1
            save_note = ""

        torch.save(model.state_dict(), config.latest_model_path)

        current_lr = optimizer.param_groups[0]["lr"]

        print(
            f"Epoch {epoch:02d}/{config.epochs} | "
            f"LR: {current_lr:.6f} | "
            f"Train Loss: {train_loss:.4f} | "
            f"Val Loss: {val_loss:.4f} | "
            f"Val Acc: {val_acc * 100:.2f}%{save_note}"
        )

        if best_val_acc >= config.target_accuracy:
            print(
                f"Target validation accuracy reached: {best_val_acc * 100:.2f}% "
                f"(threshold: {config.target_accuracy * 100:.2f}%)."
            )
            break

        if epochs_without_improvement >= config.early_stopping_patience:
            print(
                f"Early stopping triggered after {epochs_without_improvement} "
                f"epochs without validation improvement."
            )
            break

    if best_state is None:
        best_state = model.state_dict()
        torch.save(best_state, config.best_model_path)

    if config.log_weight_change:
        after_weights = get_weight_snapshot(model)
        print("After training weights:", after_weights.tolist())

    print(f"Best validation accuracy: {best_val_acc * 100:.2f}%")
    print(f"Best model saved to: {config.best_model_path}")
    print(f"Latest model saved to: {config.latest_model_path}")


if __name__ == "__main__":
    main()
