import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { FiCheckCircle, FiEye, FiSearch } from "react-icons/fi";
import { useHabits } from "../context/HabitsContext";
import { fetchAllHabitLogs } from "../lib/habits";
import { useToast } from "../components/ToastProvider";
import HabitActionsMenu from "../components/HabitActionsMenu";
import Badge from "../components/ui/Badge";
import Button from "../components/ui/Button";
import EmptyState from "../components/ui/EmptyState";
import { SkeletonGrid } from "../components/ui/Skeleton";

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function computeCurrentStreak(logs) {
  const byDate = new Map(logs.map((log) => [log.date, Number(log.progress || 0)]));
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  let streak = 0;
  for (let i = 0; i < 365; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    if ((byDate.get(key) || 0) >= 80) streak += 1;
    else break;
  }
  return streak;
}

export default function HabitLibrary() {
  const { habitDefinitions, updateProgress, refreshData } = useHabits();
  const toast = useToast();

  const [allLogs, setAllLogs] = useState([]);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const [sort, setSort] = useState("name");
  const [busyId, setBusyId] = useState("");

  const loadLogs = async () => {
    setLoadingLogs(true);
    try {
      const data = await fetchAllHabitLogs();
      setAllLogs(Array.isArray(data) ? data : []);
    } catch (error) {
      setAllLogs([]);
      toast.error("Failed to load habit history", error?.message || "Unknown error");
    } finally {
      setLoadingLogs(false);
    }
  };

  useEffect(() => {
    loadLogs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const library = useMemo(() => {
    return (habitDefinitions || []).map((habit) => {
      const logs = (allLogs || [])
        .filter((log) => log.habit_id === habit.id || log.name === habit.name)
        .sort((a, b) => String(a.date || "").localeCompare(String(b.date || "")));
      const avg = logs.length
        ? Math.round(logs.reduce((sum, log) => sum + Number(log.progress || 0), 0) / logs.length)
        : 0;
      const last = logs[logs.length - 1];
      return {
        id: habit.id,
        name: habit.name,
        category: habit.category || "Wellness",
        target: habit.target || "Daily",
        totalLogs: logs.length,
        avgProgress: avg,
        currentStreak: computeCurrentStreak(logs),
        lastDate: last?.date || "No logs",
      };
    });
  }, [habitDefinitions, allLogs]);

  const categories = useMemo(() => {
    const set = new Set(library.map((habit) => habit.category || "Wellness"));
    return ["all", ...Array.from(set).sort()];
  }, [library]);

  const filteredLibrary = useMemo(() => {
    let list = library;
    const q = query.trim().toLowerCase();
    if (q) list = list.filter((habit) => habit.name.toLowerCase().includes(q));
    if (category !== "all") list = list.filter((habit) => habit.category === category);
    return [...list].sort((a, b) => {
      if (sort === "completion") return b.avgProgress - a.avgProgress;
      if (sort === "streak") return b.currentStreak - a.currentStreak;
      if (sort === "recent") return String(b.lastDate).localeCompare(String(a.lastDate));
      return a.name.localeCompare(b.name);
    });
  }, [library, query, category, sort]);

  const quickLog = async (habit) => {
    if (!habit.id) {
      toast.error("Habit definition not found");
      return;
    }
    setBusyId(String(habit.id));
    try {
      await updateProgress(habit.id, 100, todayISO());
      await refreshData();
      await loadLogs();
      toast.success("Quick logged", habit.name);
    } catch (error) {
      toast.error("Quick log failed", error?.message || "Unknown error");
    } finally {
      setBusyId("");
    }
  };

  return (
    <div>
      <div className="mb-10">
        <h1 className="text-5xl font-semibold tracking-[-0.02em] text-[#181c1e]">Habit Library</h1>
        <p className="mt-3 text-xl text-[#464653]">Manage and organize your wellness routines.</p>
      </div>

      <div className="mb-10 flex flex-col gap-6 rounded-3xl bg-white p-6 shadow-[0_10px_30px_rgba(24,28,30,0.04)] md:flex-row md:items-center md:justify-between">
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-sm font-bold tracking-[0.14em] text-[#181c1e]">FILTERS:</span>
          {categories.map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setCategory(item)}
              className={[
                "rounded-full px-4 py-1.5 text-sm font-semibold tracking-[0.08em]",
                category === item ? "bg-[#4c51bf] text-white" : "bg-[#ebeef0] text-[#181c1e]",
              ].join(" ")}
            >
              {item === "all" ? "All" : item}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-5">
          <label className="flex min-w-[320px] items-center gap-3 border-b border-[#c7c5d5] px-2 py-2">
            <FiSearch className="text-[#464653]" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              className="w-full bg-transparent text-lg text-[#181c1e] outline-none placeholder:text-[#767684]"
              placeholder="Search habits..."
            />
          </label>
          <label className="flex items-center gap-2 text-sm font-bold tracking-[0.14em] text-[#181c1e]">
            SORT
            <select
              value={sort}
              onChange={(event) => setSort(event.target.value)}
              className="rounded-lg border border-[#c7c5d5] bg-white px-3 py-2 text-sm tracking-normal text-[#181c1e]"
            >
              <option value="name">Name</option>
              <option value="completion">Completion</option>
              <option value="streak">Streak</option>
              <option value="recent">Recent</option>
            </select>
          </label>
        </div>
      </div>

      {loadingLogs ? (
        <SkeletonGrid count={6} />
      ) : library.length === 0 ? (
        <EmptyState
          title="No habits yet"
          description="Create a habit and it will appear here as a card with real progress."
          actionLabel="Go to Dashboard"
          actionTo="/app"
        />
      ) : filteredLibrary.length === 0 ? (
        <EmptyState
          title="No matching habits"
          description="Try another search or filter."
          actionLabel="Clear filters"
          onAction={() => {
            setQuery("");
            setCategory("all");
          }}
        />
      ) : (
        <div className="grid gap-8 md:grid-cols-2 xl:grid-cols-3">
          {filteredLibrary.map((habit, index) => (
            <article
              key={habit.id || habit.name}
              className={[
                "overflow-hidden rounded-2xl border bg-white shadow-[0_10px_30px_rgba(24,28,30,0.05)]",
                index % 3 === 0 ? "border-t-[#2d4e32]" : index % 3 === 1 ? "border-[#c7c5d5]" : "border-t-[#39485c]",
              ].join(" ")}
            >
              <div className="min-h-[344px] p-8">
                <div className="mb-7 flex items-start justify-between gap-4">
                  <div className="flex items-start gap-5">
                    <div className="grid h-[60px] w-[60px] place-items-center rounded-xl bg-[#ebeef0] text-xl font-bold text-[#2d4e32]">
                      {habit.name.slice(0, 1).toUpperCase()}
                    </div>
                    <div>
                      <h2 className="text-3xl font-semibold leading-tight tracking-[-0.01em] text-[#181c1e]">{habit.name}</h2>
                      <Badge tone={habit.category === "Productivity" ? "indigo" : habit.category === "Health" ? "green" : "slate"} className="mt-4">
                        {habit.category}
                      </Badge>
                    </div>
                  </div>
                  <HabitActionsMenu
                    actions={[
                      {
                        label: "View details",
                        to: `/app/habit/${encodeURIComponent(habit.name)}`,
                        LinkComponent: Link,
                        icon: FiEye,
                      },
                      {
                        label: busyId === String(habit.id) ? "Logging..." : "Quick log today",
                        onClick: () => quickLog(habit),
                        icon: FiCheckCircle,
                        disabled: busyId === String(habit.id),
                      },
                    ]}
                  />
                </div>

                <div className="mt-8 grid grid-cols-2 gap-8">
                  <div>
                    <div className="text-sm font-bold tracking-[0.14em] text-[#181c1e]">CURRENT STREAK</div>
                    <div className="mt-3 text-3xl font-bold text-[#181c1e]">
                      {habit.currentStreak} <span className="text-xl font-medium">Days</span>
                    </div>
                    <div className="mt-3 text-sm text-[#767684]">Last logged: {habit.lastDate}</div>
                  </div>
                  <div>
                    <div className="text-sm font-bold tracking-[0.14em] text-[#181c1e]">COMPLETION</div>
                    <div className="mt-3 text-3xl font-bold text-[#181c1e]">{habit.avgProgress}%</div>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between border-t border-[#e0e3e5] bg-[#f7fafc] px-8 py-5">
                <Link
                  to={`/app/habit/${encodeURIComponent(habit.name)}`}
                  className="text-sm font-bold tracking-[0.14em] text-[#181c1e]"
                >
                  View Details
                </Link>
                <Button
                  variant={index % 3 === 1 ? "primary" : "secondary"}
                  onClick={() => quickLog(habit)}
                  disabled={busyId === String(habit.id)}
                >
                  <FiCheckCircle />
                  {busyId === String(habit.id) ? "Logging" : "Quick Log"}
                </Button>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
