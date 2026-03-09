from typing import Tuple

import torch
from torch.utils.data import TensorDataset, random_split, DataLoader


def generate_synthetic_data(
    n_samples: int = 300_000,
    seq_len: int = 14,
    seed: int = 42,
) -> Tuple[torch.Tensor, torch.Tensor, torch.Tensor]:
   
    g = torch.Generator().manual_seed(seed)

    # -----------------------------
    # 1. User persona assignment
    # -----------------------------
    # 0 = disciplined
    # 1 = inconsistent
    # 2 = burnout-prone
    # 3 = highly responsive to nudges
    persona = torch.randint(0, 4, (n_samples,), generator=g)

    disciplined = (persona == 0).float()
    inconsistent = (persona == 1).float()
    burnout_prone = (persona == 2).float()
    nudge_sensitive = (persona == 3).float()

    # -----------------------------
    # 2. Base latent user traits
    # -----------------------------
    base_motivation = (
        0.75 * disciplined
        + 0.45 * inconsistent
        + 0.55 * burnout_prone
        + 0.60 * nudge_sensitive
        + 0.08 * torch.randn(n_samples, generator=g)
    ).clamp(0.05, 0.98)

    base_consistency = (
        0.82 * disciplined
        + 0.35 * inconsistent
        + 0.52 * burnout_prone
        + 0.58 * nudge_sensitive
        + 0.08 * torch.randn(n_samples, generator=g)
    ).clamp(0.05, 0.98)

    base_energy = (
        0.68 * disciplined
        + 0.55 * inconsistent
        + 0.38 * burnout_prone
        + 0.60 * nudge_sensitive
        + 0.09 * torch.randn(n_samples, generator=g)
    ).clamp(0.05, 0.98)

    base_nudge_response = (
        0.40 * disciplined
        + 0.35 * inconsistent
        + 0.45 * burnout_prone
        + 0.88 * nudge_sensitive
        + 0.07 * torch.randn(n_samples, generator=g)
    ).clamp(0.02, 0.99)

    # -----------------------------
    # 3. Habit-specific factors
    # -----------------------------
    habit_difficulty = torch.rand(n_samples, generator=g)  # 0 easy, 1 hard
    weekend_effect = torch.bernoulli(
        torch.full((n_samples,), 0.28), generator=g
    ).float()

    # -----------------------------
    # 4. Dynamic current-state tabular features
    # -----------------------------
    streak_strength = (
        base_consistency * (1.0 - 0.35 * habit_difficulty)
        + 0.07 * torch.randn(n_samples, generator=g)
    ).clamp(0.0, 1.0)

    time_consistency = (
        base_consistency * (1.0 - 0.15 * weekend_effect)
        + 0.05 * torch.randn(n_samples, generator=g)
    ).clamp(0.0, 1.0)

    recent_miss_rate = (
        0.55 * habit_difficulty
        + 0.35 * (1.0 - base_consistency)
        + 0.20 * burnout_prone
        + 0.08 * torch.randn(n_samples, generator=g)
    ).clamp(0.0, 1.0)

    mood_proxy = (
        0.45 * base_motivation
        + 0.30 * base_energy
        + 0.18 * streak_strength
        - 0.22 * recent_miss_rate
        + 0.06 * torch.randn(n_samples, generator=g)
    ).clamp(0.0, 1.0)

    energy_proxy = (
        0.72 * base_energy
        - 0.18 * burnout_prone
        - 0.10 * weekend_effect
        + 0.07 * torch.randn(n_samples, generator=g)
    ).clamp(0.0, 1.0)

    nudge_responsiveness = (
        0.78 * base_nudge_response
        + 0.10 * mood_proxy
        - 0.10 * recent_miss_rate
        + 0.05 * torch.randn(n_samples, generator=g)
    ).clamp(0.0, 1.0)

    recent_progress_mean = (
        0.30 * base_motivation
        + 0.25 * streak_strength
        + 0.18 * mood_proxy
        + 0.15 * energy_proxy
        - 0.28 * habit_difficulty
        - 0.22 * recent_miss_rate
        + 0.20 * nudge_responsiveness
        + 0.07 * torch.randn(n_samples, generator=g)
    ).clamp(0.0, 1.0)

    # -----------------------------
    # 5. Sequence generation
    # -----------------------------
    # Simulate recent daily completion history with inertia and shocks.
    sequence = torch.zeros(n_samples, seq_len, dtype=torch.float32)

    # Start point influenced by recent progress
    current = (
        0.55 * recent_progress_mean
        + 0.15 * streak_strength
        + 0.10 * mood_proxy
        + 0.08 * energy_proxy
        - 0.10 * habit_difficulty
        + 0.05 * torch.randn(n_samples, generator=g)
    ).clamp(0.0, 1.0)

    for t in range(seq_len):
        is_weekend_like = 1.0 if (t % 7) in (5, 6) else 0.0

        # delayed nudge effect sometimes boosts next-day success
        nudge_boost = (
            0.08 * nudge_responsiveness
            * torch.bernoulli(torch.full((n_samples,), 0.35), generator=g)
        )

        # burnout creates downward drift
        burnout_drag = 0.06 * burnout_prone * (t / max(seq_len - 1, 1))

        # momentum from yesterday + current state
        current = (
            0.58 * current
            + 0.18 * base_motivation
            + 0.12 * streak_strength
            + 0.08 * mood_proxy
            + 0.07 * energy_proxy
            + nudge_boost
            - 0.18 * habit_difficulty
            - 0.16 * recent_miss_rate
            - 0.08 * is_weekend_like * weekend_effect
            - burnout_drag
            + 0.09 * torch.randn(n_samples, generator=g)
        ).clamp(0.0, 1.0)

        sequence[:, t] = current

    sequence = sequence.unsqueeze(-1)  # [N, seq_len, 1]

    # -----------------------------
    # 6. Final label construction
    # -----------------------------
    seq_mean = sequence.squeeze(-1).mean(dim=1)
    seq_last = sequence.squeeze(-1)[:, -1]
    seq_std = sequence.squeeze(-1).std(dim=1)

    score = (
        0.65 * recent_progress_mean
        + 0.55 * streak_strength
        + 0.20 * time_consistency
        - 0.70 * recent_miss_rate
        + 0.30 * mood_proxy
        + 0.28 * energy_proxy
        + 0.22 * nudge_responsiveness
        - 0.16 * weekend_effect
        - 0.35 * habit_difficulty
        + 0.55 * seq_mean
        + 0.40 * seq_last
        - 0.18 * seq_std
        + 0.18 * recent_progress_mean * streak_strength
        + 0.12 * mood_proxy * energy_proxy
        + 0.08 * nudge_responsiveness * (1.0 - recent_miss_rate)
    )

    score = score + 0.08 * torch.randn(n_samples, generator=g)

    prob = torch.sigmoid((score - 0.95) * 3.6)
    labels = torch.bernoulli(prob, generator=g)

    # Small label corruption
    flip_mask = torch.rand(n_samples, generator=g) < 0.012
    labels[flip_mask] = 1.0 - labels[flip_mask]

    tabular_features = torch.stack(
        [
            recent_progress_mean,
            streak_strength,
            time_consistency,
            recent_miss_rate,
            mood_proxy,
            energy_proxy,
            nudge_responsiveness,
            weekend_effect,
        ],
        dim=1,
    ).float()

    targets = labels.unsqueeze(1).float()

    return tabular_features, sequence.float(), targets


