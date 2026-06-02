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
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/30 p-4">
      <div className="w-full max-w-lg rounded-[24px] border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-[0_24px_70px_rgba(15,23,42,0.18)]">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold text-[var(--color-text-primary)]">Edit habit</h2>
              <p className="mt-1 text-sm text-[var(--color-text-secondary)]">{habit?.date}</p>
            </div>

            <button
              onClick={onClose}
              className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-soft)] px-3 py-1 text-sm font-semibold text-[var(--color-text-secondary)] hover:bg-white"
              type="button"
            >
              Close
            </button>
          </div>

          <form onSubmit={save} className="mt-6 space-y-4">
            <div className="space-y-2">
              <label className="text-xs font-semibold text-[var(--color-text-secondary)]">Habit name</label>
              <input
                className="w-full rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-soft)] px-4 py-3 text-sm text-[var(--color-text-primary)] outline-none placeholder:text-[var(--color-text-muted)] focus:border-[var(--color-accent)] focus:ring-4 focus:ring-[#3337a6]/10"
                value={name}
                onChange={(e) => setName(e.target.value)}
                minLength={2}
                required
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-[var(--color-text-secondary)]">Progress (%)</label>
              <input
                className="w-full rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-soft)] px-4 py-3 text-sm text-[var(--color-text-primary)] outline-none focus:border-[var(--color-accent)] focus:ring-4 focus:ring-[#3337a6]/10"
                type="number"
                min={0}
                max={100}
                value={progress}
                onChange={(e) => setProgress(e.target.value)}
              />
            </div>

            {err ? (
              <div className="rounded-2xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                {err}
              </div>
            ) : null}

            <div className="grid gap-3 md:grid-cols-2">
              <button
                disabled={!canSubmit}
                className="rounded-2xl bg-[var(--color-accent)] px-4 py-3 text-sm font-semibold text-white shadow-[0_12px_28px_rgba(51,55,166,0.18)] disabled:opacity-60"
                type="submit"
              >
                {busy ? "Saving..." : "Save changes"}
              </button>

              <button
                disabled={busy}
                onClick={del}
                className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700 hover:bg-red-100 disabled:opacity-60"
                type="button"
              >
                Delete
              </button>
            </div>
          </form>
      </div>
    </div>
  );
}
