import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { FiArrowLeft, FiEdit3, FiTrash2 } from "react-icons/fi";
import StreakCalendar from "../components/StreakCalendar";
import { useHabits } from "../context/HabitsContext";
import { useToast } from "../components/ToastProvider";
import ConfirmDialog from "../components/ConfirmDialog";
import EditHabitModal from "../components/EditHabitModal";
import { deleteHabitLog, fetchAllHabitLogs } from "../lib/habits";
import { fetchLapseRisk } from "../lib/predictions";
import Badge from "../components/ui/Badge";
import Button from "../components/ui/Button";
import EmptyState from "../components/ui/EmptyState";
import Skeleton from "../components/ui/Skeleton";

function clamp(value) {
  return Math.max(0, Math.min(100, Number(value || 0)));
}

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

function computeCurrentStreak(entries, threshold = 80) {
  const map = new Map(entries.map((entry) => [entry.date, entry.progress]));
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  let streak = 0;
  for (let i = 0; i < 365; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const iso = d.toISOString().slice(0, 10);
    if ((map.get(iso) || 0) >= threshold) streak += 1;
    else break;
  }
  return streak;
}

function computeBestStreak(entries, threshold = 80) {
  let best = 0;
  let current = 0;
  entries.forEach((entry) => {
    if (entry.progress >= threshold) {
      current += 1;
      best = Math.max(best, current);
    } else {
      current = 0;
    }
  });
  return best;
}

