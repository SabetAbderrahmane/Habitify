import { useEffect, useMemo, useRef, useState } from "react";
import { FiClock, FiX } from "react-icons/fi";
import Badge from "./ui/Badge";
import Button from "./ui/Button";
import ProgressBar from "./ui/ProgressBar";

const FAV_KEY = "habitify:favorites";
const CATEGORIES = ["Health", "Productivity", "Mindfulness", "Relationships", "Other"];

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
  const [frequency, setFrequency] = useState("daily");
  const [progress, setProgress] = useState(0);
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [query, setQuery] = useState("");
  const [favs, setFavs] = useState(() => loadFavs());
  const nameInputRef = useRef(null);

  useEffect(() => {
    if (!open) return;
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

  const normalizedNames = useMemo(() => {
    const set = new Set((habitNames || []).filter(Boolean));
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [habitNames]);

  const filteredNames = useMemo(() => {
    const q = query.trim().toLowerCase();
    const source = q ? normalizedNames.filter((n) => n.toLowerCase().includes(q)) : normalizedNames;
    return source.slice(0, 10);
  }, [normalizedNames, query]);

  const canSubmit = name.trim().length >= 2 && !busy;
  const todayISO = useMemo(() => new Date().toISOString().slice(0, 10), []);

  if (!open) return null;

  const submit = async (event) => {
    event.preventDefault();
    setErr("");
    setBusy(true);
    try {
      await onCreate?.({
        name: name.trim(),
        category,
        frequency,
        target: frequency === "daily" ? "Daily" : frequency === "weekly" ? "Weekly" : "Custom",
        progress: Number(progress),
        date,
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

  const quickLogToday = async (templateName) => {
    setErr("");
    setBusy(true);
    try {
      await onCreate?.({ name: templateName, category, frequency, progress: 10, date: todayISO });
      onClose?.();
    } catch (error) {
      setErr(error?.message || "Failed to log today");
    } finally {
      setBusy(false);
    }
  };

  const toggleFav = (templateName) => {
    setFavs((prev) => {
      const set = new Set(prev);
      if (set.has(templateName)) set.delete(templateName);
      else set.add(templateName);
      return Array.from(set);
    });
  };

  return (
    <div className="fixed inset-0 z-50 overflow-auto bg-[#f7fafc] p-6" role="dialog" aria-modal="true" aria-labelledby="add-habit-title">
      <div className="mx-auto max-w-[1440px]">
        <button
          type="button"
          onClick={onClose}
          className="mb-8 inline-flex items-center gap-2 text-sm font-bold tracking-[0.12em] text-[#181c1e]"
        >
          <FiX />
          Cancel
        </button>

        <div className="mb-12">
          <h2 id="add-habit-title" className="text-5xl font-semibold tracking-[-0.02em] text-[#3337a6]">New Habit</h2>
          <p className="mt-3 text-xl text-[#464653]">Define a new routine to track.</p>
        </div>

        <div className="grid gap-14 lg:grid-cols-[1fr_400px]">
          <form onSubmit={submit} className="rounded-3xl bg-white p-8 shadow-[0_12px_36px_rgba(24,28,30,0.05)]">
            <div className="space-y-9">
              <label className="block">
                <span className="text-sm font-bold tracking-[0.12em] text-[#181c1e]">Habit Name</span>
                <input
                  ref={nameInputRef}
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  className="mt-4 w-full border-0 border-b border-[#e0e3e5] bg-transparent px-4 py-3 text-2xl text-[#181c1e] outline-none placeholder:text-[#b8c0c8] focus:border-[#3337a6]"
                  placeholder="e.g., Morning Meditation"
                  required
                  minLength={2}
                />
              </label>

              <label className="block">
                <span className="text-sm font-bold tracking-[0.12em] text-[#181c1e]">Category</span>
                <select
                  value={category}
                  onChange={(event) => setCategory(event.target.value)}
                  className="mt-4 w-full border-0 border-b border-[#e0e3e5] bg-transparent px-0 py-4 text-xl text-[#181c1e] outline-none focus:border-[#3337a6]"
                >
                  {CATEGORIES.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </label>

              <div>
                <div className="mb-5 text-sm font-bold tracking-[0.12em] text-[#181c1e]">Frequency</div>
                <div className="grid gap-5 md:grid-cols-3">
                  {[
                    { value: "daily", label: "Daily" },
                    { value: "weekly", label: "Weekly" },
                    { value: "custom", label: "Custom" },
                  ].map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setFrequency(option.value)}
                      className={[
                        "h-14 rounded-lg border text-xl font-medium transition",
                        frequency === option.value
                          ? "border-[#181c1e] bg-white text-[#181c1e]"
                          : "border-[#c7c5d5] bg-white text-[#181c1e]",
                      ].join(" ")}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid gap-8 md:grid-cols-2">
                <label className="block">
                  <span className="text-sm font-bold tracking-[0.12em] text-[#181c1e]">Goal ({frequency === "daily" ? "Daily" : "Routine"})</span>
                  <input
                    value={progress}
                    onChange={(event) => setProgress(event.target.value)}
                    type="number"
                    min={0}
                    max={100}
                    className="mt-4 w-full border-0 border-b border-[#e0e3e5] bg-transparent px-4 py-3 text-xl text-[#181c1e] outline-none focus:border-[#3337a6]"
                    placeholder="e.g., 10 mins, 2 liters"
                  />
                </label>
                <label className="block">
                  <span className="text-sm font-bold tracking-[0.12em] text-[#181c1e]">Start Date</span>
                  <input
                    value={date}
                    onChange={(event) => setDate(event.target.value)}
                    type="date"
                    className="mt-4 w-full border-0 border-b border-[#e0e3e5] bg-transparent px-4 py-3 text-xl text-[#181c1e] outline-none focus:border-[#3337a6]"
                  />
                </label>
              </div>

              <div className="rounded-2xl border border-[#e0e3e5] bg-[#f7fafc] p-5">
                <div className="mb-3 text-sm font-bold tracking-[0.12em] text-[#181c1e]">Existing Templates</div>
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  className="mb-4 w-full rounded-lg border border-[#e0e3e5] bg-white px-4 py-2 text-sm outline-none focus:border-[#3337a6]"
                  placeholder="Search saved habit names"
                />
                {filteredNames.length === 0 ? (
                  <div className="text-sm text-[#767684]">No templates yet. Create a habit once and it will appear here.</div>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {filteredNames.map((templateName) => (
                      <TemplateChip
                        key={templateName}
                        name={templateName}
                        pinned={favs.includes(templateName)}
                        disabled={busy}
                        onUse={() => setName(templateName)}
                        onQuickLog={() => quickLogToday(templateName)}
                        onTogglePin={() => toggleFav(templateName)}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>

            {err ? (
              <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{err}</div>
            ) : null}

            <div className="mt-9 flex justify-end gap-5">
              <Button type="button" variant="secondary" size="lg" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" size="lg" disabled={!canSubmit}>
                {busy ? "Saving..." : "Save Habit"}
              </Button>
            </div>
          </form>

          <aside className="rounded-3xl border border-[#e0e3e5] bg-white p-8 shadow-[0_12px_36px_rgba(24,28,30,0.05)]">
            <div className="mb-6 text-center text-sm font-bold tracking-[0.14em] text-[#181c1e]">Live Preview</div>
            <div className="rounded-2xl bg-white p-5 shadow-[0_8px_24px_rgba(24,28,30,0.08)]">
              <div className="mb-5 flex items-center justify-between">
                <Badge tone="slate">{category}</Badge>
                <span className="text-xl tracking-[0.16em] text-[#c7c5d5]">⋮</span>
              </div>
              <div className="text-3xl font-semibold tracking-[-0.01em] text-[#181c1e]">{name.trim() || "Habit Name"}</div>
              <div className="mt-4 flex items-center gap-2 text-base text-[#181c1e]">
                <FiClock />
                {frequency} / {date}
              </div>
              <ProgressBar value={Number(progress || 0)} className="mt-6" />
            </div>

            <div className="mt-8 rounded-2xl border border-[#c7c5d5] bg-[#f1f4f6] p-5">
              <div className="mb-3 text-sm font-bold tracking-[0.12em] text-[#1117a8]">AI Suggestion</div>
              <p className="text-lg leading-7 text-[#181c1e]">
                Based on your goals, setting a reminder for a consistent time may improve completion.
              </p>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}

function TemplateChip({ name, pinned, disabled, onUse, onQuickLog, onTogglePin }) {
  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-[#e0e3e5] bg-white px-3 py-2 text-sm">
      <button type="button" disabled={disabled} onClick={onUse} className="font-semibold text-[#181c1e]">
        {name}
      </button>
      <button type="button" disabled={disabled} onClick={onTogglePin} className="text-xs font-bold text-[#3337a6]">
        {pinned ? "Pinned" : "Pin"}
      </button>
      <button type="button" disabled={disabled} onClick={onQuickLog} className="rounded-full bg-[#3337a6] px-3 py-1 text-xs font-bold text-white">
        Today
      </button>
    </div>
  );
}
