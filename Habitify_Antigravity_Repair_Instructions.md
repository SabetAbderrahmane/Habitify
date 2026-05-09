# Habitify Repair Instructions for Antigravity

## Project

**Repository:** `https://github.com/SabetAbderrahmane/Habitify`  
**Project title:** Design and Implementation of an AI-Powered Personal Habit Tracker Web Application  
**Approved stack:** React frontend + FastAPI backend + SQLite database + Python ML module  
**Important update:** React and FastAPI are now approved. Do **not** rebuild this project in Streamlit. The old proposal mentioned Streamlit, but the current thesis direction is approved around the existing React/FastAPI architecture.

---

## 0. Operating Rules

You are fixing an existing thesis MVP, not rebuilding from scratch.

### Non-negotiable rules

1. Preserve the existing React + FastAPI architecture.
2. Do not replace the project with Streamlit.
3. Do not introduce unnecessary frameworks.
4. Do not break existing user flows unless the current implementation is genuinely broken.
5. Use the actual repository structure as the source of truth.
6. Keep the project simple enough for a final-year thesis demo.
7. Every change must be runnable locally.
8. Every changed feature must include a short verification step.
9. Prioritize correctness over visual polish.
10. Do not make fake AI claims. If the feature is rule-based, call it rule-based. If ML is used, connect it properly.

---

## 1. Current High-Level Repo State

The repo currently has:

```text
Habitify/
  backend/
    api/
    ml/
    __init__.py
    db.py
    main.py
    models.py

  habit-tracker-frontend/
    public/
    src/
      components/
      context/
      layouts/
      lib/
      pages/
    package.json
    vite.config.js
    tailwind.config.js
    postcss.config.js
    index.html
```

### Current backend

- Framework: FastAPI
- Database: SQLite through raw `sqlite3`
- Auth: email/password + JWT
- Routers include:
  - auth
  - habit
  - checkin
  - recovery
  - content
  - profile
  - nudges
  - notifications
- ML folder exists but is not properly integrated into app routes.

### Current frontend

- Framework: React
- Tooling should be Vite
- UI includes:
  - Auth page
  - Dashboard
  - Calendar
  - Insights
  - Settings
  - Habit library
  - Recommended habits
  - Core habits
  - Recovery
  - Daily check-in
  - Notifications

---

## 2. Main Problems to Fix

### Critical

1. Backend dependencies are not clearly declared.
2. JWT secret is hardcoded in multiple files.
3. AI/ML prediction is not connected to the backend/frontend user flow.
4. `habit_logs` is being used as both habit definition and habit log.
5. Frontend has mixed Create React App and Vite leftovers.
6. Tests are stale or missing.
7. Export report feature is missing.
8. Thesis-facing claims need to match real implementation.

### High

1. SQLite foreign keys are not explicitly enabled.
2. `init_db()` should close its connection.
3. Input validation is weak.
4. Frontend API base URL is hardcoded.
5. Notifications are in-app notifications, not real scheduled push/email notifications.
6. Rule-based insights are labeled too strongly as AI.

---

## 3. Required Repair Phases

Follow these phases in order. Do not jump directly into UI polish while backend/data/AI are broken.

---

# Phase 1 — Stabilize Local Run and Configuration

## Goal

Make the project installable, runnable, and understandable from a clean clone.

---

## Task 1.1 — Add backend dependency file

### Problem

There is no reliable backend dependency declaration.

### Create

```text
backend/requirements.txt
```

### Include only required dependencies

Likely minimum:

```text
fastapi
uvicorn[standard]
pydantic[email]
passlib
PyJWT
torch
python-dotenv
```

If the project imports other libraries, add them only after verifying actual imports.

### Acceptance criteria

From `backend/`, this works:

```bash
python -m venv .venv
# Windows PowerShell:
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn main:app --reload
```

---

## Task 1.2 — Add environment configuration

### Problem

Auth secret is hardcoded in:

```text
backend/api/auth.py
backend/api/deps.py
```

### Create

```text
backend/config.py
backend/.env.example
```

### Required config values

```env
SECRET_KEY=replace-this-with-a-long-random-secret
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_HOURS=12
DATABASE_PATH=habitify.db
CORS_ORIGINS=http://localhost:5173,http://127.0.0.1:5173
```

### Update

```text
backend/api/auth.py
backend/api/deps.py
backend/main.py
backend/db.py
```

### Required behavior

- `SECRET_KEY` must be loaded from environment.
- `auth.py` and `deps.py` must import from the same config source.
- If `SECRET_KEY` is missing, backend should fail loudly in development.
- CORS origins should come from config, not hardcoded list.

### Acceptance criteria

- Signup/login still work.
- Token created by login is accepted by protected endpoints.
- Changing `SECRET_KEY` invalidates old tokens.

---

