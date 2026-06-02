import { useEffect, useMemo, useState } from "react";
import { FiCheckCircle, FiPlus } from "react-icons/fi";
import AddHabitModal from "../components/AddHabitModal";
import GlobalSearchButton from "../components/GlobalSearchButton";
import NotificationsButton from "../components/NotificationsButton";
import EmptyState from "../components/ui/EmptyState";
import { SkeletonGrid } from "../components/ui/Skeleton";
import { useHabits } from "../context/HabitsContext";
import { useToast } from "../components/ToastProvider";
import { fetchHabitNames } from "../lib/habits";

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function clamp(value) {
  return Math.max(0, Math.min(100, Number(value || 0)));
}

function initials(name = "") {
  return String(name)
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase() || "H";
}

export default function Dashboard() {
  const {
    habitDefinitions,
    habitLogs,
    selectedDate,
    loading: loadingHabits,
    error: habitsError,
    refreshData,
    addHabit,
    updateProgress,
  } = useHabits();
  const toast = useToast();

  const [open, setOpen] = useState(false);
  const [habitNames, setHabitNames] = useState([]);
  const [busyId, setBusyId] = useState("");

  const day = selectedDate || todayISO();

  useEffect(() => {
    (async () => {
      try {
        await refreshData();
      } catch {
        toast.error("Failed to load habits", "Check if backend is running on 127.0.0.1:8000");
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

  const focusRows = useMemo(() => {
    const logMap = new Map();
    (habitLogs || [])
      .filter((log) => log.date === day)
      .forEach((log) => {
        const key = log.habit_id || log.name;
        const current = logMap.get(key);
        if (!current || Number(log.progress || 0) >= Number(current.progress || 0)) {
          logMap.set(key, log);
        }
        if (log.name) logMap.set(log.name, log);
      });

    return (habitDefinitions || []).map((habit) => {
      const log = logMap.get(habit.id) || logMap.get(habit.name);
      const progress = clamp(log?.progress);
      return {
        ...habit,
        logId: log?.id,
        date: log?.date || day,
        progress,
        completed: progress >= 80,
      };
    });
  }, [day, habitDefinitions, habitLogs]);

  const completedCount = focusRows.filter((habit) => habit.completed).length;
  const totalCount = focusRows.length;
  const remaining = Math.max(0, totalCount - completedCount);
  const percent = totalCount ? Math.round((completedCount / totalCount) * 100) : 0;

  const onCreate = async (habit) => {
    await addHabit(habit);
    await refreshData();
    try {
      const names = await fetchHabitNames();
      setHabitNames(Array.isArray(names) ? names : []);
    } catch {
      // ignore template refresh failures
    }
    toast.success("Habit added", habit.name);
  };

  const logHabit = async (habit) => {
    const habitId = habit.id || habit.habit_id;
    if (!habitId) {
      toast.error("Habit definition not found");
      return;
    }

    setBusyId(String(habitId));
    try {
      const next = habit.completed ? 100 : Math.max(80, habit.progress || 0);
      await updateProgress(habitId, next, day);
      await refreshData();
      toast.success("Habit logged", `${habit.name} • ${next}%`);
    } catch (error) {
      toast.error("Could not log habit", error?.message || "Unknown error");
    } finally {
      setBusyId("");
    }
  };

  return (
    <div>
      <div className="mb-14 flex items-center justify-end gap-6">
        <GlobalSearchButton />
        <NotificationsButton />
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="inline-flex h-11 items-center gap-2 rounded-full bg-[#3337a6] px-6 text-sm font-bold tracking-[0.08em] text-white shadow-[0_14px_30px_rgba(51,55,166,0.16)]"
        >
          <FiPlus />
          Add Habit
        </button>
        <div className="grid h-11 w-11 place-items-center rounded-full bg-[#195864] font-bold text-white">A</div>
      </div>

      <section className="mx-auto max-w-[960px] text-center">
        <div className="mx-auto grid h-[188px] w-[188px] place-items-center rounded-full bg-[conic-gradient(#3337a6_var(--progress),#e0e3e5_0)] p-3" style={{ "--progress": `${percent}%` }}>
          <div className="grid h-full w-full place-items-center rounded-full bg-[#f7fafc]">
            <div>
              <div className="text-3xl font-bold text-[#3337a6]">{percent}%</div>
              <div className="mt-1 text-sm font-semibold tracking-[0.08em] text-[#464653]">Today</div>
            </div>
          </div>
        </div>

        <h1 className="mt-9 text-4xl font-semibold tracking-[-0.02em] text-[#181c1e] md:text-5xl">
          {completedCount} down, {remaining} to go.
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-xl leading-8 text-[#464653]">
          You&apos;re building solid momentum today. Keep the focus sharp.
        </p>
      </section>

      <section className="mx-auto mt-12 max-w-[960px]">
        <div className="mb-7 text-sm font-bold tracking-[0.12em] text-[#767684]">Today&apos;s Focus</div>

        {habitsError ? (
          <div className="mb-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{habitsError}</div>
        ) : null}

        {loadingHabits ? (
          <SkeletonGrid count={3} />
        ) : focusRows.length === 0 ? (
          <EmptyState
            title="No habits in your focus list"
            description="Create your first habit and it will appear here for daily tracking."
            actionLabel="Add Habit"
            onAction={() => setOpen(true)}
          />
        ) : (
          <div className="space-y-5">
            {focusRows.map((habit) => (
              <article
                key={habit.id || habit.name}
                className={[
                  "flex min-h-[134px] items-center gap-6 rounded-3xl px-8 py-6 shadow-[0_8px_24px_rgba(24,28,30,0.04)] transition",
                  habit.completed
                    ? "border border-[#c6ecc6] bg-[#c6ecc6]"
                    : "border border-[#e0e3e5] bg-white",
                ].join(" ")}
              >
                <div className={["grid h-[58px] w-[58px] shrink-0 place-items-center rounded-full text-xl font-bold", habit.completed ? "bg-[#dff5df] text-[#2d4e32]" : "bg-[#e5e9eb] text-[#39485c]"].join(" ")}>
                  {initials(habit.name)}
                </div>

                <div className="min-w-0 flex-1 text-left">
                  <div className={["text-3xl font-semibold tracking-[-0.01em]", habit.completed ? "text-[#123a18]" : "text-[#181c1e]"].join(" ")}>
                    {habit.name}
                  </div>
                  <div className="mt-2 text-lg text-[#464653]">{habit.target || habit.category || "Daily habit"}</div>
                </div>

                {habit.completed ? (
                  <div className="flex items-center gap-4 text-sm font-bold tracking-[0.08em] text-[#2d4e32]">
                    <span>Completed</span>
                    <div className="grid h-[58px] w-[58px] place-items-center rounded-full bg-white">
                      <FiCheckCircle className="h-7 w-7" />
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    disabled={busyId === String(habit.id)}
                    onClick={() => logHabit(habit)}
                    className="inline-flex h-14 items-center gap-3 rounded-full bg-[#3337a6] px-8 text-base font-bold tracking-[0.08em] text-white shadow-[0_12px_24px_rgba(51,55,166,0.18)] disabled:opacity-60"
                  >
                    <span className="h-4 w-4 rounded-full border-2 border-[#eef1f3]" />
                    {busyId === String(habit.id) ? "Logging" : "Log"}
                  </button>
                )}
              </article>
            ))}
          </div>
        )}
      </section>

      <AddHabitModal
        open={open}
        onClose={() => setOpen(false)}
        onCreate={onCreate}
        habitNames={habitNames}
      />
    </div>
  );
}
