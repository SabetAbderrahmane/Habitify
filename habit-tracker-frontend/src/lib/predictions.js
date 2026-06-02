import { api } from "./api";

export async function fetchLapseRisk() {
  const res = await api.get("/predictions/lapse-risk");
  return res.data;
}

export async function fetchModelInfo() {
  const res = await api.get("/predictions/model-info");
  return res.data;
}
