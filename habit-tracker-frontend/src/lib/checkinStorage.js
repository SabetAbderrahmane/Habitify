const KEY = "habitify:daily-checkins";

function readAll() {
  try {
    const raw = localStorage.getItem(KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function writeAll(data) {
  localStorage.setItem(KEY, JSON.stringify(data));
}

export function getTodayKey() {
  return new Date().toISOString().slice(0, 10);
}

export function getCheckin(dateKey = getTodayKey()) {
  const all = readAll();
  return (
    all[dateKey] || {
      mood: "",
      energy: "",
      hadUrges: false,
      difficult: "",
      note: "",
      completed: false,
    }
  );
}

export function saveCheckin(dateKey, payload) {
  const all = readAll();
  all[dateKey] = {
    ...getCheckin(dateKey),
    ...payload,
  };
  writeAll(all);
  return all[dateKey];
}
