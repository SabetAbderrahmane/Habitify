import { useState } from "react";
import { Link } from "react-router-dom";
import { FiEdit3, FiEye, FiPlusCircle, FiTrash2 } from "react-icons/fi";
import EditHabitModal from "./EditHabitModal";
import HabitActionsMenu from "./HabitActionsMenu";
import Badge from "./ui/Badge";
import Card from "./ui/Card";
import ProgressBar from "./ui/ProgressBar";

export default function HabitCard({ habit, onUpdate, onDelete, onBumpToday }) {
  const [openEdit, setOpenEdit] = useState(false);

  const p = Math.max(0, Math.min(100, Number(habit?.progress ?? 0)));
  const href = `/app/habit/${encodeURIComponent(habit?.name || "")}`;
  const tone = p >= 80 ? "green" : p > 0 ? "amber" : "slate";

  return (
    <>
      <Card className="transition hover:-translate-y-0.5 hover:shadow-[0_10px_28px_rgba(15,23,42,0.08)]">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <Link to={href} className="block">
              <div className="truncate text-lg font-semibold text-slate-950">{habit?.name}</div>
              <div className="mt-1 text-xs text-slate-500">{habit?.date || "No date"}</div>
            </Link>
          </div>

          <div className="flex items-center gap-2">
            <Badge tone={tone}>{p}%</Badge>
            <HabitActionsMenu
              actions={[
                { label: "View details", to: href, LinkComponent: Link, icon: FiEye },
                onBumpToday ? { label: "+10% today", onClick: () => onBumpToday(habit), icon: FiPlusCircle } : null,
                onUpdate ? { label: "Edit habit", onClick: () => setOpenEdit(true), icon: FiEdit3 } : null,
                onDelete ? { label: "Delete", onClick: () => onDelete(habit), icon: FiTrash2, danger: true } : null,
              ]}
            />
          </div>
        </div>

        <ProgressBar value={p} tone={p >= 80 ? "green" : p > 0 ? "amber" : "indigo"} className="mt-4" />
      </Card>

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
