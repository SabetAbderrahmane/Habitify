# Frontend Template Alignment Report

Source of truth: `design/stitch_ai_habit_tracker_redesign/` screen PNGs, with `code.html` used only as layout/style reference.

Global alignment:
- Normalized the light theme tokens to the Stitch palette: off-white app background, white cards, dark neutral text, slate muted text, deep indigo primary, light neutral borders, and subtle shadows.
- Removed old dark/glass modal drift from shared dialogs, toasts, and recovery interruption UI.
- Remaining `text-white` usage is intentional on indigo/red buttons, avatar/icon badges, or the dark AI calibration module shown in the Stitch insights reference.
- Backend contracts and data shapes were not changed.

## dashboard_overview / daily_check_in

Matched React files:
- `habit-tracker-frontend/src/pages/Dashboard.jsx`
- `habit-tracker-frontend/src/pages/DailyCheckinPage.jsx`
- `habit-tracker-frontend/src/layouts/AppShell.jsx`

Changed:
- Replaced the previous cockpit/stat-heavy dashboard with the Stitch-centered completion experience: compact top actions, circular completion indicator, large progress phrase, short subtitle, and Today’s Focus rows.
- Habit rows now follow the reference treatment: completed rows use soft green, incomplete rows use white cards, small circular icons are left aligned, and the Log button stays on the right.
- Daily Check-in now shares the same visual rhythm before the existing reflection form.
- Sidebar now uses the fixed light HabitSphere-style structure with compact navigation, proper active route matching via `useLocation()`, and bottom profile/settings/logout actions.

Still differs:
- Text counts and task names come from real habit definitions/logs, so the screenshot phrase may be `0 down, 0 to go.` or another real value instead of the static Stitch sample.
- The sidebar keeps HabitSphere as the single visible brand, while routes remain the existing Habitify app routes.

Intentional:
- Dashboard avoids fake sample habits and does not hardcode the Stitch numbers.

## habit_analytics

Matched React files:
- `habit-tracker-frontend/src/pages/HabitDetail.jsx`
- `habit-tracker-frontend/src/components/StreakCalendar.jsx`

Changed:
- Rebuilt the detail page around the Stitch analytics proportions: back link, title/category pill, four compact stat cards, left Activity Map, right AI Pattern Analysis and Lapse Risk, then lower 30-Day Completion Trend.
- The activity map now supports compact and expanded modes. Detail pages use compact mode so the map no longer stretches into a giant full-width calendar.
- Stat and chart values are computed from real logs and lapse-risk responses.

Still differs:
- Edit/Delete actions operate on existing log-level behavior instead of adding a new backend habit-definition mutation.
- Chart bars reflect real logged data volume and may be visually sparse for users with few logs.

Intentional:
- No backend API was added just to mimic unavailable static sample states.

## habit_library

Matched React file:
- `habit-tracker-frontend/src/pages/HabitLibrary.jsx`

Changed:
- Aligned the page to the Stitch library reference with title/subtitle, filter chips, search/sort control card, and consistent light habit cards.
- Each card shows category pill, current streak, completion, last log, View Details, and Quick Log.

Still differs:
- Category filters are generated from real habit categories. Empty or unusual backend categories can change the exact filter set.

Intentional:
- The card list remains data-driven and does not inject Stitch sample habits.

## ai_wellness_insights

Matched React files:
- `habit-tracker-frontend/src/pages/InsightsPage.jsx`
- `habit-tracker-frontend/src/components/InsightsPanel.jsx`

Changed:
- Reworked the page toward the Stitch Cognitive Insights layout: top search/action bar, compact status pill, large AI insight module, velocity trend card, optional context card, and dark calibration module.
- Lapse risk and recommendation copy use the real `/predictions/lapse-risk` response.
- Confidence is displayed only when backend data includes it.
- Sleep/weather/context cards are hidden unless real context correlation data is returned.

Still differs:
- The exact AI copy varies with the backend response and available logs.

Intentional:
- The dark calibration module keeps white text because it is on a dark surface in the Stitch reference.

## create_new_habit

Matched React file:
- `habit-tracker-frontend/src/components/AddHabitModal.jsx`

Changed:
- Rebuilt the modal as a clean centered/full-screen light creation flow with grouped fields, indigo CTA, live preview card, and template options.
- Removed old dark/glass modal styling while preserving favorites, templates, and quick-log behavior.

Still differs:
- The modal is still invoked from existing React flows rather than becoming a standalone route.

Intentional:
- Existing add-habit API behavior is preserved.

## shared components and remaining pages

Matched React files:
- `habit-tracker-frontend/src/components/ConfirmDialog.jsx`
- `habit-tracker-frontend/src/components/EditHabitModal.jsx`
- `habit-tracker-frontend/src/components/ToastProvider.jsx`
- `habit-tracker-frontend/src/components/UrgeActionModal.jsx`
- `habit-tracker-frontend/src/pages/RecoveryPage.jsx`
- `habit-tracker-frontend/src/pages/RecommendedPage.jsx`
- `habit-tracker-frontend/src/pages/CoreHabitsPage.jsx`
- `habit-tracker-frontend/src/pages/Auth.jsx`

Changed:
- Dialogs, toasts, and recovery modal now use light cards, dark readable text, subtle borders, and token-based CTA colors.
- Recovery and Recommended retain their existing functionality while using readable pill states and solid indigo actions.
- Legacy cyan/fuchsia gradients and dark/glass leftovers were replaced where they were not part of the Stitch source.

Still differs:
- Some routes are not represented by a Stitch screen, so their layout was only brought into the same token/style system rather than fully restructured.

Intentional:
- White text remains only on dark, red, or indigo surfaces where contrast is appropriate.
