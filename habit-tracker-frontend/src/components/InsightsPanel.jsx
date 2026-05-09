import { useEffect, useMemo, useState } from "react";
import { fetchLapseRisk } from "../lib/predictions";

function clamp(n, a, b) {
  return Math.max(a, Math.min(b, n));
}

function weekdayName(d) {
  return d.toLocaleString(undefined, { weekday: "short" });
}

function toDate(iso) {
  const d = new Date(iso);
  d.setHours(0, 0, 0, 0);
  return d;
}

function isoToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function isoKey(d) {
  return d.toISOString().slice(0, 10);
}

export default function InsightsPanel({ habits, logs, predictions, goodThreshold = 70 }) {
  const insights = useMemo(() => {
    const list = (logs || [])
      .map((l) => ({
        date: l.date,
        p: clamp(Number(l.progress || 0), 0, 100),
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // Aggregate by day: max progress that day
    const dayMax = new Map();
    for (const item of list) {
      const cur = dayMax.get(item.date) ?? 0;
      dayMax.set(item.date, Math.max(cur, item.p));
    }
    

    const days = [...dayMax.entries()]
      .map(([date, p]) => ({ date, p, d: toDate(date) }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // Recent window
    const lastN = 14;
    const recent = days.slice(-lastN);

    // Consistency = % of days in window with any activity (>0)
    const activeDays = recent.filter((x) => x.p > 0).length;
    const consistency = recent.length ? Math.round((activeDays / recent.length) * 100) : 0;

    // Trend: compare last 7 avg vs previous 7 avg
    const last7 = recent.slice(-7);
    const prev7 = recent.slice(-14, -7);

    const avg = (arr) => (arr.length ? arr.reduce((s, x) => s + x.p, 0) / arr.length : 0);
    const avgLast7 = avg(last7);
    const avgPrev7 = avg(prev7);
    const trend = avgLast7 - avgPrev7; // positive means improving

    // Streak: consecutive days from today backwards with p >= threshold
    const today = isoToday();
    const map = new Map(days.map((x) => [x.date, x.p]));

    let streak = 0;
    for (let i = 0; i < 365; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const iso = isoKey(d);
      const p = map.get(iso) ?? 0;

      if (p >= goodThreshold) streak++;
      else break;
    }

    // Best weekday performance
    const wd = new Map(); // name -> {sum, count, best}
    for (const x of days) {
      const name = weekdayName(x.d);
      const cur = wd.get(name) || { sum: 0, count: 0, best: 0 };
      cur.sum += x.p;
      cur.count += 1;
      cur.best = Math.max(cur.best, x.p);
      wd.set(name, cur);
    }

    const weekdayRank = [...wd.entries()]
      .map(([name, v]) => ({
        name,
        avg: v.sum / v.count,
        best: v.best,
        count: v.count,
      }))
      .sort((a, b) => b.avg - a.avg);

    const bestDays = weekdayRank.slice(0, 2).map((x) => x.name);

    // Risk calculation from AI predictions
    // We use the highest risk habit as the primary signal
    const maxRiskPrediction = predictions.length > 0 
      ? predictions.reduce((prev, current) => (prev.lapse_risk_score > current.lapse_risk_score) ? prev : current)
      : null;

    const aiRiskScore = maxRiskPrediction ? Math.round(maxRiskPrediction.lapse_risk_score * 100) : 0;
    const aiRiskLabel = maxRiskPrediction ? maxRiskPrediction.risk_level : "Stable";
    
    // Nudge from AI factors
    const aiNudge = maxRiskPrediction && maxRiskPrediction.factors.length > 0
      ? `AI indicates risk for ${maxRiskPrediction.habit_name}: ${maxRiskPrediction.factors[0].toLowerCase()}.`
      : "You’re on a stable path. Keep maintaining your core habits.";

    return {
      risk: aiRiskScore,
      riskLabel: aiRiskLabel,
      consistency,
      trend: Math.round(trend),
      streak,
      bestDays,
      avgLast7: Math.round(avgLast7),
      nudge: aiNudge,
    };
  }, [logs, goodThreshold, predictions]);

  return (
    <div className="rounded-3xl bg-white/5 p-6 ring-1 ring-white/10">
      <div className="flex items-end justify-between gap-4">
        <div>
          <div className="text-lg font-semibold">AI Insights v2</div>
          <div className="mt-1 text-sm text-white/55">
            Real-time hybrid ML-based lapse prediction
          </div>
        </div>

        <RiskPill label={insights.riskLabel} score={insights.risk} />
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-4">
        <Metric title="Lapse Risk (AI)" value={`${insights.risk}%`} sub={insights.riskLabel} />
        <Metric title="Consistency" value={`${insights.consistency}%`} sub="last 14 days" />
        <Metric
          title="Trend"
          value={`${insights.trend >= 0 ? "+" : ""}${insights.trend}`}
          sub="avg progress vs prev week"
        />
        <Metric title="Streak" value={`${insights.streak}d`} sub={`≥${70}% days`} />
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl bg-black/30 p-4 ring-1 ring-white/10">
          <div className="text-sm text-white/60">Best days</div>
          <div className="mt-2 text-2xl font-semibold">
            {insights.bestDays?.length ? insights.bestDays.join(" & ") : "—"}
          </div>
          <div className="mt-2 text-sm text-white/45">
            Schedule harder habits on your best days for higher success.
          </div>
        </div>

        <div className="rounded-2xl bg-black/30 p-4 ring-1 ring-white/10">
          <div className="text-sm text-white/60">Smart nudge (ML)</div>
          <div className="mt-2 text-sm leading-relaxed text-white/80">{insights.nudge}</div>
          <div className="mt-3 text-xs text-white/40">
            Predictions powered by Hybrid LSTM-Tabular Model.
          </div>
        </div>
      </div>
    </div>
  );
}

function Metric({ title, value, sub }) {
  return (
    <div className="rounded-2xl bg-white/5 p-5 ring-1 ring-white/10">
      <div className="text-sm text-white/60">{title}</div>
      <div className="mt-2 text-3xl font-semibold">{value}</div>
      <div className="mt-1 text-xs text-white/45">{sub}</div>
    </div>
  );
}

function RiskPill({ label, score }) {
  const cls =
    score < 25
      ? "bg-emerald-400/20 text-emerald-200 ring-emerald-300/20"
      : score < 55
      ? "bg-yellow-400/20 text-yellow-200 ring-yellow-300/20"
      : score < 80
      ? "bg-orange-400/20 text-orange-200 ring-orange-300/20"
      : "bg-red-500/20 text-red-200 ring-red-300/20";

  return (
    <div className={`rounded-full px-3 py-1 text-xs ring-1 ${cls}`}>
      {label} • {score}%
    </div>
  );
}
