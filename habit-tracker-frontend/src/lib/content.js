import { api } from "./api";

export async function fetchRecommendedGoals() {
  const res = await api.get("/recommended/goals");
  return res.data;
}

export async function fetchRecommendedPack(goalKey) {
  const res = await api.get(`/recommended/packs/${goalKey}`);
  return res.data;
}

export async function fetchCoreHabits() {
  const res = await api.get("/core-habits");
  return res.data;
}
