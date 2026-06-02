import StreakCalendar from "../components/StreakCalendar";
import { useHabits } from "../context/HabitsContext";
import Button from "../components/ui/Button";
import { FiRefreshCw } from "react-icons/fi";
import { useState } from "react";

export default function CalendarPage() {
  const { allHabitLogs, refreshAllHabitLogs, loading, error } = useHabits();
  const [refreshing, setRefreshing] = useState(false);

  const refresh = async () => {
    setRefreshing(true);
    try {
      await refreshAllHabitLogs();
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-[var(--color-text-primary)]">Calendar</h1>
          <p className="mt-2 text-[var(--color-text-secondary)]">Explore your momentum over time.</p>
        </div>
        <Button variant="secondary" onClick={refresh} disabled={refreshing || loading}>
          <FiRefreshCw />
          {refreshing ? "Refreshing..." : "Refresh"}
        </Button>
      </div>
      {error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>
      ) : null}
      <StreakCalendar habits={allHabitLogs} />
    </div>
  );
}