def get_dataloaders(
    tabular_x: torch.Tensor,
    sequence_x: torch.Tensor,
    y: torch.Tensor,
    batch_size: int = 512,
    val_split_ratio: float = 0.2,
    seed: int = 42,
):
    dataset = TensorDataset(tabular_x, sequence_x, y)

    val_size = int(len(dataset) * val_split_ratio)
    train_size = len(dataset) - val_size

    generator = torch.Generator().manual_seed(seed)
    train_dataset, val_dataset = random_split(
        dataset,
        [train_size, val_size],
        generator=generator,
    )

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


def evaluate_classification(
    model: torch.nn.Module,
    dataloader,
    device: torch.device,
    threshold: float = 0.5,
):
    criterion = torch.nn.BCELoss()

    model.eval()
    running_loss = 0.0
    correct = 0
    total = 0

    with torch.no_grad():
        for batch_tabular, batch_sequence, batch_y in dataloader:
            batch_tabular = batch_tabular.to(device, non_blocking=True)
            batch_sequence = batch_sequence.to(device, non_blocking=True)
            batch_y = batch_y.to(device, non_blocking=True)

            outputs = model(batch_tabular, batch_sequence)
            loss = criterion(outputs, batch_y)

            running_loss += loss.item() * batch_tabular.size(0)

            preds = (outputs >= threshold).float()
            correct += (preds == batch_y).sum().item()
            total += batch_y.numel()

    avg_loss = running_loss / total if total else 0.0
    accuracy = correct / total if total else 0.0
    return avg_loss, accuracy
