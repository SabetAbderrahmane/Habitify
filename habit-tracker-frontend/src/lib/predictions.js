import { api } from "./api";

export async function fetchLapseRisk() {
  const res = await api.get("/predictions/lapse-risk");
  return res.data;
}
