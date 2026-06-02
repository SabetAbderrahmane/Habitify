import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { FiActivity, FiCheckCircle, FiPlus, FiRefreshCw, FiTarget } from "react-icons/fi";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import StreakCalendar from "../components/StreakCalendar";
import InsightsPanel from "../components/InsightsPanel";
import AddHabitModal from "../components/AddHabitModal";
import HabitCard from "../components/HabitCard";
import ConfirmDialog from "../components/ConfirmDialog";
import Button from "../components/ui/Button";
import Card from "../components/ui/Card";
import EmptyState from "../components/ui/EmptyState";
import FilterBar from "../components/ui/FilterBar";
import PageHeader from "../components/ui/PageHeader";
import { SkeletonGrid } from "../components/ui/Skeleton";
import StatCard from "../components/ui/StatCard";
import { useHabits } from "../context/HabitsContext";
import { useToast } from "../components/ToastProvider";
import { fetchCoreHabits } from "../lib/content";
import { fetchTodayNudges } from "../lib/nudges";
import { fetchLapseRisk } from "../lib/predictions";
import { 
  fetchAllHabitLogs,
  fetchHabitNames, 
  updateHabitDefinition,
  deleteHabitLog
} from "../lib/habits";

function missedTwoDays(habits, habitName) {
  const today = new Date();
  const targetDates = [];

  for (let i = 1; i <= 2; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    targetDates.push(d.toISOString().slice(0, 10));
  }

  return targetDates.every((date) => {
    return !habits.some(
      (h) => h.name === habitName && h.date === date && Number(h.progress || 0) > 0
    );
  });
}

