import { useMemo } from "react";
import { Link, useParams } from "react-router-dom";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip } from "recharts";
import { useHabits } from "../context/HabitsContext";

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
  const { habits } = useHabits();

  const { series, stats, recent } = useMemo(() => {
    const logs = (habits || []).filter((h) => (h?.name || "") === name);

    // Aggregate by day (max progress per day)
    const byDay = new Map();
    for (const h of logs) {
      if (!h?.date) continue;
      const p = clamp(Number(h?.progress || 0), 0, 100);
      const cur = byDay.get(h.date) ?? 0;
      byDay.set(h.date, Math.max(cur, p));
    }

    const entries = [...byDay.entries()]
      .map(([date, progress]) => ({ date, progress }))
      .sort((a, b) => a.date.localeCompare(b.date));

    const chart = entries.map((e) => ({
      date: e.date.slice(5), // show MM-DD
      fullDate: e.date,
      progress: e.progress,
    }));

    const total = entries.length;
    const avg = total ? Math.round(entries.reduce((s, e) => s + e.progress, 0) / total) : 0;
    const best = total ? Math.max(...entries.map((e) => e.progress)) : 0;
    const last = total ? entries[total - 1].progress : 0;
    const streak = computeStreak(entries, 70);

    const recentList = entries.slice(-10).reverse();

    return {
      series: chart,
      stats: { total, avg, best, last, streak },
      recent: recentList,
    };
  }, [habits, name]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="text-sm text-white/50">
            <Link to="/app" className="hover:text-white">Dashboard</Link>
            <span className="mx-2 text-white/30">/</span>
            <span className="text-white/80">Habit</span>
          </div>
          <h1 className="mt-2 text-3xl font-semibold">{name}</h1>
          <p className="mt-2 text-white/60">Progress history, performance, and streaks.</p>
        </div>

        <Link
          to="/app"
          className="rounded-xl bg-white/10 px-4 py-2 text-sm ring-1 ring-white/15 hover:bg-white/15"
        >
          ← Back
        </Link>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Stat title="Entries" value={stats.total} sub="days logged" />
        <Stat title="Avg" value={`${stats.avg}%`} sub="overall" />
        <Stat title="Best" value={`${stats.best}%`} sub="peak day" />
        <Stat title="Streak" value={`${stats.streak}d`} sub="≥70% days" />
      </div>

      {/* Chart */}
      <div className="rounded-3xl bg-white/5 p-6 ring-1 ring-white/10">
        <div className="flex items-end justify-between gap-4">
          <div>
            <div className="text-lg font-semibold">Progress over time</div>
            <div className="mt-1 text-sm text-white/55">Max progress per day</div>
          </div>
          <div className="rounded-full bg-white/10 px-3 py-1 text-xs ring-1 ring-white/15">
            Last: <span className="text-white">{stats.last}%</span>
          </div>
        </div>

        <div className="mt-5 h-[280px] w-full">
          {series.length === 0 ? (
            <div className="grid h-full place-items-center rounded-2xl bg-black/30 ring-1 ring-white/10">
              <div className="text-white/60">No logs yet for this habit.</div>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={series}>
                <XAxis dataKey="date" tick={{ fill: "rgba(255,255,255,0.55)", fontSize: 12 }} />
                <YAxis domain={[0, 100]} tick={{ fill: "rgba(255,255,255,0.55)", fontSize: 12 }} />
                <Tooltip
                  contentStyle={{
                    background: "rgba(10,12,18,0.9)",
                    border: "1px solid rgba(255,255,255,0.12)",
                    borderRadius: "12px",
                    color: "white",
                  }}
                  labelFormatter={(lbl, payload) => payload?.[0]?.payload?.fullDate || lbl}
                />
                <Line
                  type="monotone"
                  dataKey="progress"
                  strokeWidth={3}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Recent logs */}
      <div className="rounded-3xl bg-white/5 p-6 ring-1 ring-white/10">
        <div className="text-lg font-semibold">Recent days</div>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {recent.length === 0 ? (
            <div className="text-white/55">Nothing yet.</div>
          ) : (
            recent.map((r) => (
              <div key={r.date} className="flex items-center justify-between rounded-2xl bg-black/30 px-4 py-3 ring-1 ring-white/10">
                <div className="text-sm text-white/70">{r.date}</div>
                <div className="rounded-xl bg-white/10 px-3 py-1 text-xs ring-1 ring-white/15">
                  {r.progress}%
                </div>
              </div>
            ))
          )}
        </div>
      </div>
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
