import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useHabits } from "../context/HabitsContext";
import { fetchAllHabitLogs } from "../lib/habits";
import { useToast } from "../components/ToastProvider";

export default function HabitLibrary() {
  const { habitDefinitions } = useHabits();
  const toast = useToast();

  const [allLogs, setAllLogs] = useState([]);
  const [loadingLogs, setLoadingLogs] = useState(false);

  useEffect(() => {
    let alive = true;

    async function loadLogs() {
      setLoadingLogs(true);

      try {
        const data = await fetchAllHabitLogs();
        if (alive) {
          setAllLogs(Array.isArray(data) ? data : []);
        }
      } catch (e) {
        if (alive) {
          setAllLogs([]);
          toast.error("Failed to load habit history", e?.message || "Unknown error");
        }
      } finally {
        if (alive) {
          setLoadingLogs(false);
        }
      }
    }

    loadLogs();

    return () => {
      alive = false;
    };
  }, [toast]);

  const library = useMemo(() => {
    return (habitDefinitions || []).map((habit) => {
      const logs = (allLogs || []).filter((log) => {
        return log.habit_id === habit.id || log.name === habit.name;
      });

      const sortedLogs = [...logs].sort((a, b) =>
        String(a.date || "").localeCompare(String(b.date || ""))
      );

      const avg = sortedLogs.length
        ? Math.round(
            sortedLogs.reduce((sum, log) => {
              return sum + Number(log.progress || 0);
            }, 0) / sortedLogs.length
          )
        : 0;

      const last = sortedLogs[sortedLogs.length - 1];

      return {
        id: habit.id,
        name: habit.name,
        category: habit.category,
        target: habit.target,
        totalLogs: sortedLogs.length,
        avgProgress: avg,
        lastProgress: last?.progress ?? 0,
        lastDate: last?.date || "No logs",
      };
    });
  }, [habitDefinitions, allLogs]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-semibold">Habit Library</h1>
        <p className="mt-2 text-white/60">
          Overview of all habits you are tracking.
        </p>
      </div>

      {loadingLogs ? (
        <div className="rounded-3xl bg-white/5 p-8 text-white/60 ring-1 ring-white/10">
          Loading habit history...
        </div>
      ) : library.length === 0 ? (
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
          {library.map((habit) => (
            <Link
              key={habit.id || habit.name}
              to={`/app/habit/${encodeURIComponent(habit.name)}`}
              className="rounded-2xl bg-white/5 p-6 ring-1 ring-white/10 transition hover:bg-white/[0.07]"
            >
              <div className="text-lg font-semibold">{habit.name}</div>

              <div className="mt-1 text-sm text-white/45">
                {habit.category || "General"} • {habit.target || "Daily"}
              </div>

              <div className="mt-4 grid grid-cols-3 gap-2 text-sm text-white/70">
                <div>
                  <div className="text-xs text-white/50">Logs</div>
                  <div className="text-lg font-semibold">{habit.totalLogs}</div>
                </div>

                <div>
                  <div className="text-xs text-white/50">Avg</div>
                  <div className="text-lg font-semibold">
                    {habit.avgProgress}%
                  </div>
                </div>

                <div>
                  <div className="text-xs text-white/50">Last</div>
                  <div className="text-lg font-semibold">
                    {habit.lastProgress}%
                  </div>
                </div>
              </div>

              <div className="mt-4 text-xs text-white/40">
                Last logged: {habit.lastDate}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
