import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { FiSearch, FiX } from "react-icons/fi";
import { useHabits } from "../context/HabitsContext";

export default function GlobalSearchButton({ className = "" }) {
  const { habitDefinitions = [] } = useHabits();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const inputRef = useRef(null);

  useEffect(() => {
    if (!open) return;

    const timer = setTimeout(() => inputRef.current?.focus(), 0);
    const onKeyDown = (event) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => {
      clearTimeout(timer);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return habitDefinitions.slice(0, 8);

    return habitDefinitions
      .filter((habit) => {
        const haystack = `${habit.name || ""} ${habit.category || ""} ${habit.target || ""}`.toLowerCase();
        return haystack.includes(q);
      })
      .slice(0, 10);
  }, [habitDefinitions, query]);

  return (
    <>
      <button
        className={className || "grid h-11 w-11 place-items-center rounded-full text-[#181c1e] hover:bg-[#ebeef0]"}
        type="button"
        aria-label="Search habits"
        onClick={() => setOpen(true)}
      >
        <FiSearch className="h-6 w-6" />
      </button>

      {open ? (
        <div className="fixed inset-0 z-50 bg-slate-950/30 px-4 py-8" role="dialog" aria-modal="true" aria-label="Search habits">
          <div className="mx-auto max-w-2xl overflow-hidden rounded-[24px] border border-[var(--color-border)] bg-white shadow-[0_24px_70px_rgba(15,23,42,0.18)]">
            <div className="flex items-center gap-3 border-b border-[var(--color-border)] px-5 py-4">
              <FiSearch className="h-5 w-5 text-[var(--color-text-muted)]" />
              <input
                ref={inputRef}
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                className="min-w-0 flex-1 bg-transparent text-base text-[var(--color-text-primary)] outline-none placeholder:text-[var(--color-text-muted)]"
                placeholder="Search by habit name, category, or target..."
              />
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="grid h-9 w-9 place-items-center rounded-full text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-soft)]"
                aria-label="Close search"
              >
                <FiX />
              </button>
            </div>

            <div className="max-h-[60vh] overflow-y-auto p-3">
              {habitDefinitions.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-[var(--color-border)] bg-[var(--color-surface-soft)] p-6 text-center">
                  <div className="text-sm font-semibold text-[var(--color-text-primary)]">No habits to search</div>
                  <div className="mt-2 text-sm text-[var(--color-text-secondary)]">Create a habit first and it will appear here.</div>
                </div>
              ) : results.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-[var(--color-border)] bg-[var(--color-surface-soft)] p-6 text-center">
                  <div className="text-sm font-semibold text-[var(--color-text-primary)]">No matching habits</div>
                  <div className="mt-2 text-sm text-[var(--color-text-secondary)]">Try a different name or category.</div>
                </div>
              ) : (
                <div className="space-y-2">
                  {results.map((habit) => (
                    <Link
                      key={habit.id || habit.name}
                      to={`/app/habit/${encodeURIComponent(habit.name)}`}
                      onClick={() => setOpen(false)}
                      className="flex items-center justify-between gap-4 rounded-2xl px-4 py-3 transition hover:bg-[var(--color-surface-soft)]"
                    >
                      <div>
                        <div className="font-semibold text-[var(--color-text-primary)]">{habit.name}</div>
                        <div className="mt-1 text-sm text-[var(--color-text-secondary)]">
                          {[habit.category, habit.target].filter(Boolean).join(" • ") || "Habit"}
                        </div>
                      </div>
                      <span className="text-xs font-bold uppercase tracking-[0.12em] text-[var(--color-accent)]">Open</span>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
