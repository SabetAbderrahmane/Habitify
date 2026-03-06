import { api } from "./api";

export async function fetchOnboardingProfile() {
  const res = await api.get("/profile/onboarding");
  return res.data;
}

export async function saveOnboardingProfile(payload) {
  const res = await api.post("/profile/onboarding", payload);
  return res.data;
}
