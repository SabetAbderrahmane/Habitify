const KEY = "habitify:recovery-data";

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

export function getRecoveryData(habitKey) {
  const all = readAll();
  return (
    all[habitKey] || {
      relapses: [],
      survivedUrges: [],
      triggerCounts: {},
    }
  );
}

export function saveRecoveryData(habitKey, data) {
  const all = readAll();
  all[habitKey] = data;
  writeAll(all);
}

export function logRelapse(habitKey, trigger) {
  const data = getRecoveryData(habitKey);
  const now = new Date().toISOString();

  data.relapses.push(now);
  data.triggerCounts[trigger] = (data.triggerCounts[trigger] || 0) + 1;

  saveRecoveryData(habitKey, data);
  return data;
}

export function logSurvivedUrge(habitKey, trigger) {
  const data = getRecoveryData(habitKey);
  const now = new Date().toISOString();

  data.survivedUrges.push(now);
  data.triggerCounts[trigger] = (data.triggerCounts[trigger] || 0) + 1;

  saveRecoveryData(habitKey, data);
  return data;
}

export function getRecoveryStats(habitKey) {
  const data = getRecoveryData(habitKey);

  const relapseCount = data.relapses.length;
  const survivedCount = data.survivedUrges.length;

  let strongestTrigger = "—";
  let maxCount = 0;
  Object.entries(data.triggerCounts || {}).forEach(([trigger, count]) => {
    if (count > maxCount) {
      strongestTrigger = trigger;
      maxCount = count;
    }
  });

  // clean streak = days since last relapse
  let cleanStreak = 0;
  if (data.relapses.length === 0) {
    cleanStreak = survivedCount > 0 ? survivedCount : 0;
  } else {
    const lastRelapse = new Date(data.relapses[data.relapses.length - 1]);
    const now = new Date();
    const diffMs = now - lastRelapse;
    cleanStreak = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
  }

  return {
    relapseCount,
    survivedCount,
    strongestTrigger,
    cleanStreak,
  };
}
