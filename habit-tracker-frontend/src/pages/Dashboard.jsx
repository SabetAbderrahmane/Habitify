import { useEffect, useMemo, useState } from "react";
import StreakCalendar from "../components/StreakCalendar";
import InsightsPanel from "../components/InsightsPanel";
import AddHabitModal from "../components/AddHabitModal";
import HabitCard from "../components/HabitCard";
import { useHabits } from "../context/HabitsContext";
import { deleteHabit, fetchHabitNames, updateHabit, createHabit } from "../lib/habits";

export default function Dashboard() {
  const { habits, loadingHabits, habitsError, reloadHabits, addHabit, setHabits } = useHabits();
  const [open, setOpen] = useState(false);
  const [habitNames, setHabitNames] = useState([]);

  const stats = useMemo(() => {
    const total = habits.length;
    const avg = total ? Math.round(habits.reduce((a, h) => a + Number(h.progress || 0), 0) / total) : 0;
    const best = total ? Math.max(...habits.map((h) => Number(h.progress || 0))) : 0;
    return { total, avg, best };
  }, [habits]);

  useEffect(() => {
    (async () => {
      await reloadHabits();
      try {
        const names = await fetchHabitNames();
        setHabitNames(Array.isArray(names) ? names : []);
      } catch {
        setHabitNames([]);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onCreate = async (habit) => {
    await addHabit(habit);
    // refresh names
    try {
      const names = await fetchHabitNames();
      setHabitNames(Array.isArray(names) ? names : []);
    } catch {
      // ignore
    }
  };

  const handleUpdate = async (habit, patch) => {
    const updated = await updateHabit(habit.id, patch);
    setHabits((prev) => prev.map((h) => (h.id === updated.id ? updated : h)));

    const names = await fetchHabitNames();
    setHabitNames(Array.isArray(names) ? names : []);
  };

  const handleDelete = async (habit) => {
    await deleteHabit(habit.id);
    setHabits((prev) => prev.filter((h) => h.id !== habit.id));

    const names = await fetchHabitNames();
    setHabitNames(Array.isArray(names) ? names : []);
  };

  const handleBumpToday = async (habit) => {
    const today = new Date().toISOString().slice(0, 10);
    const isTodayRow = habit.date === today;

    if (isTodayRow) {
      const next = Math.min(100, Number(habit.progress || 0) + 10);
      await handleUpdate(habit, { progress: next });
    } else {
      const next = 10;
      const created = await createHabit({ name: habit.name, progress: next, date: today });
      setHabits((prev) => [created, ...prev]);

      const names = await fetchHabitNames();
      setHabitNames(Array.isArray(names) ? names : []);
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
            onClick={reloadHabits}
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

      <InsightsPanel habits={habits} />

      <StreakCalendar habits={habits} />

      {habitsError ? (
        <div className="rounded-2xl bg-red-500/10 p-4 text-sm text-red-200 ring-1 ring-red-300/20">
          {habitsError}
        </div>
      ) : null}

      {/* List */}
      {loadingHabits ? (
        <SkeletonGrid />
      ) : habits.length === 0 ? (
        <EmptyState onAdd={() => setOpen(true)} />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {habits.map((h, idx) => (
            <HabitCard
              key={`${h.name}-${h.date}-${idx}`}
              habit={h}
              onUpdate={handleUpdate}
              onDelete={handleDelete}
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
          className="h-[130px] rounded-2xl bg-white/5 ring-1 ring-white/10 overflow-hidden"
        >
          <div className="h-full w-full animate-[shimmer_1.3s_infinite] bg-[linear-gradient(110deg,transparent,rgba(255,255,255,0.08),transparent)]" />
        </div>
      ))}
    </div>
  );
}
