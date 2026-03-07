import torch
import pandas as pd
import os

def load_csv_features(csv_path, feature_columns):
    """
    Load features from CSV file as a torch tensor.
    """
    df = pd.read_csv(csv_path)
    X = torch.tensor(df[feature_columns].values.astype('float32'))
    return df, X

def save_model(model, path="backend/ml/models/habit_predictor.pt"):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    torch.save(model.state_dict(), path)

def load_model(model_class, path="backend/ml/models/habit_predictor.pt", device=None, **kwargs):
    device = device or torch.device("cuda" if torch.cuda.is_available() else "cpu")
    model = model_class(**kwargs).to(device)
    model.load_state_dict(torch.load(path, map_location=device))
    model.eval()
    return model
