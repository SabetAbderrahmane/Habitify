# Habitify Testing Pack

This folder is designed for the current GitHub repo shape:

```text
Habitify/
  backend/
    main.py
    config.py
    db.py
    api/
  habit-tracker-frontend/
    package.json
    src/
  habitify_testing_pack/   <-- place this whole folder here
```

This is not a generic testing folder. It targets the actual FastAPI + SQLite backend and the Vite/React frontend currently present in the repository.

## What this pack tests

### Backend automated tests

Covers:

- API health route
- signup/login/auth status
- missing/invalid token behavior
- habit create/list/update/delete
- habit log create/upsert/list/delete
- validation failures
- profile onboarding
- daily check-ins
- recovery plans, relapse, survived urge, stats
- recommended/core content endpoints
- nudges
- notifications generate/list/dismiss
- export endpoint
- lapse-risk prediction endpoint with rule-based fallback
- multi-user data isolation

### Stress and performance tests

Covers:

- concurrent signup/login/create habit/log check-in/prediction/export workflow
- p50/p95/max latency by endpoint
- success/error rate
- SQLite write-lock pressure under concurrent requests
- invalid-login pressure smoke test

### Frontend E2E smoke tests

Covers:

- `/auth` render
- signup/login form flow
- protected route redirect behavior
- main authenticated route smoke check

The frontend tests are intentionally smoke-level. Your UI has heavy visuals and weak selector discipline, so deep component tests would be brittle until you add stable `data-testid` attributes.

## Install backend test dependencies

From repo root:

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
pip install -r ../habitify_testing_pack/testing-requirements.txt
```

Windows PowerShell:

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
pip install -r ..\habitify_testing_pack\testing-requirements.txt
```

## Run backend automated tests

From repo root:

```bash
pytest habitify_testing_pack/backend_tests -q
```

Windows PowerShell:

```powershell
pytest .\habitify_testing_pack\backend_tests -q
```

These tests use a temporary SQLite database and set `SECRET_KEY` automatically. They do **not** touch your normal `backend/habitify.db`.

## Start the backend for stress tests

Create `backend/.env` if it does not exist:

```env
SECRET_KEY=local-test-secret-change-me
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_HOURS=12
DATABASE_PATH=habitify.db
CORS_ORIGINS=http://localhost:5173,http://127.0.0.1:5173
```

Start backend:

```bash
cd backend
uvicorn main:app --reload --host 127.0.0.1 --port 8000
```

## Run API stress test

Open a second terminal from repo root:

```bash
python habitify_testing_pack/stress/stress_api.py --base-url http://127.0.0.1:8000 --users 25 --concurrency 10 --loops 3
```

Windows PowerShell:

```powershell
python .\habitify_testing_pack\stress\stress_api.py --base-url http://127.0.0.1:8000 --users 25 --concurrency 10 --loops 3
```

Outputs:

```text
habitify_testing_pack/reports/stress_summary.json
habitify_testing_pack/reports/stress_results.csv
```

## Run security pressure smoke test

```bash
python habitify_testing_pack/stress/security_pressure.py --base-url http://127.0.0.1:8000 --attempts 100 --concurrency 20
```

This checks whether invalid login attempts are rejected consistently. It will also expose the current lack of rate limiting. That is a thesis/security weakness, not a script bug.

## Generate thesis charts from stress result

```bash
python habitify_testing_pack/tools/generate_charts.py
```

Outputs:

```text
habitify_testing_pack/reports/charts/latency_by_endpoint.png
habitify_testing_pack/reports/charts/status_distribution.png
```

## Run database integrity check

```bash
python habitify_testing_pack/tools/db_integrity_check.py --db backend/habitify.db
```

Use this after manual testing or stress testing to check row counts and SQLite foreign key integrity.

## Run frontend E2E smoke tests

Terminal 1, backend:

```bash
cd backend
uvicorn main:app --host 127.0.0.1 --port 8000
```

Terminal 2, frontend:

```bash
cd habit-tracker-frontend
npm install
npm run dev -- --host 127.0.0.1 --port 5173
```

Terminal 3, e2e tests:

```bash
cd habitify_testing_pack/frontend_e2e
npm install
npx playwright install chromium
npm test
```

## Brutal warning

The repo currently has no backend test dependencies in `backend/requirements.txt`, no pytest setup, and the frontend package has Vite scripts but no test script. This testing pack fixes the testing gap externally without pretending the repo is already test-ready.
