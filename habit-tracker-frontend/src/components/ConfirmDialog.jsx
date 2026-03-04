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
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4">
      <div className="w-full max-w-md rounded-3xl bg-[#0b0d14]/90 p-1 ring-1 ring-white/15 backdrop-blur-xl">
        <div className="rounded-[22px] bg-white/5 p-6 ring-1 ring-white/10">
          <div className="text-xl font-semibold">{title}</div>
          <div className="mt-2 text-sm text-white/65">{message}</div>

          <div className="mt-6 grid grid-cols-2 gap-3">
            <button
              onClick={onCancel}
              className="rounded-2xl bg-white/10 px-4 py-3 text-sm ring-1 ring-white/15 hover:bg-white/15"
              type="button"
            >
              {cancelText}
            </button>
            <button
              onClick={onConfirm}
              className="rounded-2xl bg-red-500/20 px-4 py-3 text-sm font-semibold text-red-100 ring-1 ring-red-300/20 hover:bg-red-500/25"
              type="button"
            >
              {confirmText}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
