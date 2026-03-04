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
  "bg-white/5 ring-white/10",
  "bg-cyan-400/25 ring-cyan-300/25",
  "bg-cyan-400/45 ring-cyan-300/30",
  "bg-fuchsia-400/55 ring-fuchsia-300/35",
  "bg-indigo-400/70 ring-indigo-300/40",
];

const RANGE_OPTIONS = [
  { key: "7d", label: "Last 7 days", days: 7 },
  { key: "30d", label: "Last 30 days", days: 30 },
  { key: "12w", label: "Last 12 weeks", days: 7 * 12 },
  { key: "6m", label: "Last 6 months", days: 30 * 6 }, // approximate
];

export default function StreakCalendar({ habits }) {
  const [hover, setHover] = useState(null);

  const [range, setRange] = useState("12w");
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
    <div className="rounded-3xl bg-white/5 p-6 ring-1 ring-white/10">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="text-lg font-semibold">Streak Calendar</div>
          <div className="mt-1 text-sm text-white/55">
            {legendLabel} • {heatMode === "count" ? "Count/day" : metric === "avg" ? "Avg/day" : "Max/day"} •{" "}
            {dayFilter === "all" ? "All days" : dayFilter === "weekdays" ? "Weekdays" : "Weekends"} • {range.toUpperCase()}
          </div>
        </div>

        {/* Filters */}
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
      </div>

      <div className="mt-4 flex items-center justify-between gap-4 text-xs text-white/50">
        <div>{`Rendering ${totalDays} days (whole weeks)`}</div>
        <div className="flex items-center gap-2">
          <span>Less</span>
          {[0, 1, 2, 3, 4].map((i) => (
            <span key={i} className={`h-3 w-3 rounded-sm ring-1 ${LEVELS[i]}`} />
          ))}
          <span>More</span>
        </div>
      </div>

      <div className="mt-5 overflow-x-auto">
        <div className="min-w-[720px]">
          {/* Month labels */}
          <div className="mb-2 grid gap-2 text-xs text-white/40" style={{ gridTemplateColumns: `28px repeat(${weeks.length}, 1fr)` }}>
            <div />
            {labels.map((m, i) => (
              <div key={i} className="pl-1">{m}</div>
            ))}
          </div>

          {/* Grid */}
          <div className="grid gap-2" style={{ gridTemplateColumns: `28px repeat(${weeks.length}, 1fr)` }}>
            {/* Weekday labels */}
            <div className="grid grid-rows-7 gap-2 text-xs text-white/40">
              {["Mon", "", "Wed", "", "Fri", "", "Sun"].map((d, i) => (
                <div key={i} className="h-4 leading-4">{d}</div>
              ))}
            </div>

            {weeks.map((col, cIdx) => (
              <div key={cIdx} className="grid grid-rows-7 gap-2">
                {col.map((cell, rIdx) => (
                  <button
                    key={rIdx}
                    type="button"
                    onMouseEnter={() => setHover(cell)}
                    onMouseLeave={() => setHover(null)}
                    className={`h-4 w-4 rounded-[4px] ring-1 transition ${LEVELS[cell.lvl]} hover:scale-110`}
                    title={`${cell.iso} • ${cell.prog}%`}
                  />
                ))}
              </div>
            ))}
          </div>

          {/* Tooltip */}
          {hover ? (
            <div className="mt-4 rounded-2xl bg-black/40 p-3 text-sm text-white/70 ring-1 ring-white/10">
              <span className="font-semibold text-white">{hover.iso}</span>{" "}
              —{" "}
              {heatMode === "count" ? (
                <>
                  entries <span className="font-semibold text-white">{Math.round((hover.prog || 0) / 25)}</span>
                  <span className="text-white/45"> (1→25, 2→50, 3→75, 4+→100)</span>
                </>
              ) : (
                <>
                  activity <span className="font-semibold text-white">{hover.prog}%</span>
                </>
              )}
              {showMode !== "all" || dayFilter !== "all" ? (
                <span className="text-white/45"> (filtered)</span>
              ) : null}
            </div>
          ) : (
            <div className="mt-4 text-sm text-white/45">Hover a day to see details.</div>
          )}
        </div>
      </div>
    </div>
  );
}

function Segmented({ label, value, onChange, options }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-white/50">{label}</span>

      <div className="inline-flex rounded-2xl bg-white/10 p-1 ring-1 ring-white/15 backdrop-blur">
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
                  ? "bg-white text-black shadow"
                  : "text-white/70 hover:text-white hover:bg-white/10",
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
    <label className="flex items-center gap-2 rounded-2xl bg-white/10 px-3 py-2 ring-1 ring-white/15 backdrop-blur">
      <span className="text-xs text-white/50">{label}</span>

      <select
        className="rounded-xl bg-white px-3 py-1 text-sm text-black outline-none"
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
