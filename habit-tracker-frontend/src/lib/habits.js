import { api } from "./api";

export async function fetchHabits() {
  const res = await api.get("/habits/");
  return res.data;
}

export async function fetchHabitNames() {
  const res = await api.get("/habits/names");
  return res.data;
}

export async function createHabit(habit) {
  // backend auto-updates if same name+date exists
  const res = await api.post("/habits/", habit);
  return res.data;
}

export async function updateHabit(habitId, patch) {
  const res = await api.patch(`/habits/${habitId}`, patch);
  return res.data;
}

export async function deleteHabit(habitId) {
  const res = await api.delete(`/habits/${habitId}`);
  return res.data;
}
