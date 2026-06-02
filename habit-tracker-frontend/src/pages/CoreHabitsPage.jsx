// src/pages/CoreHabitsPage.jsx

import { useEffect, useMemo, useState } from "react";
import { fetchCoreHabits } from "../lib/content";
import { useToast } from "../components/ToastProvider";
import { useHabits } from "../context/HabitsContext";

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function wasMissedTwoDays(logs, habitName) {
  const today = new Date();
  const targetDates = [];

  for (let i = 1; i <= 2; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    targetDates.push(d.toISOString().slice(0, 10));
  }

  return targetDates.every((date) => {
    return !logs.some(
      (h) =>
        h.name === habitName &&
        h.date === date &&
        Number(h.progress || 0) > 0
    );
  });
}

export default function CoreHabitsPage() {
  const { habitLogs, addHabit, refreshData } = useHabits();
  const toast = useToast();

  const [busyName, setBusyName] = useState("");
  const [coreHabits, setCoreHabits] = useState([]);

  useEffect(() => {
    (async () => {
      try {
        const data = await fetchCoreHabits();
        setCoreHabits(Array.isArray(data) ? data : []);
      } catch (e) {
        toast.error("Failed to load core habits", e?.message || "Unknown error");
        setCoreHabits([]);
      }
    })();
  }, [toast]);

  const statusMap = useMemo(() => {
    const map = new Map();
    const today = todayISO();

    coreHabits.forEach((habit) => {
      const todayEntry = habitLogs.find(
        (h) => h.name === habit.name && h.date === today
      );

      const missed2 = wasMissedTwoDays(habitLogs, habit.name);

      map.set(habit.name, {
        todayProgress: todayEntry ? Number(todayEntry.progress || 0) : 0,
        missed2,
      });
    });

    return map;
  }, [coreHabits, habitLogs]);

  const quickLog = async (habit) => {
    setBusyName(habit.name);

    try {
      await addHabit({
        name: habit.name,
        category: habit.category || "Health",
        target: habit.target || "Daily",
        frequency: "daily",
        progress: 100,
        date: todayISO(),
      });

      await refreshData();

      toast.success("Core habit completed", habit.name);
    } catch (e) {
      toast.error("Could not log habit", e?.message || "Unknown error");
    } finally {
      setBusyName("");
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-semibold text-[var(--color-text-primary)]">Core Habits</h1>
        <p className="mt-2 text-[var(--color-text-secondary)]">
          Your daily essentials. These are the habits that keep your foundation strong.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {coreHabits.map((habit) => {
          const status = statusMap.get(habit.name);

          return (
            <div
              key={habit.name}
              className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-[0_4px_20px_rgba(15,23,42,0.05)] transition hover:-translate-y-0.5 hover:shadow-[0_10px_28px_rgba(15,23,42,0.08)]"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-lg font-semibold text-[var(--color-text-primary)]">{habit.name}</div>
                  <div className="mt-2 text-sm leading-6 text-[var(--color-text-secondary)]">
                    {habit.description}
                  </div>
                </div>

                <span className="rounded-xl bg-indigo-50 px-3 py-1 text-xs font-semibold text-[var(--color-accent)] ring-1 ring-indigo-100">
                  Must-do
                </span>
              </div>

              <div className="mt-5 grid grid-cols-3 gap-2 text-sm text-[var(--color-text-secondary)]">
                <div>
                  <div className="text-xs text-[var(--color-text-muted)]">Category</div>
                  <div className="font-semibold text-[var(--color-text-primary)]">{habit.category}</div>
                </div>

                <div>
                  <div className="text-xs text-[var(--color-text-muted)]">Target</div>
                  <div className="font-semibold text-[var(--color-text-primary)]">{habit.target}</div>
                </div>

                <div>
                  <div className="text-xs text-[var(--color-text-muted)]">Today</div>
                  <div className="font-semibold text-[var(--color-text-primary)]">
                    {status?.todayProgress || 0}%
                  </div>
                </div>
              </div>

              {status?.missed2 ? (
                <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                  Friendly reminder: you missed this for 2 days. A small comeback
                  today matters.
                </div>
              ) : null}

              <button
                onClick={() => quickLog(habit)}
                disabled={busyName === habit.name}
                className="mt-5 w-full rounded-xl bg-gradient-to-r from-cyan-400 via-fuchsia-400 to-indigo-400 px-4 py-2 text-sm font-semibold text-black disabled:opacity-60"
                type="button"
              >
                {busyName === habit.name ? "Logging..." : "Complete Today"}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
