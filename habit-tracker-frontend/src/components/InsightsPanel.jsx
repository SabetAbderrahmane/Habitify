import { useMemo, useRef, useState } from "react";
import {
  FiActivity,
  FiAlertTriangle,
  FiBarChart2,
  FiChevronDown,
  FiChevronUp,
  FiCpu,
  FiDatabase,
  FiTarget,
  FiTrendingUp,
} from "react-icons/fi";
import Badge from "./ui/Badge";
import Button from "./ui/Button";
import Card from "./ui/Card";
import EmptyState from "./ui/EmptyState";
import Skeleton from "./ui/Skeleton";

function scoreToPercent(value) {
  const n = Number(value || 0);
  if (!Number.isFinite(n)) return 0;
  return Math.round(Math.max(0, Math.min(100, n <= 1 ? n * 100 : n)));
}

function confidenceLabel(prediction) {
  const raw = prediction?.confidence ?? prediction?.confidence_score;
  if (raw == null) return "Not provided";
  return `${scoreToPercent(raw)}%`;
}

function riskTone(level = "") {
  const normalized = String(level).toLowerCase();
  if (normalized === "high") return "red";
  if (normalized === "medium") return "amber";
  if (normalized === "low") return "green";
  return "slate";
}

function sourceLabel(source = "") {
  if (source === "ml") return "Hybrid ML";
  if (source === "rule_based_fallback") return "Rule-based fallback";
  return source || "Unknown";
}

function sortedByDate(logs = []) {
  return [...logs].filter((log) => log?.date).sort((a, b) => String(a.date).localeCompare(String(b.date)));
}

function completionRate(logs = []) {
  if (!logs.length) return null;
  const complete = logs.filter((log) => Number(log.progress || 0) >= 80).length;
  return Math.round((complete / logs.length) * 100);
}

function windowCompletion(logs = [], startOffset, endOffset) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const start = new Date(today);
  start.setDate(today.getDate() + startOffset);
  const end = new Date(today);
  end.setDate(today.getDate() + endOffset);

  const inWindow = logs.filter((log) => {
    if (!log.date) return false;
    const d = new Date(`${log.date}T00:00:00`);
    return d >= start && d <= end;
  });
  return completionRate(inWindow);
}

