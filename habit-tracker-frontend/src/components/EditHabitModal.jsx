import { useMemo, useState } from "react";

export default function EditHabitModal({ open, onClose, habit, onSave, onDelete }) {
  const [name, setName] = useState(habit?.name || "");
  const [progress, setProgress] = useState(habit?.progress ?? 0);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const canSubmit = useMemo(() => name.trim().length >= 2 && !busy, [name, busy]);

  if (!open) return null;

  const save = async (e) => {
    e.preventDefault();
    setErr("");
    setBusy(true);
    try {
      await onSave?.({ name: name.trim(), progress: Number(progress) });
      onClose?.();
    } catch (error) {
      setErr(error?.message || "Failed to save");
    } finally {
      setBusy(false);
    }
  };

  const del = async () => {
    setErr("");
    setBusy(true);
    try {
      await onDelete?.();
      onClose?.();
    } catch (error) {
      setErr(error?.message || "Failed to delete");
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
              <h2 className="text-xl font-semibold">Edit habit</h2>
              <p className="mt-1 text-sm text-white/55">{habit?.date}</p>
            </div>

            <button
              onClick={onClose}
              className="rounded-xl bg-white/10 px-3 py-1 text-sm ring-1 ring-white/15 hover:bg-white/15"
              type="button"
            >
              Close
            </button>
          </div>

          <form onSubmit={save} className="mt-6 space-y-4">
            <div className="space-y-2">
              <label className="text-xs text-white/60">Habit name</label>
              <input
                className="w-full rounded-2xl bg-white/5 px-4 py-3 text-sm outline-none ring-1 ring-white/10 placeholder:text-white/30 focus:ring-cyan-300/35"
                value={name}
                onChange={(e) => setName(e.target.value)}
                minLength={2}
                required
              />
            </div>

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

            {err ? (
              <div className="rounded-2xl bg-red-500/10 p-3 text-sm text-red-200 ring-1 ring-red-300/20">
                {err}
              </div>
            ) : null}

            <div className="grid gap-3 md:grid-cols-2">
              <button
                disabled={!canSubmit}
                className="rounded-2xl bg-gradient-to-r from-cyan-400 via-fuchsia-400 to-indigo-400 px-4 py-3 text-sm font-semibold text-black disabled:opacity-60"
                type="submit"
              >
                {busy ? "Saving..." : "Save changes"}
              </button>

              <button
                disabled={busy}
                onClick={del}
                className="rounded-2xl bg-red-500/20 px-4 py-3 text-sm font-semibold text-red-100 ring-1 ring-red-300/20 hover:bg-red-500/25"
                type="button"
              >
                Delete
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
