import { api } from "./api";

export async function generateNotifications() {
  const res = await api.post("/notifications/generate");
  return res.data;
}

export async function fetchPendingNotifications() {
  const res = await api.get("/notifications/pending");
  return res.data;
}

export async function dismissNotification(id) {
  const res = await api.post(`/notifications/${id}/dismiss`);
  return res.data;
}

export async function fetchPendingNotificationsCount() {
  const res = await api.get("/notifications/unread-count");
  return res.data?.count ?? 0;
}
