export default function FilterBar({ search, onSearch, filters = [], resultText }) {
  return (
    <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 shadow-[0_4px_20px_rgba(15,23,42,0.04)]">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <label className="w-full lg:max-w-sm">
          <span className="sr-only">Search</span>
          <input
            className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-2.5 text-sm text-[var(--color-text-primary)] outline-none transition placeholder:text-[var(--color-text-muted)] focus:border-[var(--color-accent)] focus:ring-4 focus:ring-[#3337a6]/10"
            placeholder="Search..."
            value={search}
            onChange={(event) => onSearch(event.target.value)}
          />
        </label>
        <div className="flex flex-wrap gap-2">
          {filters.map((filter) => (
            <label key={filter.label} className="flex items-center gap-2">
              <span className="sr-only">{filter.label}</span>
              <select
                className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2.5 text-sm text-[var(--color-text-primary)] outline-none focus:border-[var(--color-accent)] focus:ring-4 focus:ring-[#3337a6]/10"
                value={filter.value}
                onChange={(event) => filter.onChange(event.target.value)}
              >
                {filter.options.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          ))}
        </div>
      </div>
      {resultText ? <div className="mt-3 text-xs text-[var(--color-text-muted)]">{resultText}</div> : null}
    </div>
  );
}