export default function HabitDetail() {
  const { habitName } = useParams();
  const name = decodeURIComponent(habitName || "");
  const { habitDefinitions, refreshData, updateProgress } = useHabits();
  const toast = useToast();

  const [allLogs, setAllLogs] = useState([]);
  const [loadingLogs, setLoadingLogs] = useState(true);
  const [predictions, setPredictions] = useState([]);
  const [editOpen, setEditOpen] = useState(false);
  const [editHabit, setEditHabit] = useState(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingDelete, setPendingDelete] = useState(null);

  const habit = useMemo(() => habitDefinitions.find((item) => item.name === name) || null, [habitDefinitions, name]);

  const loadAllLogs = async () => {
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
    loadAllLogs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const data = await fetchLapseRisk();
        if (alive) setPredictions(Array.isArray(data) ? data : []);
      } catch {
        if (alive) setPredictions([]);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const { entries, stats, trendData, todayEntry, latestEntry } = useMemo(() => {
    const logs = (allLogs || []).filter((log) => log.habit_id === habit?.id || log.name === name);
    const byDay = new Map();
    logs.forEach((log) => {
      if (!log.date) return;
      const progress = clamp(log.progress);
      const current = byDay.get(log.date);
      if (!current || progress >= current.progress) {
        byDay.set(log.date, { ...log, progress, name });
      }
    });
    const sorted = [...byDay.values()].sort((a, b) => a.date.localeCompare(b.date));
    const total = sorted.length;
    const completionRate = total ? Math.round(sorted.filter((entry) => entry.progress >= 80).length / total * 100) : 0;
    const currentStreak = computeCurrentStreak(sorted);
    const bestStreak = computeBestStreak(sorted);
    const latest = sorted[sorted.length - 1] || null;
    const today = sorted.find((entry) => entry.date === todayKey()) || null;

    const start = new Date();
    start.setDate(start.getDate() - 29);
    const progressByDate = new Map(sorted.map((entry) => [entry.date, entry.progress]));
    const trend = Array.from({ length: 30 }).map((_, index) => {
      const d = new Date(start);
      d.setDate(start.getDate() + index);
      const iso = d.toISOString().slice(0, 10);
      return {
        day: String(index + 1),
        date: iso,
        progress: progressByDate.get(iso) || 0,
      };
    });

    return {
      entries: sorted,
      todayEntry: today,
      latestEntry: latest,
      trendData: trend,
      stats: { total, completionRate, currentStreak, bestStreak },
    };
  }, [allLogs, habit?.id, name]);

  const risk = useMemo(() => {
    return predictions.find((item) => item.habit_id === habit?.id || item.habit_name === name) || null;
  }, [habit?.id, name, predictions]);

  const editToday = async () => {
    if (!habit?.id) {
      toast.error("Habit definition not found");
      return;
    }
    if (todayEntry) {
      setEditHabit(todayEntry);
      setEditOpen(true);
      return;
    }
    try {
      const created = await updateProgress(habit.id, 0, todayKey());
      await refreshData();
      await loadAllLogs();
      setEditHabit(created);
      setEditOpen(true);
    } catch (error) {
      toast.error("Could not start edit", error?.message || "Unknown error");
    }
  };

  const onSaveEdit = async (patch) => {
    if (!habit?.id) return;
    await updateProgress(habit.id, patch.progress || 0, editHabit?.date || todayKey());
    await refreshData();
    await loadAllLogs();
    toast.success("Saved progress", `${name} • ${patch.progress}%`);
  };

  const requestDeleteLatest = () => {
    if (!latestEntry) {
      toast.error("No log entry to delete");
      return;
    }
    setPendingDelete(latestEntry);
    setConfirmOpen(true);
  };

  const confirmDelete = async () => {
    if (!pendingDelete?.id) return;
    try {
      await deleteHabitLog(pendingDelete.id);
      await refreshData();
      await loadAllLogs();
      toast.success("Deleted log entry", `${name} on ${pendingDelete.date}`);
    } catch (error) {
      toast.error("Delete failed", error?.message || "Unknown error");
    } finally {
      setConfirmOpen(false);
      setPendingDelete(null);
    }
  };

  if (loadingLogs) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-20" />
        <Skeleton className="h-40" />
        <Skeleton className="h-96" />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-9 flex items-start justify-between gap-6">
        <div>
          <Link to="/app/library" className="inline-flex items-center gap-2 text-sm font-bold tracking-[0.12em] text-[#181c1e]">
            <FiArrowLeft />
            Back to Library
          </Link>
          <div className="mt-4 flex flex-wrap items-center gap-5">
            <h1 className="text-5xl font-semibold tracking-[-0.02em] text-[#181c1e]">{name}</h1>
            <Badge tone="green">{habit?.category || "Wellness"}</Badge>
          </div>
        </div>
        <div className="flex gap-4">
          <Button variant="secondary" onClick={editToday}>
            <FiEdit3 />
            Edit
          </Button>
          <Button variant="secondary" onClick={requestDeleteLatest} className="border-red-200 text-red-700 hover:bg-red-50">
            <FiTrash2 />
            Delete
          </Button>
        </div>
      </div>

      <div className="mb-9 grid gap-5 md:grid-cols-4">
        <AnalyticsStat label="Current Streak" value={stats.currentStreak} suffix="Days" tone="indigo" />
        <AnalyticsStat label="Best Streak" value={stats.bestStreak} suffix="Days" />
        <AnalyticsStat label="Completion Rate" value={`${stats.completionRate}%`} suffix={stats.completionRate ? "+2%" : ""} tone="green" />
        <AnalyticsStat label="Total Sessions" value={stats.total} suffix="All time" />
      </div>

      <div className="grid gap-8 lg:grid-cols-[1fr_374px]">
        <StreakCalendar habits={entries} mode="compact" title="Activity Map" />

        <div className="space-y-6">
          <section className="rounded-3xl border border-[#e0e3e5] bg-white p-7 shadow-[0_10px_30px_rgba(24,28,30,0.04)]">
            <div className="mb-6 flex items-center justify-between">
              <div className="text-sm font-bold tracking-[0.14em] text-[#1117a8]">AI Pattern Analysis</div>
              <div className="grid h-12 w-12 place-items-center rounded-full bg-[#e1e0ff] text-[#3337a6]">✺</div>
            </div>
            <p className="text-2xl leading-9 text-[#181c1e]">
              {risk?.recommendation || "The model has not returned a pattern recommendation for this habit yet."}
            </p>
            {risk?.factors?.length ? (
              <div className="mt-6 rounded-2xl border border-[#c7c5d5] bg-[#f7fafc] p-5 text-[#464653]">
                <div className="mb-2 text-sm font-bold tracking-[0.12em] text-[#181c1e]">Suggestion</div>
                {risk.factors[0]}
              </div>
            ) : null}
          </section>

          <section className="rounded-3xl border border-red-200 bg-red-50 p-7">
            <div className="text-sm font-bold tracking-[0.14em] text-red-700">Lapse Risk Detected</div>
            <p className="mt-3 text-lg leading-7 text-[#181c1e]">
              {risk ? `${risk.risk_level} risk (${Math.round(Number(risk.lapse_risk_score || 0) * 100)}%) from the existing prediction endpoint.` : "No lapse risk prediction returned for this habit."}
            </p>
          </section>
        </div>
      </div>

      <section className="mt-9 rounded-3xl border border-[#e0e3e5] bg-white p-8 shadow-[0_10px_30px_rgba(24,28,30,0.04)]">
        <div className="mb-8">
          <h2 className="text-3xl font-semibold tracking-[-0.01em] text-[#181c1e]">30-Day Completion Trend</h2>
          <p className="mt-2 text-lg text-[#464653]">Consistency moving average</p>
        </div>
        {entries.length === 0 ? (
          <EmptyState title="No analytics yet" description="Log this habit to populate the trend chart." />
        ) : (
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={trendData}>
                <XAxis dataKey="day" axisLine={false} tickLine={false} />
                <YAxis hide domain={[0, 100]} />
                <Tooltip formatter={(value) => [`${value}%`, "Completion"]} labelFormatter={(_, payload) => payload?.[0]?.payload?.date || ""} />
                <Bar dataKey="progress" radius={[4, 4, 0, 0]} fill="#5f65d8" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </section>

      <EditHabitModal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        habit={editHabit}
        onSave={onSaveEdit}
        onDelete={() => {
          setPendingDelete(editHabit);
          setConfirmOpen(true);
        }}
      />

      <ConfirmDialog
        open={confirmOpen}
        title="Delete this habit entry?"
        message={pendingDelete ? `This will remove "${name}" on ${pendingDelete.date}.` : "This action cannot be undone."}
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

function AnalyticsStat({ label, value, suffix, tone = "slate" }) {
  return (
    <section className="relative overflow-hidden rounded-2xl border border-[#e0e3e5] bg-white p-7 shadow-[0_10px_30px_rgba(24,28,30,0.04)]">
      <div className="text-sm font-bold uppercase tracking-[0.12em] text-[#181c1e]">{label}</div>
      <div className="mt-9 flex items-end gap-3">
        <span className={["text-3xl font-bold", tone === "green" ? "text-[#2d4e32]" : tone === "indigo" ? "text-[#3337a6]" : "text-[#181c1e]"].join(" ")}>
          {value}
        </span>
        {suffix ? <span className="text-lg text-[#464653]">{suffix}</span> : null}
      </div>
    </section>
  );
}
