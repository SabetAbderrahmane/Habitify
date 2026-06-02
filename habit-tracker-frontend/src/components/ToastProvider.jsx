import { createContext, useContext, useMemo, useState } from "react";

const ToastCtx = createContext(null);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const push = (type, title, message = "") => {
    const id = crypto.randomUUID?.() || String(Date.now());
    setToasts((prev) => [...prev, { id, type, title, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3200);
  };

  const api = useMemo(
    () => ({
      success: (title, message = "") => push("success", title, message),
      error: (title, message = "") => push("error", title, message),
      info: (title, message = "") => push("info", title, message),
    }),
    []
  );

  return (
    <ToastCtx.Provider value={api}>
      {children}
      <div className="fixed right-4 top-4 z-[100] space-y-2">
        {toasts.map((t) => (
          <Toast key={t.id} toast={t} />
        ))}
      </div>
    </ToastCtx.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastCtx);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}

function Toast({ toast }) {
  const base = "w-[320px] rounded-2xl border bg-[var(--color-surface)] p-4 shadow-[0_18px_42px_rgba(15,23,42,0.14)]";
  const typeCls =
    toast.type === "success"
      ? "border-emerald-200 text-emerald-800"
      : toast.type === "error"
      ? "border-red-200 text-red-700"
      : "border-[var(--color-border)] text-[var(--color-text-primary)]";

  return (
    <div className={`${base} ${typeCls}`}>
      <div className="text-sm font-semibold">{toast.title}</div>
      {toast.message ? (
        <div className="mt-1 text-sm text-[var(--color-text-secondary)]">{toast.message}</div>
      ) : null}
    </div>
  );
}
