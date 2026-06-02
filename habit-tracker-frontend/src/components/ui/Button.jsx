export default function Button({
  as: Component = "button",
  variant = "primary",
  size = "md",
  className = "",
  children,
  ...props
}) {
  const variants = {
    primary: "bg-[var(--color-accent)] text-white hover:bg-[#272b86] focus:ring-[#3337a6]/30",
    secondary: "border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-primary)] hover:bg-[var(--color-surface-soft)] focus:ring-slate-300",
    ghost: "text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-soft)] focus:ring-slate-300",
    danger: "bg-red-600 text-white hover:bg-red-700 focus:ring-red-300",
  };
  const sizes = {
    sm: "px-3 py-2 text-xs",
    md: "px-4 py-2.5 text-sm",
    lg: "px-5 py-3 text-sm",
  };
  const typeProps = Component === "button" ? { type: "button" } : {};

  return (
    <Component
      className={[
        "inline-flex items-center justify-center gap-2 rounded-lg font-semibold transition focus:outline-none focus:ring-4 disabled:cursor-not-allowed disabled:opacity-60",
        variants[variant] || variants.primary,
        sizes[size] || sizes.md,
        className,
      ].join(" ")}
      {...typeProps}
      {...props}
    >
      {children}
    </Component>
  );
}
