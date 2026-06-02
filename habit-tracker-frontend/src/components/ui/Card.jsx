export default function Card({ as: Component = "section", className = "", children, ...props }) {
  return (
    <Component
      className={[
        "rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-[0_4px_20px_rgba(15,23,42,0.06)]",
        className,
      ].join(" ")}
      {...props}
    >
      {children}
    </Component>
  );
}
