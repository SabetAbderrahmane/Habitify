import { api } from "./api";

// --- Habit Definitions ---

export async function fetchHabitDefinitions(includeArchived = false) {
  const res = await api.get(`/habits/?include_archived=${includeArchived}`);
  return res.data;
}

export async function createHabitDefinition(habit) {
  const res = await api.post("/habits/", habit);
  return res.data;
}

export async function updateHabitDefinition(habitId, patch) {
  const res = await api.patch(`/habits/${habitId}`, patch);
  return res.data;
}

export async function deleteHabitDefinition(habitId) {
  const res = await api.delete(`/habits/${habitId}`);
  return res.data;
}

// --- Habit Logs ---

export async function fetchHabitLogs(date = null, habitId = null) {
  const params = {};
  if (date) params.date = date;
  if (habitId) params.habit_id = habitId;
  
  const res = await api.get("/habits/logs", { params });
  return res.data;
}

export async function logHabitProgress(habitId, progress, date) {
  const res = await api.post("/habits/logs", {
    habit_id: habitId,
    progress: parseInt(progress),
    date
  });
  return res.data;
}

export async function deleteHabitLog(logId) {
  const res = await api.delete(`/habits/logs/${logId}`);
  return res.data;
}

export async function fetchAllHabitLogs() {
  const res = await api.get("/habits/logs");
  return res.data;
}

export async function fetchHabitNames() {
  const defs = await fetchHabitDefinitions();
  return [...new Set(defs.map(d => d.name))];
}

// Legacy Aliases for gradual migration and fixed breakage
export const fetchHabits = fetchHabitDefinitions;
export const createHabit = createHabitDefinition;
export const updateHabit = updateHabitDefinition;
export const deleteHabit = deleteHabitDefinition;
export const fetchHabitDefinitionLogs = fetchHabitLogs; // Mapping to new logs fetcher
