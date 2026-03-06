import { useMemo } from "react";
import { Link } from "react-router-dom";
import { useHabits } from "../context/HabitsContext";

export default function HabitLibrary() {
  const { habits } = useHabits();

  const library = useMemo(() => {
    const map = new Map();

    habits.forEach((h) => {
      if (!map.has(h.name)) map.set(h.name, []);
      map.get(h.name).push(h);
    });

    return Array.from(map.entries()).map(([name, logs]) => {
      const avg = Math.round(
        logs.reduce((s, l) => s + Number(l.progress || 0), 0) / logs.length
      );

      const last = [...logs].sort((a, b) => b.date.localeCompare(a.date))[0];

      return {
        name,
        totalLogs: logs.length,
        avgProgress: avg,
        lastProgress: last?.progress ?? 0,
      };
    });
  }, [habits]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-semibold">Habit Library</h1>
        <p className="mt-2 text-white/60">
          Overview of all habits you are tracking.
        </p>
      </div>

      {library.length === 0 ? (
        <div className="rounded-3xl bg-white/5 p-10 text-center ring-1 ring-white/10">
          <div className="text-2xl font-semibold">No habits yet</div>
          <div className="mt-2 text-white/60">
            Start logging habits and they’ll appear here as a clean library.
          </div>
          <Link
            to="/app"
            className="mt-6 inline-block rounded-xl bg-gradient-to-r from-cyan-400 via-fuchsia-400 to-indigo-400 px-5 py-2 text-sm font-semibold text-black"
          >
            Go to Dashboard
          </Link>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {library.map((h) => (
            <Link
              key={h.name}
              to={`/app/habit/${encodeURIComponent(h.name)}`}
              className="rounded-2xl bg-white/5 p-6 ring-1 ring-white/10 hover:bg-white/[0.07] transition"
            >
              <div className="text-lg font-semibold">{h.name}</div>

              <div className="mt-4 grid grid-cols-3 gap-2 text-sm text-white/70">
                <div>
                  <div className="text-xs text-white/50">Logs</div>
                  <div className="text-lg font-semibold">{h.totalLogs}</div>
                </div>

                <div>
                  <div className="text-xs text-white/50">Avg</div>
                  <div className="text-lg font-semibold">{h.avgProgress}%</div>
                </div>

                <div>
                  <div className="text-xs text-white/50">Last</div>
                  <div className="text-lg font-semibold">{h.lastProgress}%</div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
