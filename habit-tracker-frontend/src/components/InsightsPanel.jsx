import { useMemo, useState } from "react";
import Badge from "./ui/Badge";
import Button from "./ui/Button";
import Card from "./ui/Card";
import ProgressBar from "./ui/ProgressBar";
import Skeleton from "./ui/Skeleton";

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

export default function InsightsPanel({ habits, logs, predictions, contextCorrelations, loading = false, goodThreshold = 70 }) {
  const [expanded, setExpanded] = useState({ nudge: true, patterns: false, context: false });
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

  if (loading) {
    return (
      <Card>
        <Skeleton className="h-8 w-56" />
        <div className="mt-5 grid gap-4 md:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-28" />
          ))}
        </div>
      </Card>
    );
  }

  const contextAvailable = Boolean(contextCorrelations?.available);

  return (
    <Card className="border-indigo-100 bg-white">
      <div className="flex items-end justify-between gap-4">
        <div>
          <div className="text-lg font-semibold text-slate-950">AI Insights</div>
          <div className="mt-1 text-sm text-slate-600">
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
        <InsightCard
          title="Best days"
          open={expanded.patterns}
          onToggle={() => setExpanded((prev) => ({ ...prev, patterns: !prev.patterns }))}
        >
          <div className="text-2xl font-semibold text-slate-950">
            {insights.bestDays?.length ? insights.bestDays.join(" & ") : "—"}
          </div>
          <div className="mt-2 text-sm leading-6 text-slate-600">
            Schedule harder habits on your best days for higher success.
          </div>
        </InsightCard>

        <InsightCard
          title="Smart nudge (ML)"
          open={expanded.nudge}
          onToggle={() => setExpanded((prev) => ({ ...prev, nudge: !prev.nudge }))}
          glow
        >
          <div className="text-sm leading-6 text-slate-700">{insights.nudge}</div>
          <div className="mt-3 text-xs text-slate-500">
            Predictions powered by Hybrid LSTM-Tabular Model.
          </div>
        </InsightCard>
      </div>

      {contextAvailable ? (
        <InsightCard
          title="Sleep and weather context"
          open={expanded.context}
          onToggle={() => setExpanded((prev) => ({ ...prev, context: !prev.context }))}
          className="mt-5"
        >
          <div className="grid gap-4 md:grid-cols-2">
            <ContextBuckets title="Sleep bands" buckets={contextCorrelations.completion_rate_by_sleep_band} />
            <ContextBuckets title="Weather" buckets={contextCorrelations.completion_rate_by_weather} />
          </div>
        </InsightCard>
      ) : null}
    </Card>
  );
}

function Metric({ title, value, sub }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
      <div className="text-sm font-semibold text-slate-500">{title}</div>
      <div className="mt-2 text-3xl font-semibold text-slate-950">{value}</div>
      <div className="mt-1 text-xs text-slate-500">{sub}</div>
    </div>
  );
}

function RiskPill({ label, score }) {
  const tone =
    score < 25
      ? "green"
      : score < 55
      ? "amber"
      : score < 80
      ? "amber"
      : "red";

  return (
    <Badge tone={tone}>
      {label} • {score}%
    </Badge>
  );
}

function InsightCard({ title, open, onToggle, children, glow = false, className = "" }) {
  return (
    <div className={[
      "rounded-2xl border bg-white p-4",
      glow ? "border-indigo-100 shadow-[0_0_12px_rgba(51,55,166,0.14)]" : "border-slate-200",
      className,
    ].join(" ")}>
      <div className="flex items-center justify-between gap-3">
        <div className="text-sm font-semibold text-slate-600">{title}</div>
        <Button size="sm" variant="ghost" onClick={onToggle} aria-expanded={open}>
          {open ? "Collapse" : "Expand"}
        </Button>
      </div>
      {open ? <div className="mt-3">{children}</div> : null}
    </div>
  );
}

function ContextBuckets({ title, buckets = {} }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
      <div className="text-sm font-semibold text-slate-700">{title}</div>
      <div className="mt-4 space-y-3">
        {Object.entries(buckets).map(([key, value]) => (
          <div key={key}>
            <div className="mb-1 flex items-center justify-between text-xs text-slate-500">
              <span>{key}</span>
              <span>
                {value.completion_rate == null ? "More samples needed" : `${value.completion_rate}%`}
              </span>
            </div>
            <ProgressBar value={value.completion_rate || 0} />
          </div>
        ))}
      </div>
    </div>
  );
}