## Task 1.3 — Clean frontend tooling

### Problem

Frontend mixes Vite and Create React App remnants.

### Keep

```text
habit-tracker-frontend/src/main.jsx
habit-tracker-frontend/src/App.jsx
habit-tracker-frontend/vite.config.js
```

### Remove or archive if unused

```text
habit-tracker-frontend/src/App.js
habit-tracker-frontend/src/index.js
habit-tracker-frontend/src/App.test.js
habit-tracker-frontend/src/reportWebVitals.js
habit-tracker-frontend/src/setupTests.js
```

Only remove after confirming Vite uses `main.jsx`.

### Update

```text
habit-tracker-frontend/package.json
habit-tracker-frontend/README.md
```

### Package cleanup

Remove Create React App dependency if unused:

```json
"react-scripts": "^0.0.0"
```

The scripts should be Vite-only:

```json
{
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview"
  }
}
```

### Acceptance criteria

From `habit-tracker-frontend/`, this works:

```bash
npm install
npm run dev
npm run build
```

---

## Task 1.4 — Add root README

### Create

```text
README.md
```

### Must include

1. Project overview
2. Approved stack
3. Folder structure
4. Backend setup
5. Frontend setup
6. Environment variables
7. How to run demo
8. Current AI status
9. Thesis feature checklist
10. Known limitations

### Important wording

Do not say the app is fully AI-powered unless ML prediction is actually integrated.

Use this wording:

> Habitify combines rule-based habit insights with an experimental ML-based lapse prediction module.

---

# Phase 2 — Fix Database and Core Habit Architecture

## Goal

Separate habit definitions from habit logs so the app has a correct data model.

---

## Task 2.1 — Enable SQLite foreign keys

### Update

```text
backend/db.py
```

### Required behavior

Inside `get_connection()`:

```python
conn.execute("PRAGMA foreign_keys = ON")
```

### Acceptance criteria

Foreign key constraints are active for every connection.

---

## Task 2.2 — Close DB connection in `init_db()`

### Problem

`init_db()` opens a connection but does not clearly close it.

### Update

```text
backend/db.py
```

### Required behavior

Use `try/finally`:

```python
conn = get_connection()
try:
    ...
    conn.commit()
finally:
    conn.close()
```

### Acceptance criteria

Backend starts without leaked SQLite connections.

---

## Task 2.3 — Separate `habits` from `habit_logs`

### Current problem

The current `habit_logs` table stores:

```text
id
user_id
name
progress
date
```

This means the system does not have a true habit definition table.

### Required new structure

Add a real `habits` table:

```sql
CREATE TABLE IF NOT EXISTS habits (
    id TEXT PRIMARY KEY,
    user_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    category TEXT NOT NULL DEFAULT '',
    target TEXT NOT NULL DEFAULT 'Daily',
    frequency TEXT NOT NULL DEFAULT 'daily',
    archived INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, name),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
```

Update `habit_logs` to reference `habit_id`:

```sql
CREATE TABLE IF NOT EXISTS habit_logs (
    id TEXT PRIMARY KEY,
    habit_id TEXT NOT NULL,
    user_id INTEGER NOT NULL,
    progress INTEGER NOT NULL,
    date TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, habit_id, date),
    FOREIGN KEY (habit_id) REFERENCES habits(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
```

### Important migration note

The current app may already have logs. Add a safe migration path:

1. Create `habits` table.
2. For each distinct `(user_id, name)` in old `habit_logs`, create a habit.
3. Add new log rows connected to habit IDs.
4. Do not destroy existing user data.

Because SQLite migrations are awkward, a simple MVP migration function inside `db.py` is acceptable, but it must be deterministic and safe.

### Update likely files

```text
backend/db.py
backend/api/habit.py
habit-tracker-frontend/src/lib/habits.js
habit-tracker-frontend/src/context/HabitsContext.jsx
habit-tracker-frontend/src/pages/Dashboard.jsx
habit-tracker-frontend/src/components/AddHabitModal.jsx
habit-tracker-frontend/src/components/HabitCard.jsx
habit-tracker-frontend/src/components/StreakCalendar.jsx
habit-tracker-frontend/src/components/InsightsPanel.jsx
```

### Acceptance criteria

The app supports:

1. Create a habit definition.
2. Log daily progress for a habit.
3. Update a daily log.
4. Delete a daily log.
5. Archive or delete a habit definition.
6. Existing dashboard still renders.
7. Streak calendar still renders.
8. Insights still render.

---

# Phase 3 — Add Real Prediction Integration

## Goal

Make the AI/ML claim defensible by connecting prediction to real user data.

---

## Task 3.1 — Implement backend prediction route

### Current problem

`backend/api/predictions.py` is empty or not integrated.

### Update/create