export default function InsightsPanel({
  logs,
  predictions,
  loading = false,
  error = "",
  riskFilter = "all",
  onRiskFilterChange,
}) {
  const detailsRef = useRef(null);
  const [showReviewCard, setShowReviewCard] = useState(true);
  const [expanded, setExpanded] = useState(false);

  const orderedPredictions = useMemo(() => {
    const list = Array.isArray(predictions) ? predictions : [];
    return [...list].sort((a, b) => Number(b.lapse_risk_score || 0) - Number(a.lapse_risk_score || 0));
  }, [predictions]);

  const filteredPredictions = useMemo(() => {
    if (riskFilter === "all") return orderedPredictions;
    return orderedPredictions.filter((prediction) => String(prediction.risk_level || "").toLowerCase() === riskFilter);
  }, [orderedPredictions, riskFilter]);

  const primaryPrediction = orderedPredictions[0] || null;
  const logHistory = useMemo(() => sortedByDate(logs || []), [logs]);

  const metrics = useMemo(() => {
    const consistency = completionRate(logHistory);
    const recent7 = windowCompletion(logHistory, -6, 0);
    const previous7 = windowCompletion(logHistory, -13, -7);
    const trend =
      recent7 == null || previous7 == null
        ? null
        : {
            recent: recent7,
            previous: previous7,
            delta: recent7 - previous7,
          };

    return {
      consistency,
      trend,
      modelSource: sourceLabel(primaryPrediction?.source),
      riskPercent: primaryPrediction ? scoreToPercent(primaryPrediction.lapse_risk_score) : null,
    };
  }, [logHistory, primaryPrediction]);

  const showDetails = () => {
    setExpanded(true);
    setTimeout(() => detailsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 0);
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-6 xl:grid-cols-12">
          <Skeleton className="h-[360px] xl:col-span-8" />
          <div className="grid gap-4 xl:col-span-4">
            <Skeleton className="h-[120px]" />
            <Skeleton className="h-[120px]" />
            <Skeleton className="h-[120px]" />
          </div>
        </div>
        <Skeleton className="h-[220px]" />
      </div>
    );
  }

  if (error) {
    return (
      <Card className="rounded-[24px] border-red-200 bg-red-50 p-6">
        <div className="flex items-start gap-4">
          <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-white text-red-700">
            <FiAlertTriangle />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-red-800">Insights could not load</h2>
            <p className="mt-2 text-sm leading-6 text-red-700">{error}</p>
          </div>
        </div>
      </Card>
    );
  }

  if (!orderedPredictions.length) {
    return (
      <EmptyState
        title="No prediction signals yet"
        description="The lapse-risk endpoint did not return predictions. Keep logging real habits so the model can evaluate risk."
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-6 xl:grid-cols-12">
        <Card className="rounded-[24px] p-7 xl:col-span-8">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="grid h-12 w-12 place-items-center rounded-2xl bg-indigo-50 text-sm font-bold text-[var(--color-accent)] ring-1 ring-indigo-100">
                AI
              </div>
              <div>
                <div className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--color-accent)]">High-Impact Discovery</div>
                <div className="mt-1 text-sm text-[var(--color-text-secondary)]">Pattern Recognition</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge tone={riskTone(primaryPrediction.risk_level)}>{primaryPrediction.risk_level || "Unknown"} risk</Badge>
              {primaryPrediction.confidence != null || primaryPrediction.confidence_score != null ? (
                <Badge tone="indigo">{confidenceLabel(primaryPrediction)} confidence</Badge>
              ) : null}
            </div>
          </div>

          <h2 className="mt-7 max-w-3xl text-3xl font-semibold leading-tight tracking-[-0.02em] text-[var(--color-text-primary)] md:text-[34px]">
            {primaryPrediction.habit_name || "This habit"} is currently the strongest lapse-risk signal.
          </h2>

          <div className="mt-6 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-soft)] p-5 shadow-[inset_4px_0_0_#3337a6]">
            <div className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--color-text-primary)]">Recommendation</div>
            <p className="mt-3 text-base leading-7 text-[var(--color-text-primary)]">
              {primaryPrediction.recommendation || "The model returned a risk signal but did not include a recommendation."}
            </p>
          </div>

          <div className="mt-5 border-t border-[var(--color-border)] pt-5 text-sm leading-6 text-[var(--color-text-secondary)]">
            <span className="font-semibold text-[var(--color-text-primary)]">Explained reasoning:</span>{" "}
            {primaryPrediction.factors?.length
              ? primaryPrediction.factors.slice(0, 3).join("; ")
              : "No factor explanation was returned by the prediction endpoint."}
          </div>
        </Card>

        <div className="grid gap-4 xl:col-span-4">
          <MetricCard
            icon={FiAlertTriangle}
            label="Lapse Risk"
            value={metrics.riskPercent == null ? "No data" : `${metrics.riskPercent}%`}
            meta={primaryPrediction.risk_level || "Unknown level"}
            tone={riskTone(primaryPrediction.risk_level)}
            footer={`Source: ${sourceLabel(primaryPrediction.source)}`}
          />
          <MetricCard
            icon={FiTarget}
            label="Consistency"
            value={metrics.consistency == null ? "No logs" : `${metrics.consistency}%`}
            meta="Completion across available logs"
            footer={`${logHistory.length} real log${logHistory.length === 1 ? "" : "s"} analyzed`}
          />
          <MetricCard
            icon={FiTrendingUp}
            label="Trend"
            value={metrics.trend == null ? "No window" : `${metrics.trend.delta >= 0 ? "+" : ""}${metrics.trend.delta}%`}
            meta={metrics.trend == null ? "Need two 7-day windows" : "Last 7 days vs previous 7"}
            footer={metrics.trend == null ? "Keep logging to calculate trend" : `${metrics.trend.recent}% vs ${metrics.trend.previous}%`}
          />
          <MetricCard
            icon={FiCpu}
            label="Model Source"
            value={metrics.modelSource}
            meta={primaryPrediction.confidence_type || "Backend prediction response"}
            footer={confidenceLabel(primaryPrediction) === "Not provided" ? "Confidence not provided" : `${confidenceLabel(primaryPrediction)} confidence`}
          />
        </div>
      </div>

      {showReviewCard && primaryPrediction ? (
        <Card className="rounded-[24px] border-amber-200 bg-amber-50/70 p-6 shadow-[0_8px_24px_rgba(146,64,14,0.06)]">
          <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
            <div className="flex gap-4">
              <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-white text-amber-700 ring-1 ring-amber-100">
                <FiAlertTriangle />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-[var(--color-text-primary)]">Review Recommended</h3>
                <p className="mt-2 text-sm leading-6 text-[var(--color-text-secondary)]">
                  The model returned a high-risk signal for {primaryPrediction.habit_name || "this habit"}.
                </p>
              </div>
            </div>
            <div className="flex shrink-0 gap-3 md:self-end">
              <Button variant="secondary" onClick={() => setShowReviewCard(false)}>
                Dismiss
              </Button>
              <Button onClick={showDetails}>
                View Data
              </Button>
            </div>
          </div>
        </Card>
      ) : null}

      <Card className="rounded-[24px] p-6" ref={detailsRef}>
        <div className="flex flex-col gap-4 border-b border-[var(--color-border)] pb-5 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-xl font-semibold text-[var(--color-text-primary)]">Prediction Details</h2>
            <p className="mt-1 text-sm text-[var(--color-text-secondary)]">Sorted by risk score from the backend response.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {["all", "high", "medium", "low"].map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => onRiskFilterChange?.(item)}
                className={[
                  "rounded-full px-3 py-1.5 text-xs font-bold uppercase tracking-[0.12em] ring-1 transition",
                  riskFilter === item
                    ? "bg-[var(--color-accent)] text-white ring-[var(--color-accent)]"
                    : "bg-white text-[var(--color-text-secondary)] ring-[var(--color-border)] hover:bg-[var(--color-surface-soft)]",
                ].join(" ")}
              >
                {item}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setExpanded((value) => !value)}
              className="ml-1 inline-flex items-center gap-2 rounded-full border border-[var(--color-border)] px-3 py-1.5 text-xs font-bold uppercase tracking-[0.12em] text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-soft)]"
            >
              {expanded ? <FiChevronUp /> : <FiChevronDown />}
              {expanded ? "Collapse" : "Expand"}
            </button>
          </div>
        </div>

        {filteredPredictions.length === 0 ? (
          <div className="mt-5 rounded-2xl border border-dashed border-[var(--color-border)] bg-[var(--color-surface-soft)] p-6 text-center">
            <div className="text-sm font-semibold text-[var(--color-text-primary)]">No predictions match this filter</div>
            <div className="mt-2 text-sm text-[var(--color-text-secondary)]">Try All, or wait for more backend prediction data.</div>
          </div>
        ) : (
          <div className="mt-5 grid gap-4 lg:grid-cols-2">
            {(expanded ? filteredPredictions : filteredPredictions.slice(0, 4)).map((prediction) => (
              <PredictionCard key={prediction.habit_id || prediction.habit_name} prediction={prediction} />
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

function MetricCard({ icon: Icon, label, value, meta, footer, tone = "slate" }) {
  const toneClass =
    tone === "red"
      ? "bg-red-50 text-red-700 ring-red-100"
      : tone === "amber"
      ? "bg-amber-50 text-amber-800 ring-amber-100"
      : tone === "green"
      ? "bg-emerald-50 text-emerald-700 ring-emerald-100"
      : "bg-indigo-50 text-[var(--color-accent)] ring-indigo-100";

  return (
    <Card className="rounded-[22px] p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--color-text-muted)]">{label}</div>
          <div className="mt-3 text-2xl font-semibold leading-tight text-[var(--color-text-primary)]">{value}</div>
        </div>
        <div className={`grid h-10 w-10 place-items-center rounded-2xl ring-1 ${toneClass}`}>
          <Icon aria-hidden="true" />
        </div>
      </div>
      <div className="mt-3 text-sm leading-5 text-[var(--color-text-secondary)]">{meta}</div>
      {footer ? <div className="mt-4 border-t border-[var(--color-border)] pt-3 text-xs text-[var(--color-text-muted)]">{footer}</div> : null}
    </Card>
  );
}

function PredictionCard({ prediction }) {
  return (
    <article className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-soft)] p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold text-[var(--color-text-primary)]">{prediction.habit_name || "Unnamed habit"}</h3>
          <div className="mt-1 text-sm text-[var(--color-text-secondary)]">{sourceLabel(prediction.source)}</div>
        </div>
        <Badge tone={riskTone(prediction.risk_level)}>{scoreToPercent(prediction.lapse_risk_score)}% risk</Badge>
      </div>

      <div className="mt-4 grid gap-3 text-sm sm:grid-cols-3">
        <DetailStat icon={FiActivity} label="Level" value={prediction.risk_level || "Unknown"} />
        <DetailStat icon={FiDatabase} label="Confidence" value={confidenceLabel(prediction)} />
        <DetailStat icon={FiBarChart2} label="Source" value={prediction.source || "Unknown"} />
      </div>

      {prediction.factors?.length ? (
        <div className="mt-4">
          <div className="text-xs font-bold uppercase tracking-[0.12em] text-[var(--color-text-muted)]">Top factors</div>
          <ul className="mt-2 space-y-1 text-sm leading-6 text-[var(--color-text-secondary)]">
            {prediction.factors.slice(0, 3).map((factor) => (
              <li key={factor}>- {factor}</li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="mt-4 rounded-xl bg-white p-4 text-sm leading-6 text-[var(--color-text-secondary)]">
        {prediction.recommendation || "No recommendation returned."}
      </div>
    </article>
  );
}

function DetailStat({ icon: Icon, label, value }) {
  return (
    <div className="rounded-xl bg-white p-3">
      <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.1em] text-[var(--color-text-muted)]">
        <Icon aria-hidden="true" />
        {label}
      </div>
      <div className="mt-2 text-sm font-semibold text-[var(--color-text-primary)]">{value}</div>
    </div>
  );
}
