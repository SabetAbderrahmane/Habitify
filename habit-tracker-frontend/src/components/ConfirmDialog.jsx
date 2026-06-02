export default function ConfirmDialog({
  open,
  title = "Are you sure?",
  message = "This action cannot be undone.",
  confirmText = "Delete",
  cancelText = "Cancel",
  onConfirm,
  onCancel,
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/30 p-4">
      <div className="w-full max-w-md rounded-[24px] border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-[0_24px_70px_rgba(15,23,42,0.18)]">
        <div className="text-xl font-semibold text-[var(--color-text-primary)]">{title}</div>
        <div className="mt-2 text-sm leading-6 text-[var(--color-text-secondary)]">{message}</div>

        <div className="mt-6 grid grid-cols-2 gap-3">
          <button
            onClick={onCancel}
            className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-soft)] px-4 py-3 text-sm font-semibold text-[var(--color-text-secondary)] hover:bg-white"
            type="button"
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            className="rounded-2xl bg-red-600 px-4 py-3 text-sm font-semibold text-white shadow-[0_10px_24px_rgba(220,38,38,0.18)] hover:bg-red-700"
            type="button"
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
