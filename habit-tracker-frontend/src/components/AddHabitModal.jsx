import { useEffect, useMemo, useRef, useState } from "react";
import Badge from "./ui/Badge";
import Button from "./ui/Button";
import Card from "./ui/Card";
import ProgressBar from "./ui/ProgressBar";

const FAV_KEY = "habitify:favorites";

function loadFavs() {
  try {
    const raw = localStorage.getItem(FAV_KEY);
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr.filter((x) => typeof x === "string") : [];
  } catch {
    return [];
  }
}

function saveFavs(favs) {
  try {
    localStorage.setItem(FAV_KEY, JSON.stringify(favs));
  } catch {
    // ignore
  }
}

export default function AddHabitModal({ open, onClose, onCreate, habitNames = [] }) {
  const [name, setName] = useState("");
  const [category, setCategory] = useState("Other");
  const [progress, setProgress] = useState(0);
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const CATEGORIES = ["Health", "Productivity", "Mindfulness", "Relationships", "Other"];

  // Templates
  const [query, setQuery] = useState("");
  const [favs, setFavs] = useState(() => loadFavs());

  const nameInputRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    // Reset template search when opening
    setQuery("");
    setTimeout(() => nameInputRef.current?.focus?.(), 0);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event) => {
      if (event.key === "Escape") onClose?.();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose, open]);

  useEffect(() => {
    saveFavs(favs);
  }, [favs]);

  const canSubmit = useMemo(() => name.trim().length >= 2 && !busy, [name, busy]);

  const todayISO = useMemo(() => new Date().toISOString().slice(0, 10), []);

  const normalizedNames = useMemo(() => {
    // unique + sorted
    const set = new Set((habitNames || []).filter(Boolean));
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [habitNames]);

  const filteredNames = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return normalizedNames;
    return normalizedNames.filter((n) => n.toLowerCase().includes(q));
  }, [normalizedNames, query]);

  const favSet = useMemo(() => new Set(favs), [favs]);

  const favoriteNames = useMemo(() => {
    return favs
      .filter((n) => normalizedNames.includes(n))
      .sort((a, b) => a.localeCompare(b));
  }, [favs, normalizedNames]);

  const toggleFav = (n) => {
    setFavs((prev) => {
      const s = new Set(prev);
      if (s.has(n)) s.delete(n);
      else s.add(n);
      return Array.from(s);
    });
  };

  if (!open) return null;

  const submit = async (e) => {
    e.preventDefault();
    setErr("");
    setBusy(true);
    try {
      await onCreate?.({ 
        name: name.trim(), 
        category,
        progress: Number(progress), 
        date 
      });
      setName("");
      setProgress(0);
      setDate(new Date().toISOString().slice(0, 10));
      onClose?.();
    } catch (error) {
      setErr(error?.message || "Failed to create habit");
    } finally {
      setBusy(false);
    }
  };

  const useTemplate = (n) => {
    setName(n);
    // keep date/progress as-is
    setTimeout(() => nameInputRef.current?.focus?.(), 0);
  };

  const quickLogToday = async (n) => {
    setErr("");
    setBusy(true);
    try {
      // Default “quick log” at 10% (feels like a “start”)
      await onCreate?.({ name: n, progress: 10, date: todayISO });
      onClose?.();
    } catch (error) {
      setErr(error?.message || "Failed to log today");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/45 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="add-habit-title">
      <div className="max-h-[90vh] w-full max-w-4xl overflow-auto rounded-3xl bg-white p-1 shadow-2xl ring-1 ring-slate-200">
        <div className="rounded-[22px] bg-[#f7fafc] p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 id="add-habit-title" className="text-xl font-semibold text-slate-950">Add a new habit</h2>
              <p className="mt-1 text-sm text-slate-600">
                Use templates to log faster. Pin your favorites.
              </p>
            </div>

            <Button onClick={onClose} variant="secondary" size="sm">
              Close
            </Button>
          </div>

          <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-4">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div className="text-sm font-semibold text-slate-800">Templates</div>

              <input
                className="w-full rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-[#3337a6] focus:ring-4 focus:ring-[#3337a6]/10 md:max-w-sm"
                placeholder="Search habits… (e.g., read, gym, study)"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>

            {normalizedNames.length === 0 ? (
              <div className="mt-3 text-sm text-slate-500">
                No templates yet. Create a habit once and it will appear here.
              </div>
            ) : (
              <>
                {favoriteNames.length > 0 ? (
                  <div className="mt-4">
                    <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">Pinned</div>
                    <div className="flex flex-wrap gap-2">
                      {favoriteNames.map((n) => (
                        <TemplateChip
                          key={n}
                          name={n}
                          pinned
                          disabled={busy}
                          onUse={() => useTemplate(n)}
                          onQuickLog={() => quickLogToday(n)}
                          onTogglePin={() => toggleFav(n)}
                        />
                      ))}
                    </div>
                  </div>
                ) : null}

                <div className="mt-4">
                  <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
                    {query.trim() ? "Results" : "All templates"}
                  </div>

                  <div className="max-h-56 space-y-2 overflow-auto pr-1">
                    {filteredNames.slice(0, 40).map((n) => (
                      <div
                        key={n}
                        className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-3 py-2 hover:bg-slate-50"
                      >
                        <div className="min-w-0">
                          <div className="truncate text-sm font-semibold text-slate-950">{n}</div>
                          <div className="text-xs text-slate-500">
                            {favSet.has(n) ? "Pinned" : "Not pinned"} • Quick log uses today
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => toggleFav(n)}
                            className={`rounded-lg px-3 py-1 text-xs font-semibold ring-1 ${
                              favSet.has(n)
                                ? "bg-[#3337a6] text-white ring-[#3337a6]"
                                : "bg-white text-slate-700 ring-slate-200 hover:bg-slate-50"
                            }`}
                            title={favSet.has(n) ? "Unpin" : "Pin"}
                          >
                            {favSet.has(n) ? "Pinned" : "Pin"}
                          </button>

                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => useTemplate(n)}
                            className="rounded-lg bg-white px-3 py-1 text-xs font-semibold text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50"
                          >
                            Use
                          </button>

                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => quickLogToday(n)}
                            className="rounded-lg bg-[#3337a6] px-3 py-1 text-xs font-semibold text-white"
                          >
                            Log Today
                          </button>
                        </div>
                      </div>
                    ))}

                    {filteredNames.length > 40 ? (
                        <div className="pt-2 text-xs text-slate-500">
                        Showing first 40 results. Refine search to narrow down.
                      </div>
                    ) : null}
                  </div>
                </div>
              </>
            )}
          </div>

          <Card className="mt-6">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-sm font-semibold text-slate-500">Live preview</div>
                <div className="mt-2 text-lg font-semibold text-slate-950">
                  {name.trim() || "New habit"}
                </div>
                <div className="mt-1 text-sm text-slate-500">{date} • {category}</div>
              </div>
              <Badge tone={Number(progress) >= 80 ? "green" : Number(progress) > 0 ? "amber" : "slate"}>
                {Number(progress || 0)}%
              </Badge>
            </div>
            <ProgressBar value={Number(progress || 0)} className="mt-4" />
          </Card>

          <form onSubmit={submit} className="mt-6 space-y-4">
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">Habit name</label>
              <input
                ref={nameInputRef}
                className="w-full rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-[#3337a6] focus:ring-4 focus:ring-[#3337a6]/10"
                placeholder="e.g., Read 10 pages"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                minLength={2}
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">Category</label>
              <div className="flex flex-wrap gap-2">
                {CATEGORIES.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setCategory(cat)}
                    className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ring-1 ${
                      category === cat
                        ? "bg-[#3337a6] text-white ring-[#3337a6]"
                        : "bg-white text-slate-700 ring-slate-200 hover:bg-slate-50"
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">Progress (%)</label>
                <input
                  className="w-full rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-[#3337a6] focus:ring-4 focus:ring-[#3337a6]/10"
                  type="number"
                  min={0}
                  max={100}
                  value={progress}
                  onChange={(e) => setProgress(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">Date</label>
                <input
                  className="w-full rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-[#3337a6] focus:ring-4 focus:ring-[#3337a6]/10"
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                />
              </div>
            </div>

            {err ? (
              <div className="rounded-2xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                {err}
              </div>
            ) : null}

            <Button
              disabled={!canSubmit}
              type="submit"
              className="w-full"
              size="lg"
            >
              {busy ? "Creating..." : "Create habit"}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}

function TemplateChip({ name, pinned, disabled, onUse, onQuickLog, onTogglePin }) {
  return (
    <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2">
      <div className="max-w-[180px] truncate text-sm font-semibold text-slate-950">{name}</div>

      <button
        type="button"
        disabled={disabled}
        onClick={onTogglePin}
        className={`rounded-lg px-2 py-1 text-xs font-semibold ring-1 ${
          pinned ? "bg-[#3337a6] text-white ring-[#3337a6]" : "bg-white text-slate-700 ring-slate-200 hover:bg-slate-50"
        }`}
        title={pinned ? "Unpin" : "Pin"}
      >
        {pinned ? "Pinned" : "Pin"}
      </button>

      <button
        type="button"
        disabled={disabled}
        onClick={onUse}
        className="rounded-lg bg-white px-2 py-1 text-xs font-semibold text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50"
      >
        Use
      </button>

      <button
        type="button"
        disabled={disabled}
        onClick={onQuickLog}
        className="rounded-lg bg-[#3337a6] px-2 py-1 text-xs font-semibold text-white"
      >
        Today
      </button>
    </div>
  );
}
