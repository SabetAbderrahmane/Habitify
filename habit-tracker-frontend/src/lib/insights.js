import { api } from "./api";

export async function fetchWellnessInsights() {
  const res = await api.get("/insights/wellness");
  return res.data;
}
