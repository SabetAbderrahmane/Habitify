import { api } from "./api";

export async function fetchRecoveryPlan(habitKey) {
  const res = await api.get(`/recovery/plans/${habitKey}`);
  return res.data;
}

export async function fetchRecoveryStats(habitKey) {
  const res = await api.get(`/recovery/stats/${habitKey}`);
  return res.data;
}

export async function logRecoveryRelapse(payload) {
  const res = await api.post("/recovery/relapse", payload);
  return res.data;
}

export async function logSurvivedUrge(payload) {
  const res = await api.post("/recovery/survived-urge", payload);
  return res.data;
}
