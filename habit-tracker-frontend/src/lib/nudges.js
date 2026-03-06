import { api } from "./api";

export async function fetchTodayNudges() {
  const res = await api.get("/nudges/today");
  return res.data;
}
