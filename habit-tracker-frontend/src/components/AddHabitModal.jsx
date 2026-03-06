import { useEffect, useMemo, useRef, useState } from "react";

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
  const [progress, setProgress] = useState(0);
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  // Templates
  const [query, setQuery] = useState("");
  const [favs, setFavs] = useState(() => loadFavs());

  const nameInputRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    // Reset template search when opening
    setQuery("");
  }, [open]);

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
      await onCreate?.({ name: name.trim(), progress: Number(progress), date });
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
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4">
      <div className="w-full max-w-2xl rounded-3xl bg-[#0b0d14]/90 p-1 ring-1 ring-white/15 backdrop-blur-xl">
        <div className="rounded-[22px] bg-white/5 p-6 ring-1 ring-white/10">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold">Add a new habit</h2>
              <p className="mt-1 text-sm text-white/55">
                Use templates to log faster. Pin your favorites.
              </p>
            </div>

            <button
              onClick={onClose}
              className="rounded-xl bg-white/10 px-3 py-1 text-sm ring-1 ring-white/15 hover:bg-white/15"
              type="button"
            >
              Close
            </button>
          </div>

          {/* Templates */}
          <div className="mt-6 rounded-2xl bg-black/30 p-4 ring-1 ring-white/10">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div className="text-sm font-semibold text-white/85">Templates</div>

              <input
                className="w-full md:max-w-sm rounded-2xl bg-white/5 px-4 py-2 text-sm outline-none ring-1 ring-white/10 placeholder:text-white/30 focus:ring-cyan-300/35"
                placeholder="Search habits… (e.g., read, gym, study)"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>

            {normalizedNames.length === 0 ? (
              <div className="mt-3 text-sm text-white/45">
                No templates yet. Create a habit once and it will appear here.
              </div>
            ) : (
              <>
                {favoriteNames.length > 0 ? (
                  <div className="mt-4">
                    <div className="mb-2 text-xs text-white/50">Pinned</div>
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
                  <div className="mb-2 text-xs text-white/50">
                    {query.trim() ? "Results" : "All templates"}
                  </div>

                  <div className="max-h-56 space-y-2 overflow-auto pr-1">
                    {filteredNames.slice(0, 40).map((n) => (
                      <div
                        key={n}
                        className="flex items-center justify-between gap-3 rounded-2xl bg-white/5 px-3 py-2 ring-1 ring-white/10 hover:bg-white/[0.07]"
                      >
                        <div className="min-w-0">
                          <div className="truncate text-sm font-semibold">{n}</div>
                          <div className="text-xs text-white/45">
                            {favSet.has(n) ? "Pinned" : "Not pinned"} • Quick log uses today
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => toggleFav(n)}
                            className={`rounded-xl px-3 py-1 text-xs ring-1 ${
                              favSet.has(n)
                                ? "bg-white text-black ring-white/20"
                                : "bg-white/10 text-white ring-white/15 hover:bg-white/15"
                            }`}
                            title={favSet.has(n) ? "Unpin" : "Pin"}
                          >
                            {favSet.has(n) ? "Pinned" : "Pin"}
                          </button>

                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => useTemplate(n)}
                            className="rounded-xl bg-white/10 px-3 py-1 text-xs ring-1 ring-white/15 hover:bg-white/15"
                          >
                            Use
                          </button>

                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => quickLogToday(n)}
                            className="rounded-xl bg-gradient-to-r from-cyan-400/80 via-fuchsia-400/80 to-indigo-400/80 px-3 py-1 text-xs font-semibold text-black"
                          >
                            Log Today
                          </button>
                        </div>
                      </div>
                    ))}

                    {filteredNames.length > 40 ? (
                      <div className="pt-2 text-xs text-white/40">
                        Showing first 40 results. Refine search to narrow down.
                      </div>
                    ) : null}
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Manual form */}
          <form onSubmit={submit} className="mt-6 space-y-4">
            <div className="space-y-2">
              <label className="text-xs text-white/60">Habit name</label>
              <input
                ref={nameInputRef}
                className="w-full rounded-2xl bg-white/5 px-4 py-3 text-sm outline-none ring-1 ring-white/10 placeholder:text-white/30 focus:ring-cyan-300/35"
                placeholder="e.g., Read 10 pages"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                minLength={2}
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <label className="text-xs text-white/60">Progress (%)</label>
                <input
                  className="w-full rounded-2xl bg-white/5 px-4 py-3 text-sm outline-none ring-1 ring-white/10 focus:ring-fuchsia-300/35"
                  type="number"
                  min={0}
                  max={100}
                  value={progress}
                  onChange={(e) => setProgress(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs text-white/60">Date</label>
                <input
                  className="w-full rounded-2xl bg-white/5 px-4 py-3 text-sm outline-none ring-1 ring-white/10 focus:ring-indigo-300/35"
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                />
              </div>
            </div>

            {err ? (
              <div className="rounded-2xl bg-red-500/10 p-3 text-sm text-red-200 ring-1 ring-red-300/20">
                {err}
              </div>
            ) : null}

            <button
              disabled={!canSubmit}
              className="w-full rounded-2xl bg-gradient-to-r from-cyan-400 via-fuchsia-400 to-indigo-400 px-4 py-3 text-sm font-semibold text-black transition active:scale-[0.99] disabled:opacity-60"
              type="submit"
            >
              {busy ? "Creating..." : "Create habit"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

function TemplateChip({ name, pinned, disabled, onUse, onQuickLog, onTogglePin }) {
  return (
    <div className="flex items-center gap-2 rounded-2xl bg-white/5 px-3 py-2 ring-1 ring-white/10">
      <div className="max-w-[180px] truncate text-sm font-semibold">{name}</div>

      <button
        type="button"
        disabled={disabled}
        onClick={onTogglePin}
        className={`rounded-xl px-2 py-1 text-xs ring-1 ${
          pinned ? "bg-white text-black ring-white/20" : "bg-white/10 text-white ring-white/15 hover:bg-white/15"
        }`}
        title={pinned ? "Unpin" : "Pin"}
      >
        {pinned ? "Pinned" : "Pin"}
      </button>

      <button
        type="button"
        disabled={disabled}
        onClick={onUse}
        className="rounded-xl bg-white/10 px-2 py-1 text-xs ring-1 ring-white/15 hover:bg-white/15"
      >
        Use
      </button>

      <button
        type="button"
        disabled={disabled}
        onClick={onQuickLog}
        className="rounded-xl bg-gradient-to-r from-cyan-400/80 via-fuchsia-400/80 to-indigo-400/80 px-2 py-1 text-xs font-semibold text-black"
      >
        Today
      </button>
    </div>
  );
}
