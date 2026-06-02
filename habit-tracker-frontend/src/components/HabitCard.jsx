import { useState } from "react";
import { Link } from "react-router-dom";
import EditHabitModal from "./EditHabitModal";
import Badge from "./ui/Badge";
import Button from "./ui/Button";
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

          <Badge tone={tone}>{p}%</Badge>
        </div>

        <ProgressBar value={p} tone={p >= 80 ? "green" : p > 0 ? "amber" : "indigo"} className="mt-4" />

        <div className="mt-4 flex flex-wrap gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setOpenEdit(true)}
          >
            Edit
          </Button>

          <Button
            size="sm"
            onClick={() => onBumpToday?.(habit)}
          >
            +10% today
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => onDelete?.(habit)}
            className="text-red-700 hover:bg-red-50"
          >
            Delete
          </Button>
        </div>
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
