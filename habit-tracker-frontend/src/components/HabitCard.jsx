import { useState } from "react";
import { Link } from "react-router-dom";
import EditHabitModal from "./EditHabitModal";

export default function HabitCard({ habit, onUpdate, onDelete, onBumpToday }) {
  const [openEdit, setOpenEdit] = useState(false);

  const p = Math.max(0, Math.min(100, Number(habit?.progress ?? 0)));
  const href = `/app/habit/${encodeURIComponent(habit?.name || "")}`;

  return (
    <>
      <div className="rounded-2xl bg-white/5 p-5 ring-1 ring-white/10 hover:bg-white/[0.07] transition">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <Link to={href} className="block">
              <div className="truncate text-lg font-semibold">{habit?.name}</div>
              <div className="mt-1 text-xs text-white/45">{habit?.date}</div>
            </Link>
          </div>

          <div className="rounded-xl bg-white/10 px-3 py-1 text-xs ring-1 ring-white/15">
            {p}%
          </div>
        </div>

        <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-white/10">
          <div
            className="h-full rounded-full bg-gradient-to-r from-cyan-400 via-fuchsia-400 to-indigo-400"
            style={{ width: `${p}%` }}
          />
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <button
            onClick={() => setOpenEdit(true)}
            className="rounded-xl bg-white/10 px-3 py-1 text-xs ring-1 ring-white/15 hover:bg-white/15"
            type="button"
          >
            Edit
          </button>

          <button
            onClick={() => onBumpToday?.(habit)}
            className="rounded-xl bg-gradient-to-r from-cyan-400/70 via-fuchsia-400/70 to-indigo-400/70 px-3 py-1 text-xs font-semibold text-black"
            type="button"
          >
            +10% today
          </button>

          <button
            onClick={() => onDelete?.(habit)}
            className="rounded-xl bg-red-500/20 px-3 py-1 text-xs text-red-100 ring-1 ring-red-300/20 hover:bg-red-500/25"
            type="button"
          >
            Delete
          </button>
        </div>
      </div>

      <EditHabitModal
        open={openEdit}
        onClose={() => setOpenEdit(false)}
        habit={habit}
        onSave={(patch) => onUpdate?.(habit, patch)}
        onDelete={() => onDelete?.(habit)}
      />
    </>
  );
}
