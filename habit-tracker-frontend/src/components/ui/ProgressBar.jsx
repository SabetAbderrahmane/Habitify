import { useEffect, useState } from "react";

export default function ProgressBar({ value = 0, label, tone = "green", className = "" }) {
  const [width, setWidth] = useState(0);
  const safe = Math.max(0, Math.min(100, Number(value || 0)));
  const tones = {
    green: "bg-[#456648]",
    indigo: "bg-[#3337a6]",
    amber: "bg-amber-500",
    red: "bg-red-500",
  };

  useEffect(() => {
    const frame = requestAnimationFrame(() => setWidth(safe));
    return () => cancelAnimationFrame(frame);
  }, [safe]);

  return (
    <div className={className}>
      {label ? (
        <div className="mb-2 flex items-center justify-between text-xs text-[var(--color-text-muted)]">
          <span>{label}</span>
          <span>{safe}%</span>
        </div>
      ) : null}
      <div className="h-2 overflow-hidden rounded-full bg-slate-100">
        <div
          className={["h-full rounded-full transition-all duration-700 ease-out", tones[tone] || tones.green].join(" ")}
          style={{ width: `${width}%` }}
        />
      </div>
    </div>
  );
}
