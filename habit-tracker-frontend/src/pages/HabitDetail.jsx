import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip } from "recharts";
import { FiArrowLeft, FiEdit3, FiPlus, FiTrendingUp } from "react-icons/fi";

import { useHabits } from "../context/HabitsContext";
import { useToast } from "../components/ToastProvider";
import ConfirmDialog from "../components/ConfirmDialog";
import EditHabitModal from "../components/EditHabitModal";
import { deleteHabitLog, fetchAllHabitLogs } from "../lib/habits";
import { fetchLapseRisk } from "../lib/predictions";
import Badge from "../components/ui/Badge";
import Button from "../components/ui/Button";
import Card from "../components/ui/Card";
import EmptyState from "../components/ui/EmptyState";
import PageHeader from "../components/ui/PageHeader";
import ProgressBar from "../components/ui/ProgressBar";
import Skeleton from "../components/ui/Skeleton";
import StatCard from "../components/ui/StatCard";
import Tabs from "../components/ui/Tabs";

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

  const { 
    habitDefinitions, 
    refreshData, 
    updateProgress 
  } = useHabits();
  const toast = useToast();

  const [editOpen, setEditOpen] = useState(false);
  const [editHabit, setEditHabit] = useState(null);

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingDelete, setPendingDelete] = useState(null);
  const [activeTab, setActiveTab] = useState("overview");

  const today = toDateKey(new Date());

  const [allLogs, setAllLogs] = useState([]);
  const [loadingLogs, setLoadingLogs] = useState(true);
  const [predictions, setPredictions] = useState([]);

  useEffect(() => {
    let alive = true;

    async function loadAllLogs() {
      setLoadingLogs(true);
      try {
        const data = await fetchAllHabitLogs();
        if (alive) {
          setAllLogs(Array.isArray(data) ? data : []);
        }
      } catch (e) {
        toast.error("Failed to load habit history", e?.message || "Unknown error");
        if (alive) {
          setAllLogs([]);
        }
      } finally {
        if (alive) setLoadingLogs(false);
      }
    }

    loadAllLogs();

    return () => {
      alive = false;
    };
  }, [toast]);

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

  const habitId = useMemo(() => {
    const def = habitDefinitions.find(d => (d.name || "") === name);
    return def?.id;
  }, [habitDefinitions, name]);

  const { series, stats, recentRows, todayRow } = useMemo(() => {
    // Filter logs for this specific habit definition
    const logs = (allLogs || []).filter((l) => {
      return l.habit_id === habitId || l.name === name;
    });

    // Aggregate by day with an id we can edit/delete
    const byDay = new Map(); // date -> {id, date, progress, name}
    for (const l of logs) {
      if (!l?.date) continue;
      const p = clamp(Number(l?.progress || 0), 0, 100);
      const cur = byDay.get(l.date);
      if (!cur || p >= cur.progress) {
        byDay.set(l.date, { id: l.id, date: l.date, progress: p, name: l.name });
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
  }, [allLogs, habitId, name, today]);

  const risk = useMemo(() => {
    return predictions.find((item) => item.habit_id === habitId || item.habit_name === name) || null;
  }, [habitId, name, predictions]);

  const reloadAllLogs = async () => {
    const data = await fetchAllHabitLogs();
    setAllLogs(Array.isArray(data) ? data : []);
  };

  const openEditorFor = (h) => {
    setEditHabit(h);
    setEditOpen(true);
  };

  const bumpToday = async () => {
    if (!habitId) {
      toast.error("Habit definition not found");
      return;
    }
    try {
      const currentProgress = todayRow?.progress || 0;
      const next = Math.min(100, Number(currentProgress) + 10);
      await updateProgress(habitId, next, today);
      await refreshData();
      await reloadAllLogs();
      toast.success("Progress updated", `${name} → ${next}%`);
    } catch (e) {
      toast.error("Bump failed", e?.message || "Unknown error");
    }
  };

  const editToday = async () => {
    if (!habitId) {
      toast.error("Habit definition not found");
      return;
    }
    try {
      if (todayRow?.id) {
        openEditorFor(todayRow);
        return;
      }
      // Log 0% for today first to create the entry
      const created = await updateProgress(habitId, 0, today);
      await refreshData();
      await reloadAllLogs();
      openEditorFor(created);
      toast.success("Created today log", "Now edit progress");
    } catch (e) {
      toast.error("Could not start edit", e?.message || "Unknown error");
    }
  };

  const onSaveEdit = async (patch) => {
    if (!habitId) return;
    try {
      // In this view, edits are always to log progress
      const targetDate = editHabit?.date || today;
      await updateProgress(habitId, patch.progress || 0, targetDate);
      await refreshData();
      await reloadAllLogs();
      toast.success("Saved progress", `${name} • ${patch.progress}%`);
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
      await deleteHabitLog(pendingDelete.id);
      await refreshData();
      await reloadAllLogs();
      toast.success("Deleted log entry", `${name} on ${pendingDelete.date}`);
    } catch (e) {
      toast.error("Delete failed", e?.message || "Unknown error");
    } finally {
      setConfirmOpen(false);
      setPendingDelete(null);
    }
  };

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Habit analytics"
        title={name}
        description="Progress history, risk signals, and recent logs from your real habit data."
        actions={
          <>
            <Button as={Link} to="/app" variant="secondary">
              <FiArrowLeft aria-hidden="true" />
              Back
            </Button>
            <Button
            onClick={bumpToday}
          >
              <FiPlus aria-hidden="true" />
            +10% Today
            </Button>

            <Button
              variant="secondary"
            onClick={editToday}
          >
              <FiEdit3 aria-hidden="true" />
            Edit Today
            </Button>
          </>
        }
      />

      <div className="flex overflow-x-auto">
        <Tabs
          value={activeTab}
          onChange={setActiveTab}
          ariaLabel="Habit detail sections"
          tabs={[
            { value: "overview", label: "Overview" },
            { value: "history", label: "History" },
            { value: "risk", label: "AI Risk" },
            { value: "logs", label: "Recent Logs" },
          ]}
        />
      </div>

      {loadingLogs ? (
        <div className="space-y-4">
          <div className="grid gap-4 md:grid-cols-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <Skeleton key={index} className="h-28" />
            ))}
          </div>
          <Skeleton className="h-80" />
        </div>
      ) : activeTab === "overview" ? (
        <>
          <div className="grid gap-4 md:grid-cols-4">
            <StatCard label="Total days" value={stats.total} sub="Logged" icon={FiTrendingUp} />
            <StatCard label="Average" value={`${stats.avg}%`} sub="Overall" icon={FiTrendingUp} tone="slate" />
            <StatCard label="Best" value={`${stats.best}%`} sub="Peak day" icon={FiTrendingUp} tone="green" />
            <StatCard label="Streak" value={`${stats.streak}d`} sub="≥ 70%" icon={FiTrendingUp} tone="amber" />
          </div>
          <Card>
            <div className="flex items-end justify-between gap-4">
              <div>
                <div className="text-lg font-semibold text-slate-950">Progress over time</div>
                <div className="mt-1 text-sm text-slate-600">Max progress per day</div>
              </div>
              <Badge tone={stats.last >= 80 ? "green" : "slate"}>Last: {stats.last}%</Badge>
            </div>

            <div className="mt-6 h-[260px]">
              {series.length === 0 ? (
                <EmptyState title="No logs yet" description="Use quick log to create the first entry for this habit." />
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={series}>
                    <XAxis dataKey="date" tickLine={false} axisLine={false} />
                    <YAxis domain={[0, 100]} tickLine={false} axisLine={false} />
                    <Tooltip
                      formatter={(v) => [`${v}%`, "Progress"]}
                      labelFormatter={(lbl, payload) => payload?.[0]?.payload?.fullDate || lbl}
                    />
                    <Line type="monotone" dataKey="progress" stroke="#3337a6" strokeWidth={2} dot={{ r: 3 }} />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>
          </Card>
        </>
      ) : activeTab === "history" ? (
        <Card>
          <div className="text-lg font-semibold text-slate-950">History</div>
          <div className="mt-5 space-y-3">
            {series.length === 0 ? (
              <EmptyState title="No history yet" description="Log this habit to build a timeline." />
            ) : (
              series.map((point) => (
                <div key={point.fullDate} className="rounded-xl border border-slate-200 p-4">
                  <div className="mb-2 flex items-center justify-between text-sm">
                    <span className="font-semibold text-slate-800">{point.fullDate}</span>
                    <span className="text-slate-500">{point.progress}%</span>
                  </div>
                  <ProgressBar value={point.progress} />
                </div>
              ))
            )}
          </div>
        </Card>
      ) : activeTab === "risk" ? (
        <Card className="border-indigo-100 bg-indigo-50/50">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <div className="text-lg font-semibold text-[#3337a6]">AI risk signal</div>
              <p className="mt-2 text-sm leading-6 text-slate-700">
                This uses the existing lapse-risk API and does not invent confidence or factors.
              </p>
            </div>
            {risk ? <Badge tone={risk.risk_level === "High" ? "red" : risk.risk_level === "Medium" ? "amber" : "green"}>{risk.risk_level}</Badge> : null}
          </div>
          {!risk ? (
            <EmptyState title="No prediction available" description="The model did not return a prediction for this habit yet." />
          ) : (
            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <div className="rounded-xl bg-white p-4 ring-1 ring-indigo-100">
                <div className="text-sm font-semibold text-slate-500">Risk score</div>
                <div className="mt-2 text-3xl font-bold text-slate-950">{Math.round(Number(risk.lapse_risk_score || 0) * 100)}%</div>
                <div className="mt-1 text-sm text-slate-500">Source: {risk.source}</div>
              </div>
              <div className="rounded-xl bg-white p-4 ring-1 ring-indigo-100">
                <div className="text-sm font-semibold text-slate-500">Recommendation</div>
                <div className="mt-2 text-sm leading-6 text-slate-700">{risk.recommendation || "No recommendation returned."}</div>
              </div>
              <div className="md:col-span-2">
                <div className="text-sm font-semibold text-slate-500">Factors</div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {(risk.factors || []).map((factor) => (
                    <Badge key={factor} tone="indigo">{factor}</Badge>
                  ))}
                </div>
              </div>
            </div>
          )}
        </Card>
      ) : (
        <Card>
          <div className="flex items-end justify-between gap-4">
            <div>
              <div className="text-lg font-semibold text-slate-950">Recent days</div>
              <div className="mt-1 text-sm text-slate-600">Edit or delete any day</div>
            </div>
          </div>

          {recentRows.length === 0 ? (
            <EmptyState title="Nothing yet" description="Recent logs will appear here once you track this habit." />
          ) : (
            <div className="mt-6 overflow-hidden rounded-2xl border border-slate-200">
              <div className="grid grid-cols-12 bg-slate-50 px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
                <div className="col-span-5">Date</div>
                <div className="col-span-3">Progress</div>
                <div className="col-span-4 text-right">Actions</div>
              </div>
            {recentRows.map((r) => (
              <div
                key={r.id || r.date}
                className="grid grid-cols-12 items-center border-t border-slate-100 px-4 py-3 text-sm text-slate-700 hover:bg-slate-50"
              >
                <div className="col-span-5">{r.date}</div>
                <div className="col-span-3">{r.progress}%</div>
                <div className="col-span-4 flex justify-end gap-2">
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => openEditorFor(r)}
                  >
                    Edit
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => requestDelete(r)}
                    className="text-red-700 hover:bg-red-50"
                  >
                    Delete
                  </Button>
                </div>
              </div>
            ))}
          </div>
          )}
        </Card>
      )}

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

