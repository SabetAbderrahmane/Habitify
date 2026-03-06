import { api } from "./api";

export async function fetchCheckin(date) {
  const res = await api.get(`/checkins/${date}`);
  return res.data;
}

export async function saveCheckin(payload) {
  const res = await api.post("/checkins", payload);
  return res.data;
}
