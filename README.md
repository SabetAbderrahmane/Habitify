# Habitify - AI-Powered Personal Habit Tracker

Habitify is a modern, AI-powered habit tracking web application designed as a thesis prototype. It combines rule-based insights with experimental ML-based lapse prediction to help users maintain consistency and recover from setbacks.

## Approved Stack

- **Frontend**: React (Vite)
- **Backend**: FastAPI (Python)
- **Database**: SQLite
- **ML/AI**: PyTorch (Lapse Prediction)

## Folder Structure

- `habit-tracker-frontend/`: React frontend application.
- `backend/`: FastAPI backend API and database modules.
- `backend/ml/`: Machine Learning module for lapse prediction.

## Backend Setup

1. Navigate to the `backend` folder:
   ```bash
   cd backend
   ```

3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
5. Run the API:
   ```bash
   uvicorn main:app --reload
   ```

## Frontend Setup

1. Navigate to the `habit-tracker-frontend` folder:
   ```bash
   cd habit-tracker-frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Run the development server:
   ```bash
   npm run dev
   ```

## AI Status

Habitify combines rule-based habit insights with an experimental ML-based lapse prediction module.

## Thesis Feature Checklist

- [x] User Authentication (JWT)
- [x] Habit Creation and Logging
- [x] Daily Check-ins (Mood, Energy, Urges)
- [x] Real-time Nudges and Notifications
- [x] AI-based Lapse Prediction (Experimental)
- [x] Interactive Dashboard and Insights
- [ ] Progress Report Export (Coming soon)

## Known Limitations

- This is a thesis prototype, not a production-ready application.
- Notifications are currently in-app notifications.
- The ML model is experimental and trained on simulated persona data.
