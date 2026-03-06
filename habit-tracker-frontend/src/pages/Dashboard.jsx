import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import StreakCalendar from "../components/StreakCalendar";
import InsightsPanel from "../components/InsightsPanel";
import AddHabitModal from "../components/AddHabitModal";
import HabitCard from "../components/HabitCard";
import ConfirmDialog from "../components/ConfirmDialog";
import { useHabits } from "../context/HabitsContext";
import { useToast } from "../components/ToastProvider";
import { fetchCoreHabits } from "../lib/content";
import { fetchTodayNudges } from "../lib/nudges";
import { createHabit, deleteHabit, fetchHabitNames, updateHabit } from "../lib/habits";

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
    habits,
    loadingHabits,
    habitsError,
    reloadHabits,
    addHabit,
    setHabits,
  } = useHabits();

  const toast = useToast();

  const [nudges, setNudges] = useState([]);
  const [open, setOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingDelete, setPendingDelete] = useState(null);
  const [habitNames, setHabitNames] = useState([]);
  const [coreHabits, setCoreHabits] = useState([]);

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
    const total = habits.length;
    const avg = total
      ? Math.round(habits.reduce((a, h) => a + Number(h.progress || 0), 0) / total)
      : 0;
    const best = total ? Math.max(...habits.map((h) => Number(h.progress || 0))) : 0;
    return { total, avg, best };
  }, [habits]);

  const missedCoreHabits = useMemo(() => {
    return coreHabits.filter((habit) => missedTwoDays(habits, habit.name));
  }, [habits, coreHabits]);

  const filteredHabits = useMemo(() => {
    let arr = habits;

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

    return arr;
  }, [habits, q, dateFilter, statusFilter, sort, todayISO, weekAgoISO, monthAgoISO]);

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
        await reloadHabits();
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
      await reloadHabits();
      await refreshNudges();
      toast.success("Habit added", `${habit.name} • ${habit.progress}%`);

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
      await deleteHabit(pendingDelete.id);
      setHabits((prev) => prev.filter((h) => h.id !== pendingDelete.id));
      await refreshNudges();
      toast.success("Deleted", pendingDelete.name);
    } catch (e) {
      toast.error("Delete failed", e?.message || "Unknown error");
    } finally {
      setConfirmOpen(false);
      setPendingDelete(null);
    }
  };

  const handleUpdate = async (habit, patch) => {
    try {
      const updated = await updateHabit(habit.id, patch);
      setHabits((prev) => prev.map((h) => (h.id === updated.id ? updated : h)));
      await refreshNudges();
      toast.success("Saved", `${updated.name} • ${updated.progress}%`);

      const names = await fetchHabitNames();
      setHabitNames(Array.isArray(names) ? names : []);
    } catch (e) {
      toast.error("Update failed", e?.message || "Unknown error");
      throw e;
    }
  };

  const handleBumpToday = async (habit) => {
    const today = new Date().toISOString().slice(0, 10);
    const isTodayRow = habit.date === today;

    try {
      if (isTodayRow) {
        const next = Math.min(100, Number(habit.progress || 0) + 10);
        await handleUpdate(habit, { progress: next });
      } else {
        const created = await createHabit({
          name: habit.name,
          progress: 10,
          date: today,
        });

        setHabits((prev) => [created, ...prev]);

        const names = await fetchHabitNames();
        setHabitNames(Array.isArray(names) ? names : []);
        await refreshNudges();
        toast.success("Logged today", `${habit.name} • 10%`);
      }
    } catch (e) {
      toast.error("Bump failed", e?.message || "Unknown error");
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-3xl font-semibold">Your Habits</h1>
          <p className="mt-2 text-white/60">
            Track progress, build streaks, and let the AI nudge you at the right time.
          </p>
        </div>

        <div className="flex gap-3">
          <button
            onClick={async () => {
              await reloadHabits();
              await refreshNudges();
            }}
            className="rounded-xl bg-white/10 px-4 py-2 text-sm ring-1 ring-white/15 hover:bg-white/15"
          >
            Refresh
          </button>

          <button
            onClick={() => setOpen(true)}
            className="rounded-xl bg-gradient-to-r from-cyan-400 via-fuchsia-400 to-indigo-400 px-4 py-2 text-sm font-semibold text-black"
          >
            + Add Habit
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Stat title="Habits" value={stats.total} />
        <Stat title="Avg Progress" value={`${stats.avg}%`} />
        <Stat title="Best Today" value={`${stats.best}%`} />
      </div>

      {/* Nudges feed */}
      {nudges.length > 0 ? (
        <div className="rounded-3xl bg-white/5 p-6 ring-1 ring-white/10">
          <div className="text-lg font-semibold">Today’s nudges</div>
          <div className="mt-2 text-sm text-white/60">
            Small prompts based on your recent activity.
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-2">
            {nudges.map((n) => (
              <div
                key={n.id}
                className="rounded-2xl bg-black/30 p-4 ring-1 ring-white/10"
              >
                <div className="text-sm font-semibold">{n.title}</div>
                <div className="mt-2 text-sm text-white/60">{n.message}</div>

                {n.action ? (
                  <Link
                    to={n.action.path}
                    className="mt-4 inline-block rounded-xl bg-white/10 px-3 py-2 text-sm ring-1 ring-white/15 hover:bg-white/15"
                  >
                    {n.action.label}
                  </Link>
                ) : null}
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {/* Legacy friendly reminders based on core habits */}
      {missedCoreHabits.length > 0 ? (
        <div className="rounded-3xl bg-yellow-400/10 p-5 ring-1 ring-yellow-300/20">
          <div className="text-lg font-semibold text-yellow-100">
            Friendly reminders
          </div>
          <div className="mt-2 text-sm text-yellow-50/90">
            You missed these core habits for 2 days. A small step today can restart
            momentum.
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {missedCoreHabits.map((habit) => (
              <span
                key={habit.name}
                className="rounded-xl bg-white/10 px-3 py-2 text-sm text-white ring-1 ring-white/15"
              >
                {habit.name}
              </span>
            ))}
          </div>
        </div>
      ) : null}

      {/* Filter bar */}
      <div className="rounded-3xl bg-white/5 p-4 ring-1 ring-white/10">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <input
            className="w-full md:max-w-sm rounded-2xl bg-white/5 px-4 py-3 text-sm outline-none ring-1 ring-white/10 placeholder:text-white/30 focus:ring-cyan-300/35"
            placeholder="Search habits…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />

          <div className="flex flex-wrap gap-2">
            <select
              className="rounded-2xl bg-white px-3 py-2 text-sm text-black outline-none"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
            >
              <option value="all">All dates</option>
              <option value="today">Today</option>
              <option value="week">Last 7 days</option>
              <option value="month">Last 30 days</option>
            </select>

            <select
              className="rounded-2xl bg-white px-3 py-2 text-sm text-black outline-none"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="all">All status</option>
              <option value="completed">Completed (≥80%)</option>
              <option value="struggling">Struggling (≤30%)</option>
            </select>

            <select
              className="rounded-2xl bg-white px-3 py-2 text-sm text-black outline-none"
              value={sort}
              onChange={(e) => setSort(e.target.value)}
            >
              <option value="dateDesc">Newest first</option>
              <option value="dateAsc">Oldest first</option>
              <option value="progressDesc">Highest progress</option>
              <option value="progressAsc">Lowest progress</option>
            </select>
          </div>
        </div>

        <div className="mt-3 text-xs text-white/45">
          Showing <span className="text-white">{filteredHabits.length}</span> of{" "}
          <span className="text-white">{habits.length}</span>
        </div>
      </div>

      {/* Insights + Calendar */}
      <InsightsPanel habits={habits} />
      <StreakCalendar habits={habits} />

      {habitsError ? (
        <div className="rounded-2xl bg-red-500/10 p-4 text-sm text-red-200 ring-1 ring-red-300/20">
          {habitsError}
        </div>
      ) : null}

      {/* Habit list */}
      {loadingHabits ? (
        <SkeletonGrid />
      ) : filteredHabits.length === 0 ? (
        <EmptyState onAdd={() => setOpen(true)} />
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

function Stat({ title, value }) {
  return (
    <div className="rounded-2xl bg-white/5 p-5 ring-1 ring-white/10">
      <div className="text-sm text-white/60">{title}</div>
      <div className="mt-2 text-3xl font-semibold">{value}</div>
    </div>
  );
}

function EmptyState({ onAdd }) {
  return (
    <div className="rounded-3xl bg-white/5 p-10 text-center ring-1 ring-white/10">
      <div className="text-2xl font-semibold">No habits yet</div>
      <div className="mt-2 text-white/60">
        Add your first habit and start building momentum.
      </div>
      <button
        onClick={onAdd}
        className="mt-6 rounded-xl bg-gradient-to-r from-cyan-400 via-fuchsia-400 to-indigo-400 px-5 py-2 text-sm font-semibold text-black"
      >
        + Add your first habit
      </button>
    </div>
  );
}

function SkeletonGrid() {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          className="h-[130px] overflow-hidden rounded-2xl bg-white/5 ring-1 ring-white/10"
        >
          <div className="h-full w-full animate-[shimmer_1.3s_infinite] bg-[linear-gradient(110deg,transparent,rgba(255,255,255,0.08),transparent)]" />
        </div>
      ))}
    </div>
  );
}
