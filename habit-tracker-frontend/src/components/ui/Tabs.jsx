export default function Tabs({ tabs, value, onChange, ariaLabel = "Tabs" }) {
  return (
    <div className="flex gap-1 rounded-xl bg-slate-100 p-1" role="tablist" aria-label={ariaLabel}>
      {tabs.map((tab) => {
        const active = tab.value === value;
        return (
          <button
            key={tab.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(tab.value)}
            className={[
              "rounded-lg px-3 py-2 text-sm font-semibold transition focus:outline-none focus:ring-2 focus:ring-[#3337a6]/30",
              active ? "bg-white text-[#3337a6] shadow-sm" : "text-slate-600 hover:text-slate-950",
            ].join(" ")}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
