import { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip } from "recharts";

import { useHabits } from "../context/HabitsContext";
import { useToast } from "../components/ToastProvider";
import ConfirmDialog from "../components/ConfirmDialog";
import EditHabitModal from "../components/EditHabitModal";
import { createHabit, deleteHabit, updateHabit } from "../lib/habits";

function clamp(n, a, b) {
  return Math.max(a, Math.min(b, n));
}

function toDateKey(d) {
  return d.toISOString().slice(0, 10);
}

function computeStreak(entries, threshold = 70) {
  // entries: [{date, progress}] sorted ascending by date
  const map = new Map(entries.map((e) => [e.date, e.progress]));
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let streak = 0;
  for (let i = 0; i < 365; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const iso = toDateKey(d);
    const p = map.get(iso) ?? 0;
    if (p >= threshold) streak++;
    else break;
  }
  return streak;
}

export default function HabitDetail() {
  const { habitName } = useParams();
  const name = decodeURIComponent(habitName || "");

  const { habits, setHabits } = useHabits();
  const toast = useToast();

  const [editOpen, setEditOpen] = useState(false);
  const [editHabit, setEditHabit] = useState(null);

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingDelete, setPendingDelete] = useState(null);

  const today = toDateKey(new Date());

  const { series, stats, recentRows, todayRow } = useMemo(() => {
    const logs = (habits || []).filter((h) => (h?.name || "") === name);

    // Aggregate by day with an id we can edit/delete:
    // pick the row with max progress for each day
    const byDay = new Map(); // date -> {id, date, progress}
    for (const h of logs) {
      if (!h?.date) continue;
      const p = clamp(Number(h?.progress || 0), 0, 100);
      const cur = byDay.get(h.date);
      if (!cur || p >= cur.progress) {
        byDay.set(h.date, { id: h.id, date: h.date, progress: p, name: h.name });
      }
    }

    const entries = [...byDay.values()].sort((a, b) => a.date.localeCompare(b.date));

    const chart = entries.map((e) => ({
      date: e.date.slice(5), // MM-DD
      fullDate: e.date,
      progress: e.progress,
    }));

    const total = entries.length;
    const avg = total ? Math.round(entries.reduce((s, e) => s + e.progress, 0) / total) : 0;
    const best = total ? Math.max(...entries.map((e) => e.progress)) : 0;
    const last = total ? entries[total - 1].progress : 0;
    const streak = computeStreak(entries, 70);

    const recentList = entries.slice(-14).reverse();
    const todayEntry = entries.find((e) => e.date === today) || null;

    return {
      series: chart,
      stats: { total, avg, best, last, streak },
      recentRows: recentList,
      todayRow: todayEntry,
    };
  }, [habits, name, today]);

  const openEditorFor = (h) => {
    setEditHabit(h);
    setEditOpen(true);
  };

  const bumpToday = async () => {
    try {
      if (todayRow?.id) {
        const next = Math.min(100, Number(todayRow.progress || 0) + 10);
        const updated = await updateHabit(todayRow.id, { progress: next });
        setHabits((prev) => prev.map((x) => (x.id === updated.id ? updated : x)));
        toast.success("Progress updated", `${name} → ${next}%`);
      } else {
        const created = await createHabit({ name, progress: 10, date: today });
        setHabits((prev) => [created, ...prev]);
        toast.success("Created today log", `${name} • 10%`);
      }
    } catch (e) {
      toast.error("Bump failed", e?.message || "Unknown error");
    }
  };

  const editToday = async () => {
    try {
      if (todayRow?.id) {
        openEditorFor(todayRow);
        return;
      }
      // Create a 0% row for today then open edit
      const created = await createHabit({ name, progress: 0, date: today });
      setHabits((prev) => [created, ...prev]);
      openEditorFor(created);
      toast.success("Created today log", "Now edit progress & name if needed");
    } catch (e) {
      toast.error("Could not start edit", e?.message || "Unknown error");
    }
  };

  const onSaveEdit = async (patch) => {
    if (!editHabit?.id) return;
    try {
      const updated = await updateHabit(editHabit.id, patch);
      setHabits((prev) => prev.map((x) => (x.id === updated.id ? updated : x)));
      toast.success("Saved", `${updated.name} • ${updated.progress}%`);
    } catch (e) {
      toast.error("Save failed", e?.message || "Unknown error");
      throw e;
    }
  };

  const requestDelete = (h) => {
    setPendingDelete(h);
    setConfirmOpen(true);
  };

  const confirmDelete = async () => {
    if (!pendingDelete?.id) return;
    try {
      await deleteHabit(pendingDelete.id);
      setHabits((prev) => prev.filter((x) => x.id !== pendingDelete.id));
      toast.success("Deleted", pendingDelete.name);
    } catch (e) {
      toast.error("Delete failed", e?.message || "Unknown error");
    } finally {
      setConfirmOpen(false);
      setPendingDelete(null);
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="text-sm text-white/50">
            <Link to="/app/dashboard" className="hover:text-white/80">
              Dashboard
            </Link>{" "}
            / Habit
          </div>
          <h1 className="mt-2 text-3xl font-semibold">{name}</h1>
          <p className="mt-2 text-white/60">Progress history, performance, and streaks.</p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Link
            to="/app/dashboard"
            className="rounded-xl bg-white/10 px-4 py-2 text-sm ring-1 ring-white/15 hover:bg-white/15"
          >
            ← Back
          </Link>

          <button
            onClick={bumpToday}
            className="rounded-xl bg-gradient-to-r from-cyan-400 via-fuchsia-400 to-indigo-400 px-4 py-2 text-sm font-semibold text-black"
            type="button"
          >
            +10% Today
          </button>

          <button
            onClick={editToday}
            className="rounded-xl bg-white/10 px-4 py-2 text-sm ring-1 ring-white/15 hover:bg-white/15"
            type="button"
          >
            Edit Today
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Stat title="Total days" value={stats.total} sub="Logged" />
        <Stat title="Average" value={`${stats.avg}%`} sub="Overall" />
        <Stat title="Best" value={`${stats.best}%`} sub="Peak day" />
        <Stat title="Streak" value={`${stats.streak}d`} sub="≥ 70%" />
      </div>

      {/* Chart */}
      <div className="rounded-3xl bg-white/5 p-6 ring-1 ring-white/10">
        <div className="flex items-end justify-between gap-4">
          <div>
            <div className="text-lg font-semibold">Progress over time</div>
            <div className="mt-1 text-sm text-white/60">Max progress per day</div>
          </div>
          <div className="text-sm text-white/60">Last: {stats.last}%</div>
        </div>

        <div className="mt-6 h-[260px]">
          {series.length === 0 ? (
            <div className="grid h-full place-items-center text-white/60">No logs yet for this habit.</div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={series}>
                <XAxis dataKey="date" />
                <YAxis domain={[0, 100]} />
                <Tooltip
                  formatter={(v) => [`${v}%`, "Progress"]}
                  labelFormatter={(lbl, payload) => payload?.[0]?.payload?.fullDate || lbl}
                />
                <Line type="monotone" dataKey="progress" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Recent logs (editable) */}
      <div className="rounded-3xl bg-white/5 p-6 ring-1 ring-white/10">
        <div className="flex items-end justify-between gap-4">
          <div>
            <div className="text-lg font-semibold">Recent days</div>
            <div className="mt-1 text-sm text-white/60">Edit or delete any day</div>
          </div>
        </div>

        {recentRows.length === 0 ? (
          <div className="mt-6 text-white/60">Nothing yet.</div>
        ) : (
          <div className="mt-6 overflow-hidden rounded-2xl ring-1 ring-white/10">
            <div className="grid grid-cols-12 bg-white/5 px-4 py-3 text-xs text-white/60">
              <div className="col-span-5">Date</div>
              <div className="col-span-3">Progress</div>
              <div className="col-span-4 text-right">Actions</div>
            </div>

            {recentRows.map((r) => (
              <div
                key={r.id || r.date}
                className="grid grid-cols-12 items-center px-4 py-3 text-sm ring-1 ring-white/5 hover:bg-white/[0.04]"
              >
                <div className="col-span-5">{r.date}</div>
                <div className="col-span-3">{r.progress}%</div>
                <div className="col-span-4 flex justify-end gap-2">
                  <button
                    onClick={() => openEditorFor(r)}
                    className="rounded-lg bg-white/10 px-3 py-1 text-xs ring-1 ring-white/15 hover:bg-white/15"
                    type="button"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => requestDelete(r)}
                    className="rounded-lg bg-red-500/20 px-3 py-1 text-xs text-red-100 ring-1 ring-red-300/20 hover:bg-red-500/25"
                    type="button"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modals */}
      <EditHabitModal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        habit={editHabit}
        onSave={onSaveEdit}
        onDelete={() => requestDelete(editHabit)}
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

function Stat({ title, value, sub }) {
  return (
    <div className="rounded-2xl bg-white/5 p-5 ring-1 ring-white/10">
      <div className="text-sm text-white/60">{title}</div>
      <div className="mt-2 text-3xl font-semibold">{value}</div>
      <div className="mt-1 text-xs text-white/45">{sub}</div>
    </div>
  );
}
