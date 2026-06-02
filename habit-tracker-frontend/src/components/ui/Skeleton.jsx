export default function Skeleton({ className = "" }) {
  return (
    <div
      className={[
        "relative overflow-hidden rounded-xl bg-slate-100",
        "after:absolute after:inset-0 after:animate-[shimmer_1.3s_infinite] after:bg-[linear-gradient(110deg,transparent,rgba(255,255,255,0.75),transparent)]",
        className,
      ].join(" ")}
      aria-hidden="true"
    />
  );
}

export function SkeletonGrid({ count = 6 }) {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: count }).map((_, index) => (
        <Skeleton key={index} className="h-40" />
      ))}
    </div>
  );
}