```text
backend/api/predictions.py
backend/main.py
backend/ml/inference.py
```

### Route

```text
GET /predictions/lapse-risk
```

### Response example

```json
{
  "risk": 42,
  "risk_label": "Medium",
  "source": "ml",
  "confidence": 0.68,
  "features_used": [
    "recent_progress_mean",
    "miss_rate_14d",
    "streak_strength",
    "mood_proxy",
    "energy_proxy"
  ],
  "message": "Medium lapse risk detected. Complete a small version of one habit today."
}
```

### Required behavior

1. Extract features from the logged-in user's actual data:
   - recent progress average
   - recent progress standard deviation
   - miss rate over last 14 days
   - streak strength
   - mood proxy from check-ins
   - energy proxy from check-ins
   - had urges
   - check-in completion
   - weekend effect
   - nudge count
   - recovery event count
2. Try ML prediction if trained model file exists.
3. If model file does not exist, use rule-based fallback.
4. Response must expose whether result came from:
   - `"ml"`
   - `"rule_based_fallback"`
5. Do not crash if user has little/no history.
6. Register router in `backend/main.py`.

### Acceptance criteria

After login:

```bash
curl -H "Authorization: Bearer <TOKEN>" http://127.0.0.1:8000/predictions/lapse-risk
```

returns a valid prediction object.

---

## Task 3.2 — Fix PyTorch batch norm inference issue

### Problem

The model uses `BatchNorm1d`. Single-row inference can fail or behave badly unless the model is in eval mode.

### Required behavior

In inference:

```python
model.eval()
with torch.no_grad():
    ...
```

If single-user inference still causes batch norm issues, either:

1. keep model in eval mode, or
2. adjust architecture to avoid batch norm in inference-critical student MVP.

### Acceptance criteria

Prediction endpoint works for one logged-in user with one request.

---

## Task 3.3 — Connect frontend insights to prediction endpoint

### Create

```text
habit-tracker-frontend/src/lib/predictions.js
```

### Update

```text
habit-tracker-frontend/src/components/InsightsPanel.jsx
habit-tracker-frontend/src/pages/InsightsPage.jsx
habit-tracker-frontend/src/pages/Dashboard.jsx
```

### Required behavior

- Frontend loads prediction from backend.
- Shows loading/error/fallback state.
- Does not claim ML is active if backend says fallback.
- Existing rule-based insights can remain as supporting insights.

### UI wording

If source is ML:

> ML-based lapse risk estimate

If source is fallback:

> Rule-based lapse risk estimate

### Acceptance criteria

Dashboard and Insights page show backend prediction state.

---

## Task 3.4 — Add prediction history table

### Update

```text
backend/db.py
backend/api/predictions.py
```

### Add table

```sql
CREATE TABLE IF NOT EXISTS prediction_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    risk INTEGER NOT NULL,
    risk_label TEXT NOT NULL,
    source TEXT NOT NULL,
    confidence REAL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
```

### Acceptance criteria

Every prediction request stores a prediction record.

---

# Phase 4 — Improve Validation and Reliability

## Goal

Stop bad data from entering the system.

---

## Task 4.1 — Use strict date validation

### Update

```text
backend/api/habit.py
backend/api/checkin.py
```

### Required behavior

Use `datetime.date` in Pydantic models instead of raw strings.

### Acceptance criteria

Invalid date strings return a 422 validation error.

---

## Task 4.2 — Add enums/literals for fixed values

### Update

```text
backend/api/checkin.py
backend/api/profile.py
backend/api/recovery.py
```

### Validate

Mood:

```text
Great, Good, Medium, Low, Bad
```

Energy:

```text
High, Medium, Low
```

Goal:

```text
focus, fitness, sleep, energy, mental, discipline
```

Recovery habit keys:

```text
smoking, sleep_late, alcohol, doomscrolling
```

### Acceptance criteria

Invalid strings are rejected by the API.

---

## Task 4.3 — Improve frontend API config

### Update

```text
habit-tracker-frontend/src/lib/api.js
habit-tracker-frontend/.env.example
```

### Required behavior

Use Vite env:

```js
baseURL: import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000"
```

### Add

```env
VITE_API_BASE_URL=http://127.0.0.1:8000
```

### Acceptance criteria

Frontend still talks to backend locally.

---

# Phase 5 — Export Feature

## Goal

Satisfy thesis requirement for exportable progress reports.

---

## Task 5.1 — Add frontend PDF export

### Recommended simple MVP approach

Use frontend export instead of backend report generation to avoid overengineering.

### Add dependency

Use a simple, common approach such as:

```text
jspdf
html2canvas
```

or another small dependency if already present.

### Update likely files

```text
habit-tracker-frontend/package.json
habit-tracker-frontend/src/pages/InsightsPage.jsx
habit-tracker-frontend/src/components/ExportReportButton.jsx
```

