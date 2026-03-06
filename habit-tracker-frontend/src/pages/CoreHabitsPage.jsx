import { useMemo, useState } from "react";
import { coreHabits } from "../data/coreHabits";
import { createHabit } from "../lib/habits";
import { useToast } from "../components/ToastProvider";
import { useHabits } from "../context/HabitsContext";

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function wasMissedTwoDays(habits, habitName) {
  const today = new Date();
  const targetDates = [];

  for (let i = 1; i <= 2; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    targetDates.push(d.toISOString().slice(0, 10));
  }

  return targetDates.every((date) => {
    return !habits.some((h) => h.name === habitName && h.date === date && Number(h.progress || 0) > 0);
  });
}

export default function CoreHabitsPage() {
  const { habits, setHabits } = useHabits();
  const toast = useToast();
  const [busyName, setBusyName] = useState("");

  const statusMap = useMemo(() => {
    const map = new Map();

    coreHabits.forEach((habit) => {
      const today = todayISO();
      const todayEntry = habits.find((h) => h.name === habit.name && h.date === today);
      const missed2 = wasMissedTwoDays(habits, habit.name);

      map.set(habit.name, {
        todayProgress: todayEntry ? Number(todayEntry.progress || 0) : 0,
        missed2,
      });
    });

    return map;
  }, [habits]);

  const quickLog = async (habit) => {
    setBusyName(habit.name);

    try {
      const created = await createHabit({
        name: habit.name,
        progress: 100,
        date: todayISO(),
      });

      setHabits((prev) => {
        const filtered = prev.filter(
          (h) => !(h.name === created.name && h.date === created.date)
        );
        return [created, ...filtered];
      });

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
        <h1 className="text-3xl font-semibold">Core Habits</h1>
        <p className="mt-2 text-white/60">
          Your daily essentials. These are the habits that keep your foundation strong.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {coreHabits.map((habit) => {
          const status = statusMap.get(habit.name);

          return (
            <div
              key={habit.name}
              className="rounded-2xl bg-white/5 p-6 ring-1 ring-white/10 hover:bg-white/[0.07] transition"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-lg font-semibold">{habit.name}</div>
                  <div className="mt-2 text-sm text-white/60">{habit.description}</div>
                </div>

                <span className="rounded-xl bg-white px-3 py-1 text-xs font-semibold text-black ring-1 ring-white/20">
                  Must-do
                </span>
              </div>

              <div className="mt-5 grid grid-cols-3 gap-2 text-sm text-white/70">
                <div>
                  <div className="text-xs text-white/50">Category</div>
                  <div className="font-semibold">{habit.category}</div>
                </div>
                <div>
                  <div className="text-xs text-white/50">Target</div>
                  <div className="font-semibold">{habit.target}</div>
                </div>
                <div>
                  <div className="text-xs text-white/50">Today</div>
                  <div className="font-semibold">{status?.todayProgress || 0}%</div>
                </div>
              </div>

              {status?.missed2 ? (
                <div className="mt-4 rounded-2xl bg-yellow-400/10 p-3 text-sm text-yellow-100 ring-1 ring-yellow-300/20">
                  Friendly reminder: you missed this for 2 days. A small comeback today matters.
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
