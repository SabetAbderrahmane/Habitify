import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { FiGrid, FiCalendar, FiActivity, FiSettings, FiLogOut } from "react-icons/fi";

function Item({ to, icon: Icon, label }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        [
          "flex items-center gap-3 rounded-2xl px-4 py-3 text-sm ring-1 transition",
          isActive
            ? "bg-white/15 text-white ring-white/20"
            : "bg-white/5 text-white/70 ring-white/10 hover:bg-white/10 hover:text-white",
        ].join(" ")
      }
    >
      <Icon />
      <span>{label}</span>
    </NavLink>
  );
}

export default function AppShell({ onLogout }) {
  const navigate = useNavigate();

  const logout = () => {
    onLogout?.();
    navigate("/auth", { replace: true });
  };

  return (
    <div className="min-h-screen bg-[#05060a] text-white">
      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-6 px-6 py-6 md:grid-cols-[260px_1fr]">
        {/* Sidebar */}
        <aside className="rounded-3xl bg-white/5 p-4 ring-1 ring-white/10 md:sticky md:top-6 md:h-[calc(100vh-48px)]">
          <div className="mb-5 flex items-center gap-3 px-2">
            <div className="h-10 w-10 rounded-2xl bg-gradient-to-tr from-cyan-400/60 via-fuchsia-400/40 to-indigo-400/60 ring-1 ring-white/15" />
            <div>
              <div className="text-sm tracking-widest text-white/70">HABITIFY</div>
              <div className="text-xs text-white/45">AI Habit OS</div>
            </div>
          </div>

          <div className="space-y-2">
            <Item to="/app" icon={FiGrid} label="Dashboard" />
            <Item to="/app/calendar" icon={FiCalendar} label="Calendar" />
            <Item to="/app/insights" icon={FiActivity} label="Insights" />
            <Item to="/app/settings" icon={FiSettings} label="Settings" />
          </div>

          <div className="mt-6 rounded-2xl bg-black/30 p-4 ring-1 ring-white/10">
            <div className="text-xs text-white/50">Tip</div>
            <div className="mt-1 text-sm text-white/75">
              Consistency beats intensity. Small daily wins.
            </div>
          </div>

          <button
            onClick={logout}
            className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl bg-white/10 px-4 py-3 text-sm ring-1 ring-white/15 hover:bg-white/15"
          >
            <FiLogOut />
            Logout
          </button>
        </aside>

        {/* Main */}
        <main className="rounded-3xl bg-white/5 p-6 ring-1 ring-white/10">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
