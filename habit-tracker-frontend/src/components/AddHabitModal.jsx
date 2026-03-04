import { useMemo, useState } from "react";

export default function AddHabitModal({ open, onClose, onCreate, habitNames = [] }) {
  const [name, setName] = useState("");
  const [progress, setProgress] = useState(0);
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const canSubmit = useMemo(() => name.trim().length >= 2 && !busy, [name, busy]);

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

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4">
      <div className="w-full max-w-lg rounded-3xl bg-[#0b0d14]/90 p-1 ring-1 ring-white/15 backdrop-blur-xl">
        <div className="rounded-[22px] bg-white/5 p-6 ring-1 ring-white/10">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold">Add a new habit</h2>
              <p className="mt-1 text-sm text-white/55">
                Keep it simple. We’ll make it powerful.
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

          <form onSubmit={submit} className="mt-6 space-y-4">
            <div className="space-y-2">
              <label className="text-xs text-white/60">Use an existing habit</label>
              <select
                className="w-full rounded-2xl bg-white px-4 py-3 text-sm text-black outline-none ring-1 ring-white/10"
                value=""
                onChange={(e) => {
                  const v = e.target.value;
                  if (v) setName(v);
                }}
              >
                <option value="">— Select from past habits —</option>
                {habitNames.map((n) => (
                  <option key={n} value={n}>{n}</option>
                ))}
              </select>

              <div className="text-[11px] text-white/40">
                Selecting a past habit auto-fills the name.
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs text-white/60">Habit name</label>
              <input
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
