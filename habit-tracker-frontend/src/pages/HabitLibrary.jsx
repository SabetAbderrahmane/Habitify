import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { FiBookOpen, FiCheckCircle, FiClock, FiTarget } from "react-icons/fi";
import { useHabits } from "../context/HabitsContext";
import { fetchAllHabitLogs } from "../lib/habits";
import { useToast } from "../components/ToastProvider";
import Badge from "../components/ui/Badge";
import Button from "../components/ui/Button";
import Card from "../components/ui/Card";
import EmptyState from "../components/ui/EmptyState";
import FilterBar from "../components/ui/FilterBar";
import PageHeader from "../components/ui/PageHeader";
import ProgressBar from "../components/ui/ProgressBar";
import { SkeletonGrid } from "../components/ui/Skeleton";
import StatCard from "../components/ui/StatCard";

export default function HabitLibrary() {
  const { habitDefinitions } = useHabits();
  const toast = useToast();

  const [allLogs, setAllLogs] = useState([]);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const [status, setStatus] = useState("all");
  const [sort, setSort] = useState("name");

  useEffect(() => {
    let alive = true;

    async function loadLogs() {
      setLoadingLogs(true);

      try {
        const data = await fetchAllHabitLogs();
        if (alive) {
          setAllLogs(Array.isArray(data) ? data : []);
        }
      } catch (e) {
        if (alive) {
          setAllLogs([]);
          toast.error("Failed to load habit history", e?.message || "Unknown error");
        }
      } finally {
        if (alive) {
          setLoadingLogs(false);
        }
      }
    }

    loadLogs();

    return () => {
      alive = false;
    };
  }, [toast]);

  const library = useMemo(() => {
    return (habitDefinitions || []).map((habit) => {
      const logs = (allLogs || []).filter((log) => {
        return log.habit_id === habit.id || log.name === habit.name;
      });

      const sortedLogs = [...logs].sort((a, b) =>
        String(a.date || "").localeCompare(String(b.date || ""))
      );

      const avg = sortedLogs.length
        ? Math.round(
            sortedLogs.reduce((sum, log) => {
              return sum + Number(log.progress || 0);
            }, 0) / sortedLogs.length
          )
        : 0;

      const last = sortedLogs[sortedLogs.length - 1];

      return {
        id: habit.id,
        name: habit.name,
        category: habit.category,
        target: habit.target,
        archived: Boolean(habit.archived),
        totalLogs: sortedLogs.length,
        avgProgress: avg,
        lastProgress: last?.progress ?? 0,
        lastDate: last?.date || "No logs",
      };
    });
  }, [habitDefinitions, allLogs]);

  const categories = useMemo(() => {
    const set = new Set(library.map((habit) => habit.category || "Other"));
    return ["all", ...[...set].sort()];
  }, [library]);

  const filteredLibrary = useMemo(() => {
    let list = library;
    const q = query.trim().toLowerCase();
    if (q) {
      list = list.filter((habit) => habit.name.toLowerCase().includes(q));
    }
    if (category !== "all") {
      list = list.filter((habit) => (habit.category || "Other") === category);
    }
    if (status === "logged") {
      list = list.filter((habit) => habit.totalLogs > 0);
    }
    if (status === "not_logged") {
      list = list.filter((habit) => habit.totalLogs === 0);
    }
    if (status === "strong") {
      list = list.filter((habit) => habit.avgProgress >= 80);
    }
    if (status === "needs_attention") {
      list = list.filter((habit) => habit.totalLogs > 0 && habit.avgProgress < 50);
    }

    return [...list].sort((a, b) => {
      if (sort === "progress") return b.avgProgress - a.avgProgress;
      if (sort === "recent") return String(b.lastDate).localeCompare(String(a.lastDate));
      if (sort === "logs") return b.totalLogs - a.totalLogs;
      return a.name.localeCompare(b.name);
    });
  }, [library, query, category, status, sort]);

  const stats = useMemo(() => {
    const total = library.length;
    const logged = library.filter((habit) => habit.totalLogs > 0).length;
    const avg = total
      ? Math.round(library.reduce((sum, habit) => sum + habit.avgProgress, 0) / total)
      : 0;
    const strong = library.filter((habit) => habit.avgProgress >= 80).length;
    return { total, logged, avg, strong };
  }, [library]);

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Habit library"
        title="Organize every routine"
        description="Search, filter, and compare habits using your real log history."
        actions={
          <Button as={Link} to="/app" variant="secondary">
            Back to Dashboard
          </Button>
        }
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total habits" value={stats.total} sub="Definitions" icon={FiBookOpen} />
        <StatCard label="Logged habits" value={stats.logged} sub="With history" icon={FiCheckCircle} tone="green" />
        <StatCard label="Average progress" value={`${stats.avg}%`} sub="Across library" icon={FiTarget} tone="slate" />
        <StatCard label="Strong habits" value={stats.strong} sub="≥ 80% avg" icon={FiClock} tone="amber" />
      </div>

      <FilterBar
        search={query}
        onSearch={setQuery}
        resultText={`Showing ${filteredLibrary.length} of ${library.length} habits`}
        filters={[
          {
            label: "Category",
            value: category,
            onChange: setCategory,
            options: categories.map((item) => ({
              value: item,
              label: item === "all" ? "All categories" : item,
            })),
          },
          {
            label: "Status",
            value: status,
            onChange: setStatus,
            options: [
              { value: "all", label: "All status" },
              { value: "logged", label: "Logged" },
              { value: "not_logged", label: "Not logged" },
              { value: "strong", label: "Strong" },
              { value: "needs_attention", label: "Needs attention" },
            ],
          },
          {
            label: "Sort",
            value: sort,
            onChange: setSort,
            options: [
              { value: "name", label: "Name" },
              { value: "recent", label: "Recent" },
              { value: "progress", label: "Progress" },
              { value: "logs", label: "Logs" },
            ],
          },
        ]}
      />

      {loadingLogs ? (
        <SkeletonGrid count={6} />
      ) : library.length === 0 ? (
        <EmptyState
          title="No habits yet"
          description="Start logging habits and they will appear here as a clean library."
          actionLabel="Go to Dashboard"
          actionTo="/app"
        />
      ) : filteredLibrary.length === 0 ? (
        <EmptyState
          title="No matching habits"
          description="Try a broader search, category, or status filter."
          actionLabel="Clear filters"
          onAction={() => {
            setQuery("");
            setCategory("all");
            setStatus("all");
            setSort("name");
          }}
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filteredLibrary.map((habit) => (
            <Card
              as={Link}
              key={habit.id || habit.name}
              to={`/app/habit/${encodeURIComponent(habit.name)}`}
              className="block transition hover:-translate-y-0.5 hover:shadow-[0_10px_28px_rgba(15,23,42,0.08)]"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-lg font-semibold text-slate-950">{habit.name}</div>
                  <div className="mt-1 text-sm text-slate-500">
                    {habit.target || "Daily"}
                  </div>
                </div>
                <Badge tone={habit.avgProgress >= 80 ? "green" : habit.totalLogs ? "amber" : "slate"}>
                  {habit.category || "General"}
                </Badge>
              </div>

              <ProgressBar value={habit.avgProgress} label="Average progress" className="mt-5" />

              <div className="mt-5 grid grid-cols-3 gap-2 text-sm text-slate-700">
                <div>
                  <div className="text-xs text-slate-500">Logs</div>
                  <div className="text-lg font-semibold text-slate-950">{habit.totalLogs}</div>
                </div>

                <div>
                  <div className="text-xs text-slate-500">Avg</div>
                  <div className="text-lg font-semibold text-slate-950">
                    {habit.avgProgress}%
                  </div>
                </div>

                <div>
                  <div className="text-xs text-slate-500">Last</div>
                  <div className="text-lg font-semibold text-slate-950">
                    {habit.lastProgress}%
                  </div>
                </div>
              </div>

              <div className="mt-4 text-xs text-slate-500">
                Last logged: {habit.lastDate}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