### Export should include

1. User habit summary
2. Total habit logs
3. Average progress
4. Current lapse risk
5. Streak calendar screenshot or summary
6. Generated date

### Acceptance criteria

User can click “Export Report” and download a PDF.

---

# Phase 6 — Testing

## Goal

Add minimum tests so the project is not academically embarrassing.

---

## Task 6.1 — Add backend tests

### Add

```text
backend/tests/
```

Use `pytest` and FastAPI test client.

### Test minimum

1. Signup works.
2. Login works.
3. Protected route rejects missing token.
4. Create habit works.
5. Log habit progress works.
6. Check-in works.
7. Prediction endpoint returns valid response.

### Acceptance criteria

From backend:

```bash
pytest
```

passes.

---

## Task 6.2 — Replace stale frontend test

### Remove stale test

```text
habit-tracker-frontend/src/App.test.js
```

It currently tests for old Create React App content and is useless.

### Add useful tests only if frontend test setup is already practical

Test minimum:

1. Auth page renders.
2. Protected route redirects without token.
3. Dashboard empty state renders with mocked context.

### Acceptance criteria

Frontend tests do not check for old starter-template content.

---

# Phase 7 — Thesis and Demo Alignment

## Goal

Make the software and thesis tell the same truth.

---

## Required thesis framing

Use this architecture description:

> The system was implemented as a full-stack web application using React for the client interface and FastAPI for backend services. SQLite was used for lightweight local persistence suitable for a thesis prototype. The personalization layer combines rule-based nudges with an experimental PyTorch-based lapse prediction module.

### Do not say

- “The application was developed using Streamlit.”
- “The model accurately predicts lapses in real-world users.”
- “The AI system is fully autonomous.”
- “The application is production-ready.”
- “The notifications are real push notifications.”

### Safe wording

- “prototype”
- “experimental prediction module”
- “rule-based fallback”
- “simulated/persona-based data”
- “local SQLite persistence”
- “browser-accessible full-stack web application”

---

## 8. Final Acceptance Checklist

The project is considered repaired when the following are true:

### Setup

- [ ] Backend has `requirements.txt`.
- [ ] Frontend is clean Vite, not mixed CRA/Vite.
- [ ] Root README explains how to run everything.
- [ ] `.env.example` files exist.

### Backend

- [ ] JWT secret is loaded from env.
- [ ] SQLite foreign keys are enabled.
- [ ] DB connections are closed.
- [ ] Habit definitions are separated from habit logs.
- [ ] Input validation rejects bad dates/enums.
- [ ] Prediction endpoint exists.
- [ ] Prediction endpoint uses ML if model exists.
- [ ] Prediction endpoint uses rule-based fallback if model is unavailable.

### Frontend

- [ ] API base URL uses Vite env.
- [ ] Dashboard still works.
- [ ] Insights page shows backend prediction.
- [ ] UI distinguishes ML from rule-based fallback.
- [ ] Export report button works.
- [ ] Stale CRA files are removed.

### Testing

- [ ] Backend tests cover auth, habits, check-ins, predictions.
- [ ] Frontend has no stale starter tests.
- [ ] Manual QA flow is documented.

### Thesis defense

- [ ] Thesis matches React/FastAPI implementation.
- [ ] AI limitations are stated honestly.
- [ ] Synthetic/persona data is explained clearly.
- [ ] Evaluation plan includes usability + performance + prediction evaluation.
- [ ] Screenshots/diagrams can be generated from the repaired app.

---

## 9. Suggested Commit Order

Use small commits:

```text
1. chore: add backend requirements and env config
2. chore: clean frontend vite setup
3. fix: centralize jwt config and cors settings
4. fix: enforce sqlite foreign keys and close db connections
5. refactor: separate habit definitions from habit logs
6. feat: add lapse prediction endpoint with fallback
7. feat: connect frontend insights to prediction endpoint
8. feat: add report export
9. test: add backend auth and habit tests
10. docs: add root setup and thesis-alignment README
```

---

## 10. Do Not Do These

Do not:

1. Rebuild in Streamlit.
2. Replace SQLite with PostgreSQL unless explicitly requested.
3. Add Docker unless local setup is already stable.
4. Add OAuth.
5. Add payment/subscription logic.
6. Add a mobile app.
7. Over-polish UI while backend/AI is fake.
8. Claim real AI accuracy from simulated data.
9. Delete user data without migration.
10. Rename every API route unless frontend is updated consistently.

---

## 11. Best Next Step

Start with this exact sequence:

```text
1. Add backend/requirements.txt
2. Add backend/config.py and backend/.env.example
3. Replace hardcoded JWT/CORS config
4. Clean frontend package.json into Vite-only
5. Add root README
```

Do not touch the ML model or schema until the project runs cleanly.
