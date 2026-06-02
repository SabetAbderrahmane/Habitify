import { useMemo, useState } from "react";

function toISODate(d) {
  return d.toISOString().slice(0, 10);
}

function startOfWeekMonday(date) {
  const d = new Date(date);
  const day = d.getDay(); // 0 Sun ... 6 Sat
  const diff = (day === 0 ? -6 : 1) - day; // shift to Monday
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function clamp(n, a, b) {
  return Math.max(a, Math.min(b, n));
}

function intensity(progress) {
  const p = clamp(Number(progress || 0), 0, 100);
  if (p === 0) return 0;
  if (p < 25) return 1;
  if (p < 50) return 2;
  if (p < 75) return 3;
  return 4;
}

const LEVELS = [
  "bg-[#eef1f3] ring-[#e0e3e5]",
  "bg-[#dfe1ff] ring-[#c9ccff]",
  "bg-[#bfc3ff] ring-[#aeb3f7]",
  "bg-[#767bd6] ring-[#686dce]",
  "bg-[#3337a6] ring-[#3337a6]",
];

const RANGE_OPTIONS = [
  { key: "7d", label: "Last 7 days", days: 7 },
  { key: "30d", label: "Last 30 days", days: 30 },
  { key: "12w", label: "Last 12 weeks", days: 7 * 12 },
  { key: "6m", label: "Last 6 months", days: 30 * 6 }, // approximate
];

export default function StreakCalendar({ habits, mode = "expanded", title = "Activity Map" }) {
  const [hover, setHover] = useState(null);
  const hasLogs = (habits || []).some((habit) => habit?.date);
  const compact = mode === "compact";

  const [range, setRange] = useState(compact ? "12w" : "12w");
  const [showMode, setShowMode] = useState("all"); // all | completed | struggling
  const [metric, setMetric] = useState("max"); // max | avg

  const [dayFilter, setDayFilter] = useState("all"); // all | weekdays | weekends
  const [heatMode, setHeatMode] = useState("progress"); // progress | count

  const dayMap = useMemo(() => {
    // We compute BOTH:
    // - progressValue per day (max or avg)
    // - count per day (number of habit entries that day)
    const totals = new Map(); // iso -> {sum, count, max}

    for (const h of habits || []) {
      const iso = h?.date;
      if (!iso) continue;

      const p = clamp(Number(h?.progress || 0), 0, 100);

      const cur = totals.get(iso) || { sum: 0, count: 0, max: 0 };
      cur.sum += p;
      cur.count += 1;
      cur.max = Math.max(cur.max, p);
      totals.set(iso, cur);
    }

    const map = new Map(); // iso -> value used for coloring

    for (const [iso, agg] of totals.entries()) {
      if (heatMode === "count") {
        // clamp count into a 0..100 scale for intensity mapping
        // 1 habit => 25, 2 => 50, 3 => 75, 4+ => 100
        const scaled = clamp(agg.count * 25, 0, 100);
        map.set(iso, scaled);
      } else {
        const val = metric === "avg" ? Math.round(agg.sum / agg.count) : agg.max;
        map.set(iso, val);
      }
    }

    return { map, totals };
  }, [habits, metric, heatMode]);

  const { weeks, labels, totalDays } = useMemo(() => {
    const opt = RANGE_OPTIONS.find((o) => o.key === range) || RANGE_OPTIONS[2];
    const days = opt.days;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // We render whole weeks to keep the grid clean
    const end = today;
    const start = new Date(today);
    start.setDate(start.getDate() - (days - 1));
    start.setHours(0, 0, 0, 0);

    const weekStart = startOfWeekMonday(start);

    // number of weeks = ceil(days / 7) but we render whole weeks
    const numWeeks = Math.ceil(days / 7);
    const total = numWeeks * 7;

    const cells = [];
    for (let i = 0; i < total; i++) {
      const d = new Date(weekStart);
      d.setDate(d.getDate() + i);

      const iso = toISODate(d);
      const prog = dayMap.map.get(iso) ?? 0;

      let filteredProg = prog;
      // Weekday filter
      const dow = d.getDay(); // 0 Sun ... 6 Sat
      const isWeekend = dow === 0 || dow === 6;

      if (dayFilter === "weekdays" && isWeekend) filteredProg = 0;
      if (dayFilter === "weekends" && !isWeekend) filteredProg = 0;

      // Show-mode filter (based on filteredProg after weekday filter)
      if (showMode === "completed") {
        filteredProg = filteredProg >= 80 ? filteredProg : 0;
      } else if (showMode === "struggling") {
        filteredProg = filteredProg > 0 && filteredProg <= 30 ? filteredProg : 0;
      }

      cells.push({ date: d, iso, prog, filteredProg, lvl: intensity(filteredProg) });
    }

    const w = [];
    for (let i = 0; i < numWeeks; i++) {
      w.push(cells.slice(i * 7, i * 7 + 7));
    }

    const monthLabels = w.map((col) => {
      const top = col[0]?.date;
      if (!top) return "";
      return top.getDate() <= 7 ? top.toLocaleString(undefined, { month: "short" }) : "";
    });

    return { weeks: w, labels: monthLabels, totalDays: total };
  }, [dayMap, range, showMode, dayFilter]);

  const legendLabel = useMemo(() => {
    if (showMode === "completed") return "Completed only (≥80%)";
    if (showMode === "struggling") return "Struggling only (≤30%)";
    return "All activity";
  }, [showMode]);

  return (
    <div className="rounded-3xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-[0_10px_30px_rgba(24,28,30,0.04)]">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <div className="text-2xl font-semibold tracking-[-0.01em] text-[var(--color-text-primary)]">{title}</div>
          {!compact ? (
            <div className="mt-1 text-sm text-[var(--color-text-secondary)]">
              {legendLabel} • {heatMode === "count" ? "Count/day" : metric === "avg" ? "Avg/day" : "Max/day"} •{" "}
              {dayFilter === "all" ? "All days" : dayFilter === "weekdays" ? "Weekdays" : "Weekends"} • {range.toUpperCase()}
            </div>
          ) : null}
        </div>

        {/* Filters */}
        {!compact ? (
        <div className="flex flex-wrap items-center gap-3">
          {/* Range segmented */}
          <Segmented
            label="Range"
            value={range}
            onChange={setRange}
            options={[
              { value: "7d", label: "7D" },
              { value: "30d", label: "30D" },
              { value: "12w", label: "12W" },
              { value: "6m", label: "6M" },
            ]}
          />

          {/* Show mode */}
          <PillSelect
            label="Show"
            value={showMode}
            onChange={setShowMode}
            options={[
              { value: "all", label: "All" },
              { value: "completed", label: "Completed" },
              { value: "struggling", label: "Struggling" },
            ]}
          />

          {/* Metric */}
          <PillSelect
            label="Metric"
            value={metric}
            onChange={setMetric}
            options={[
              { value: "max", label: "Max/day" },
              { value: "avg", label: "Avg/day" },
            ]}
          />

          <PillSelect
            label="Days"
            value={dayFilter}
            onChange={setDayFilter}
            options={[
              { value: "all", label: "All" },
              { value: "weekdays", label: "Weekdays" },
              { value: "weekends", label: "Weekends" },
            ]}
          />

          <PillSelect
            label="Heat"
            value={heatMode}
            onChange={setHeatMode}
            options={[
              { value: "progress", label: "Progress" },
              { value: "count", label: "Count" },
            ]}
          />
        </div>
        ) : (
          <span className="rounded-lg bg-[#ebeef0] px-3 py-1 text-xs font-semibold tracking-[0.08em] text-[#181c1e]">
            Last 3 Months
          </span>
        )}
      </div>

      {!compact ? (
      <div className="mt-4 flex items-center justify-between gap-4 text-xs text-[var(--color-text-muted)]">
        <div>{`Rendering ${totalDays} days (whole weeks)`}</div>
        <div className="flex items-center gap-2">
          <span>Less</span>
          {[0, 1, 2, 3, 4].map((i) => (
            <span key={i} className={`h-3 w-3 rounded-sm ring-1 ${LEVELS[i]}`} />
          ))}
          <span>More</span>
        </div>
      </div>
      ) : null}

      {!hasLogs ? (
        <div className="mt-5 rounded-2xl border border-dashed border-[var(--color-border)] bg-[var(--color-surface-soft)] p-6 text-center">
          <div className="text-sm font-semibold text-[var(--color-text-primary)]">No habit logs yet</div>
          <div className="mx-auto mt-2 max-w-md text-sm leading-6 text-[var(--color-text-secondary)]">
            Log a habit from the dashboard and this heatmap will show your activity by day.
          </div>
        </div>
      ) : null}

      <div className={compact ? "mt-7 overflow-x-auto" : "mt-5 overflow-x-auto"}>
        <div className={compact ? "w-max" : "w-max min-w-[620px]"}>
          {/* Month labels */}
          <div
            className={compact ? "mb-2 grid gap-1 text-[11px] font-medium text-[var(--color-text-muted)]" : "mb-2 grid gap-1 text-xs font-medium text-[var(--color-text-muted)]"}
            style={{ gridTemplateColumns: `${compact ? "26px" : "30px"} repeat(${weeks.length}, ${compact ? "14px" : "18px"})` }}
          >
            <div />
            {labels.map((m, i) => (
              <div key={i} className="pl-1">{m}</div>
            ))}
          </div>

          {/* Grid */}
          <div
            className="grid gap-1"
            style={{ gridTemplateColumns: `${compact ? "26px" : "30px"} repeat(${weeks.length}, ${compact ? "14px" : "18px"})` }}
          >
            {/* Weekday labels */}
            <div className={compact ? "grid grid-rows-7 gap-1 text-[11px] font-medium text-[var(--color-text-muted)]" : "grid grid-rows-7 gap-1 text-xs font-medium text-[var(--color-text-muted)]"}>
              {["Mon", "", "Wed", "", "Fri", "", "Sun"].map((d, i) => (
                <div key={i} className={compact ? "h-3.5 leading-[14px]" : "h-[18px] leading-[18px]"}>{d}</div>
              ))}
            </div>

            {weeks.map((col, cIdx) => (
              <div key={cIdx} className="grid grid-rows-7 gap-1">
                {col.map((cell, rIdx) => (
                  <button
                    key={rIdx}
                    type="button"
                    onMouseEnter={() => setHover(cell)}
                    onMouseLeave={() => setHover(null)}
                    className={`${compact ? "h-3.5 w-3.5" : "h-[18px] w-[18px]"} rounded-[4px] ring-1 transition ${LEVELS[cell.lvl]} hover:scale-110`}
                    title={`${cell.iso} • ${cell.prog}%`}
                  />
                ))}
              </div>
            ))}
          </div>

          {/* Tooltip */}
          {hover ? (
            <div className="mt-4 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-soft)] p-3 text-sm text-[var(--color-text-secondary)]">
              <span className="font-semibold text-[var(--color-text-primary)]">{hover.iso}</span>{" "}
              —{" "}
              {heatMode === "count" ? (
                <>
                  entries <span className="font-semibold text-[var(--color-text-primary)]">{Math.round((hover.prog || 0) / 25)}</span>
                  <span className="text-[var(--color-text-muted)]"> (1→25, 2→50, 3→75, 4+→100)</span>
                </>
              ) : (
                <>
                  activity <span className="font-semibold text-[var(--color-text-primary)]">{hover.prog}%</span>
                </>
              )}
              {showMode !== "all" || dayFilter !== "all" ? (
                <span className="text-[var(--color-text-muted)]"> (filtered)</span>
              ) : null}
            </div>
          ) : (
            !compact ? <div className="mt-4 text-sm text-[var(--color-text-muted)]">Hover a day to see details.</div> : null
          )}
        </div>
      </div>

      {compact ? (
        <div className="mt-6 flex items-center justify-end gap-2 text-sm text-[var(--color-text-secondary)]">
          <span>Less</span>
          {[0, 1, 2, 3, 4].map((i) => (
            <span key={i} className={`h-3.5 w-3.5 rounded-[4px] ring-1 ${LEVELS[i]}`} />
          ))}
          <span>More</span>
        </div>
      ) : null}
    </div>
  );
}

function Segmented({ label, value, onChange, options }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs font-semibold text-[var(--color-text-muted)]">{label}</span>

      <div className="inline-flex rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-soft)] p-1">
        {options.map((opt) => {
          const active = opt.value === value;
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => onChange(opt.value)}
              className={[
                "rounded-xl px-3 py-1 text-xs transition",
                active
                  ? "bg-[var(--color-surface)] text-[var(--color-accent)] shadow-sm"
                  : "text-[var(--color-text-secondary)] hover:bg-white hover:text-[var(--color-text-primary)]",
              ].join(" ")}
            >
              {opt.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function PillSelect({ label, value, onChange, options }) {
  return (
    <label className="flex items-center gap-2 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-soft)] px-3 py-2">
      <span className="text-xs font-semibold text-[var(--color-text-muted)]">{label}</span>

      <select
        className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-1 text-sm text-[var(--color-text-primary)] outline-none focus:border-[var(--color-accent)] focus:ring-2 focus:ring-[#3337a6]/10"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}
