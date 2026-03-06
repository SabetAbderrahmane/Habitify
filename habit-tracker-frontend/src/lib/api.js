import axios from "axios";

export const api = axios.create({
  baseURL: "http://127.0.0.1:8000",
  timeout: 10000,
});

// Set token immediately on first load so refreshes do not race
const storedToken = localStorage.getItem("access_token");
if (storedToken) {
  api.defaults.headers.common.Authorization = `Bearer ${storedToken}`;
}

export function setAuthToken(token) {
  if (token) {
    api.defaults.headers.common.Authorization = `Bearer ${token}`;
  } else {
    delete api.defaults.headers.common.Authorization;
  }
}
