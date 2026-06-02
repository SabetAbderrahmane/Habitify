# Habitify Manual QA Checklist

Use this when you need screenshots or defense evidence. Automated tests do not replace this.

## Backend startup

- [ ] `uvicorn main:app --reload --host 127.0.0.1 --port 8000` starts without crashing.
- [ ] Visiting `http://127.0.0.1:8000/` returns the welcome JSON.
- [ ] No `SECRET_KEY` crash after `.env` exists.

## Auth flow

- [ ] Signup with valid email/password succeeds.
- [ ] Signup with weak password fails.
- [ ] Login with valid credentials succeeds.
- [ ] Login with wrong password fails.
- [ ] Protected pages redirect unauthenticated users.
- [ ] Logout clears session and returns to auth screen.

## Habit management

- [ ] Create habit.
- [ ] Duplicate habit name is rejected.
- [ ] Edit habit.
- [ ] Archive habit.
- [ ] Include archived habits view still shows archived habit.
- [ ] Delete habit.

## Logging and dashboard

- [ ] Log today’s progress.
- [ ] Update the same day’s progress and confirm it upserts, not duplicates.
- [ ] Calendar page shows logged days.
- [ ] Insights page reflects habit history.

## AI/prediction

- [ ] Prediction page/section returns lapse-risk data.
- [ ] If ML model weights are missing, backend returns `source: rule_based_fallback` instead of crashing.
- [ ] Prediction factors are understandable.

## Check-in and nudges

- [ ] Save daily check-in.
- [ ] Edit same-day check-in.
- [ ] Nudges page/section loads.
- [ ] Notifications generate and dismiss correctly.

## Recovery

- [ ] Recovery plan opens for `smoking`.
- [ ] Relapse event can be logged.
- [ ] Survived urge can be logged.
- [ ] Recovery stats update.

## Export

- [ ] Export downloads JSON.
- [ ] Export contains current user email.
- [ ] Export contains logs/checkins/recovery/notifications where applicable.

## Responsiveness

Take screenshots at:

- [ ] Desktop width: 1440px
- [ ] Tablet width: 768px
- [ ] Mobile width: 390px

Critical mobile checks:

- [ ] Auth form does not overflow.
- [ ] Sidebar/navigation is usable.
- [ ] Dashboard cards stack cleanly.
- [ ] Charts do not break the layout.
- [ ] Forms remain tappable.

## Stress evidence to keep

After running stress tests, save:

- [ ] `reports/stress_summary.json`
- [ ] `reports/stress_results.csv`
- [ ] `reports/charts/latency_by_endpoint.png`
- [ ] `reports/charts/status_distribution.png`
- [ ] terminal screenshot showing test command + summary
