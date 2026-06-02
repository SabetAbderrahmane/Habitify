import { useEffect, useMemo, useState } from "react";
import { FiRefreshCw } from "react-icons/fi";
import InsightsPanel from "../components/InsightsPanel";
import { useHabits } from "../context/HabitsContext";
import { fetchLapseRisk } from "../lib/predictions";
import Button from "../components/ui/Button";

export default function InsightsPage() {
  const { habitDefinitions, habitLogs, allHabitLogs } = useHabits();
  const [predictions, setPredictions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [riskFilter, setRiskFilter] = useState("all");

  const logsForInsights = useMemo(() => {
    return Array.isArray(allHabitLogs) && allHabitLogs.length ? allHabitLogs : habitLogs;
  }, [allHabitLogs, habitLogs]);

  const loadInsights = async ({ quiet = false } = {}) => {
    if (quiet) setRefreshing(true);
    else setLoading(true);
    setError("");

    try {
      const riskData = await fetchLapseRisk();
      setPredictions(Array.isArray(riskData) ? riskData : []);
    } catch (err) {
      setPredictions([]);
      setError(err?.response?.data?.detail || err?.message || "Failed to load lapse-risk predictions.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadInsights();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [habitDefinitions.length]);

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 border-b border-[var(--color-border)] pb-5 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--color-accent)]">AI INSIGHTS</div>
          <h1 className="mt-2 text-3xl font-semibold tracking-[-0.02em] text-[var(--color-text-primary)] md:text-4xl">
            Wellness Intelligence
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--color-text-secondary)]">
            Model-based habit risk signals and explainable recommendations.
          </p>
        </div>

        <Button variant="secondary" onClick={() => loadInsights({ quiet: true })} disabled={loading || refreshing}>
          <FiRefreshCw />
          {refreshing ? "Refreshing..." : "Refresh insights"}
        </Button>
      </header>

      <InsightsPanel
        logs={logsForInsights}
        predictions={predictions}
        loading={loading}
        error={error}
        riskFilter={riskFilter}
        onRiskFilterChange={setRiskFilter}
      />
    </div>
  );
}