export default function Dashboard() {
  const {
    habitDefinitions,
    habitLogs,
    selectedDate,
    setSelectedDate,
    loading: loadingHabits,
    error: habitsError,
    refreshData,
    addHabit,
    updateProgress,
  } = useHabits();

  const toast = useToast();

  const [nudges, setNudges] = useState([]);
  const [predictions, setPredictions] = useState([]);
  const [open, setOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingDelete, setPendingDelete] = useState(null);
  const [habitNames, setHabitNames] = useState([]);
  const [coreHabits, setCoreHabits] = useState([]);
  const [allLogs, setAllLogs] = useState([]);
  const [range, setRange] = useState("7");
  const [optimisticProgress, setOptimisticProgress] = useState({});

  useEffect(() => {
    (async () => {
      try {
        const data = await fetchLapseRisk();
        setPredictions(Array.isArray(data) ? data : []);
      } catch {
        setPredictions([]);
      }
    })();
  }, []);

  // filters
  const [q, setQ] = useState("");
  const [dateFilter, setDateFilter] = useState("all"); // all | today | week | month
  const [statusFilter, setStatusFilter] = useState("all"); // all | completed | struggling
  const [sort, setSort] = useState("dateDesc"); // dateDesc | dateAsc | progressDesc | progressAsc

  const todayISO = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const weekAgoISO = useMemo(
    () => new Date(Date.now() - 6 * 24 * 3600 * 1000).toISOString().slice(0, 10),
    []
  );
  const monthAgoISO = useMemo(
    () => new Date(Date.now() - 29 * 24 * 3600 * 1000).toISOString().slice(0, 10),
    []
  );

  const stats = useMemo(() => {
    const total = habitDefinitions.length;
    const loggedToday = habitLogs.length;
    const completed = habitLogs.filter((h) => Number(h.progress || 0) >= 80).length;
    const avg = total
      ? Math.round(habitLogs.reduce((a, h) => a + Number(h.progress || 0), 0) / Math.max(1, habitLogs.length))
      : 0;
    const best = total ? Math.max(...habitLogs.map((h) => Number(h.progress || 0))) : 0;
    return { total, loggedToday, completed, avg, best };
  }, [habitDefinitions.length, habitLogs]);

  const missedCoreHabits = useMemo(() => {
    return coreHabits.filter((habit) => missedTwoDays(habitLogs, habit.name));
  }, [habitLogs, coreHabits]);

  const filteredHabits = useMemo(() => {
    let arr = habitLogs;

    const s = q.trim().toLowerCase();
    if (s) arr = arr.filter((h) => (h.name || "").toLowerCase().includes(s));

    if (dateFilter === "today") arr = arr.filter((h) => h.date === todayISO);
    if (dateFilter === "week") arr = arr.filter((h) => h.date >= weekAgoISO);
    if (dateFilter === "month") arr = arr.filter((h) => h.date >= monthAgoISO);

    if (statusFilter === "completed") {
      arr = arr.filter((h) => Number(h.progress || 0) >= 80);
    }

    if (statusFilter === "struggling") {
      arr = arr.filter(
        (h) => Number(h.progress || 0) > 0 && Number(h.progress || 0) <= 30
      );
    }

    const byDate = (a, b) => (a.date || "").localeCompare(b.date || "");
    const byProg = (a, b) => Number(a.progress || 0) - Number(b.progress || 0);

    if (sort === "dateAsc") arr = [...arr].sort(byDate);
    if (sort === "dateDesc") arr = [...arr].sort((a, b) => byDate(b, a));
    if (sort === "progressAsc") arr = [...arr].sort(byProg);
    if (sort === "progressDesc") arr = [...arr].sort((a, b) => byProg(b, a));

    return arr.map((habit) => {
      const key = habit.habit_id || habit.id;
      const override = optimisticProgress[key];
      return override === undefined ? habit : { ...habit, progress: override };
    });
  }, [habitLogs, q, dateFilter, statusFilter, sort, todayISO, weekAgoISO, monthAgoISO, optimisticProgress]);

  const chartData = useMemo(() => {
    const days = Number(range);
    const start = new Date();
    start.setDate(start.getDate() - (days - 1));
    const byDate = new Map();

    for (let i = 0; i < days; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      const iso = d.toISOString().slice(0, 10);
      byDate.set(iso, { date: iso.slice(5), fullDate: iso, progress: 0, logs: 0 });
    }

    allLogs.forEach((log) => {
      if (!byDate.has(log.date)) return;
      const bucket = byDate.get(log.date);
      bucket.progress += Number(log.progress || 0);
      bucket.logs += 1;
    });

    return [...byDate.values()].map((item) => ({
      ...item,
      progress: item.logs ? Math.round(item.progress / item.logs) : 0,
    }));
  }, [allLogs, range]);

  useEffect(() => {
    (async () => {
      try {
        const data = await fetchCoreHabits();
        setCoreHabits(Array.isArray(data) ? data : []);
      } catch (e) {
        setCoreHabits([]);
      }
    })();
  }, []);

  const refreshAllLogs = async () => {
    try {
      const data = await fetchAllHabitLogs();
      setAllLogs(Array.isArray(data) ? data : []);
    } catch {
      setAllLogs([]);
    }
  };

  useEffect(() => {
    (async () => {
      try {
        const data = await fetchTodayNudges();
        setNudges(Array.isArray(data) ? data : []);
      } catch (e) {
        setNudges([]);
      }
    })();
  }, []);

  useEffect(() => {
    (async () => {
      try {
        await refreshData();
      } catch {
        toast.error(
          "Failed to load habits",
          "Check if backend is running on 127.0.0.1:8000"
        );
      }

      try {
        const names = await fetchHabitNames();
        setHabitNames(Array.isArray(names) ? names : []);
      } catch {
        setHabitNames([]);
      }
      await refreshAllLogs();
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const refreshNudges = async () => {
    try {
      const data = await fetchTodayNudges();
      setNudges(Array.isArray(data) ? data : []);
    } catch {
      setNudges([]);
    }
  };

  const onCreate = async (habit) => {
    try {
      await addHabit(habit);
      await refreshData();
      await refreshAllLogs();
      await refreshNudges();
      toast.success("Habit added", habit.name);

      try {
        const names = await fetchHabitNames();
        setHabitNames(Array.isArray(names) ? names : []);
      } catch {
        // ignore
      }
    } catch (e) {
      toast.error("Could not add habit", e?.message || "Unknown error");
      throw e;
    }
  };

  const requestDelete = (habit) => {
    setPendingDelete(habit);
    setConfirmOpen(true);
  };

  const confirmDelete = async () => {
    if (!pendingDelete) return;

    try {
      // In this context, we are deleting a log entry
      await deleteHabitLog(pendingDelete.id);
      await refreshData();
      await refreshAllLogs();
      await refreshNudges();
      toast.success("Deleted log entry", pendingDelete.name);
    } catch (e) {
      toast.error("Delete failed", e?.message || "Unknown error");
    } finally {
      setConfirmOpen(false);
      setPendingDelete(null);
    }
  };

  const handleUpdate = async (habit, patch) => {
    try {
      // If it's a habit definition update (name change), we update the definition
      // If it's a progress update, we update the log
      let updated;
      if (patch.progress !== undefined) {
        updated = await updateProgress(habit.habit_id || habit.id, patch.progress, habit.date);
      } else {
        // Assume other patches are definition updates
        updated = await updateHabitDefinition(habit.habit_id || habit.id, patch);
      }
      
      await refreshData();
      await refreshAllLogs();
      await refreshNudges();
      toast.success("Saved", `${updated.name || habit.name} • ${updated.progress || patch.progress}%`);
    } catch (e) {
      toast.error("Update failed", e?.message || "Unknown error");
      throw e;
    }
  };

  const handleBumpToday = async (habit) => {
    const today = new Date().toISOString().slice(0, 10);
    const habitId = habit.habit_id || habit.id;
    const previous = Number(habit.progress || 0);
    const next = Math.min(100, Number(previous || 0) + 10);

    try {
      setOptimisticProgress((prev) => ({ ...prev, [habitId]: next }));
      await updateProgress(habitId, next, today);
      await refreshData();
      await refreshAllLogs();
      await refreshNudges();
      setOptimisticProgress((prev) => {
        const copy = { ...prev };
        delete copy[habitId];
        return copy;
      });
      toast.success("Logged today", `${habit.name} • ${next}%`);
    } catch (e) {
      setOptimisticProgress((prev) => ({ ...prev, [habitId]: previous }));
      toast.error("Bump failed", e?.message || "Unknown error");
    }
  };

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Dashboard overview"
        title="Your habit cockpit"
        description="Track progress, review real nudges, and log the next small win from one calm workspace."
        actions={
          <>
            <label className="sr-only" htmlFor="dashboard-date">Selected date</label>
            <input
              id="dashboard-date"
              type="date"
              value={selectedDate}
              onChange={(event) => setSelectedDate(event.target.value)}
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:border-[#3337a6] focus:ring-4 focus:ring-[#3337a6]/10"
            />
            <Button
              variant="secondary"
            onClick={async () => {
              await refreshData();
              await refreshAllLogs();
              await refreshNudges();
            }}
          >
              <FiRefreshCw aria-hidden="true" />
              Refresh
            </Button>
            <Button onClick={() => setOpen(true)}>
              <FiPlus aria-hidden="true" />
              Add Habit
            </Button>
          </>
        }
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Active habits" value={stats.total} sub="From your library" icon={FiTarget} />
        <StatCard label="Logged today" value={stats.loggedToday} sub={selectedDate} icon={FiCheckCircle} tone="green" />
        <StatCard label="Average progress" value={`${stats.avg}%`} sub="Selected day" icon={FiActivity} tone="slate" />
        <StatCard label="Best entry" value={`${stats.best}%`} sub="Selected day" icon={FiActivity} tone="amber" />
      </div>

      {nudges.length > 0 ? (
        <Card>
          <div className="text-lg font-semibold text-slate-950">Today’s nudges</div>
          <div className="mt-2 text-sm text-slate-600">
            Small prompts based on your recent activity.
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-2">
            {nudges.map((n) => (
              <div
                key={n.id}
                className="rounded-xl border border-indigo-100 bg-indigo-50/70 p-4"
              >
                <div className="text-sm font-semibold text-[#3337a6]">{n.title}</div>
                <div className="mt-2 text-sm leading-6 text-slate-700">{n.message}</div>

                {n.action ? (
                  <Button
                    as={Link}
                    to={n.action.path}
                    variant="secondary"
                    size="sm"
                    className="mt-4"
                  >
                    {n.action.label}
                  </Button>
                ) : null}
              </div>
            ))}
          </div>
        </Card>
      ) : null}

      {missedCoreHabits.length > 0 ? (
        <Card className="border-amber-200 bg-amber-50">
          <div className="text-lg font-semibold text-amber-950">
            Friendly reminders
          </div>
          <div className="mt-2 text-sm leading-6 text-amber-900">
            You missed these core habits for 2 days. A small step today can restart
            momentum.
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {missedCoreHabits.map((habit) => (
              <span
                key={habit.name}
                className="rounded-full bg-white px-3 py-2 text-sm font-semibold text-amber-900 ring-1 ring-amber-200"
              >
                {habit.name}
              </span>
            ))}
          </div>
        </Card>
      ) : null}

      <Card>
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="text-lg font-semibold text-slate-950">Progress trend</div>
            <div className="mt-1 text-sm text-slate-600">Average logged progress from real habit logs.</div>
          </div>
          <div className="flex rounded-xl bg-slate-100 p-1">
            {["7", "14", "30"].map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setRange(item)}
                className={[
                  "rounded-lg px-3 py-2 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[#3337a6]/20",
                  range === item ? "bg-white text-[#3337a6] shadow-sm" : "text-slate-600",
                ].join(" ")}
              >
                {item}d
              </button>
            ))}
          </div>
        </div>
        <div className="mt-5 h-64">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="progressFill" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="5%" stopColor="#3337a6" stopOpacity={0.18} />
                  <stop offset="95%" stopColor="#3337a6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="#e5e7eb" vertical={false} />
              <XAxis dataKey="date" tickLine={false} axisLine={false} />
              <YAxis domain={[0, 100]} tickLine={false} axisLine={false} />
              <Tooltip
                formatter={(value) => [`${value}%`, "Average progress"]}
                labelFormatter={(label, payload) => payload?.[0]?.payload?.fullDate || label}
              />
              <Area type="monotone" dataKey="progress" stroke="#3337a6" strokeWidth={2} fill="url(#progressFill)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <FilterBar
        search={q}
        onSearch={setQ}
        resultText={`Showing ${filteredHabits.length} of ${habitLogs.length}`}
        filters={[
          {
            label: "Date range",
            value: dateFilter,
            onChange: setDateFilter,
            options: [
              { value: "all", label: "All dates" },
              { value: "today", label: "Today" },
              { value: "week", label: "Last 7 days" },
              { value: "month", label: "Last 30 days" },
            ],
          },
          {
            label: "Status",
            value: statusFilter,
            onChange: setStatusFilter,
            options: [
              { value: "all", label: "All status" },
              { value: "completed", label: "Completed" },
              { value: "struggling", label: "Struggling" },
            ],
          },
          {
            label: "Sort",
            value: sort,
            onChange: setSort,
            options: [
              { value: "dateDesc", label: "Newest first" },
              { value: "dateAsc", label: "Oldest first" },
              { value: "progressDesc", label: "Highest progress" },
              { value: "progressAsc", label: "Lowest progress" },
            ],
          },
        ]}
      />

      <InsightsPanel habits={habitDefinitions} logs={habitLogs} predictions={predictions} />
      <StreakCalendar habits={habitLogs} />

      {habitsError ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {habitsError}
        </div>
      ) : null}

      {loadingHabits ? (
        <SkeletonGrid count={6} />
      ) : filteredHabits.length === 0 ? (
        <EmptyState
          title="No habit logs match this view"
          description="Adjust filters or add a habit log for the selected date."
          actionLabel="Add Habit"
          onAction={() => setOpen(true)}
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filteredHabits.map((h, idx) => (
            <HabitCard
              key={h.id || `${h.name}-${h.date}-${idx}`}
              habit={h}
              onUpdate={handleUpdate}
              onDelete={requestDelete}
              onBumpToday={handleBumpToday}
            />
          ))}
        </div>
      )}

      <AddHabitModal
        open={open}
        onClose={() => setOpen(false)}
        onCreate={onCreate}
        habitNames={habitNames}
      />

      <ConfirmDialog
        open={confirmOpen}
        title="Delete this habit entry?"
        message={
          pendingDelete
            ? `This will remove: "${pendingDelete.name}" on ${pendingDelete.date}.`
            : "This action cannot be undone."
        }
        confirmText="Delete"
        onCancel={() => {
          setConfirmOpen(false);
          setPendingDelete(null);
        }}
        onConfirm={confirmDelete}
      />
    </div>
  );
}
