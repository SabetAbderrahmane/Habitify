import { api } from "./api";

export async function fetchAnalyticsDashboard() {
  const res = await api.get("/analytics/dashboard");
  return res.data;
}

export async function fetchHabitAnalytics(habitId) {
  const res = await api.get(`/analytics/habits/${habitId}`);
  return res.data;
}

export async function fetchHabitLibraryStats(includeArchived = true) {
  const res = await api.get("/analytics/habit-library", {
    params: { include_archived: includeArchived },
  });
  return res.data;
}

export async function fetchContextCorrelations() {
  const res = await api.get("/analytics/context-correlations");
  return res.data;
}
