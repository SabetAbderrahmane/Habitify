import { useEffect, useRef, useState } from "react";
import { FiMoreVertical } from "react-icons/fi";

export default function HabitActionsMenu({ label = "Habit actions", actions = [] }) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef(null);
  const visibleActions = actions.filter(Boolean);

  useEffect(() => {
    if (!open) return;

    const onPointerDown = (event) => {
      if (!menuRef.current?.contains(event.target)) {
        setOpen(false);
      }
    };

    const onKeyDown = (event) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };

    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  if (visibleActions.length === 0) return null;

  return (
    <div className="relative" ref={menuRef}>
      <button
        type="button"
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        className="grid h-10 w-10 place-items-center rounded-full text-[#464653] transition hover:bg-[#ebeef0] hover:text-[#181c1e] focus:outline-none focus:ring-4 focus:ring-[#3337a6]/15"
      >
        <FiMoreVertical className="h-5 w-5" />
      </button>

      {open ? (
        <div
          role="menu"
          className="absolute right-0 top-12 z-20 min-w-[190px] overflow-hidden rounded-2xl border border-[var(--color-border)] bg-white p-2 shadow-[0_18px_48px_rgba(24,28,30,0.14)]"
        >
          {visibleActions.map((action) => {
            const Icon = action.icon;
            const toneClass = action.danger
              ? "text-red-700 hover:bg-red-50"
              : "text-[var(--color-text-primary)] hover:bg-[var(--color-surface-soft)]";

            const content = (
              <>
                {Icon ? <Icon className="h-4 w-4" aria-hidden="true" /> : null}
                <span>{action.label}</span>
              </>
            );

            if (action.to && action.LinkComponent) {
              const LinkComponent = action.LinkComponent;
              return (
                <LinkComponent
                  key={action.label}
                  to={action.to}
                  role="menuitem"
                  onClick={() => setOpen(false)}
                  className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-semibold ${toneClass}`}
                >
                  {content}
                </LinkComponent>
              );
            }

            return (
              <button
                key={action.label}
                type="button"
                role="menuitem"
                disabled={action.disabled}
                onClick={() => {
                  setOpen(false);
                  action.onClick?.();
                }}
                className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-60 ${toneClass}`}
              >
                {content}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
