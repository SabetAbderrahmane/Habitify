import Card from "./Card";

export default function StatCard({ label, value, sub, icon: Icon, tone = "indigo" }) {
  const tones = {
    indigo: "bg-indigo-50 text-[#3337a6]",
    green: "bg-emerald-50 text-[#456648]",
    amber: "bg-amber-50 text-amber-700",
    slate: "bg-slate-100 text-slate-700",
  };

  return (
    <Card className="p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">{label}</div>
          <div className="mt-3 text-2xl font-bold text-[var(--color-text-primary)]">{value}</div>
          {sub ? <div className="mt-1 text-sm text-[var(--color-text-muted)]">{sub}</div> : null}
        </div>
        {Icon ? (
          <div className={["rounded-xl p-3", tones[tone] || tones.indigo].join(" ")}>
            <Icon aria-hidden="true" />
          </div>
        ) : null}
      </div>
    </Card>
  );
}
