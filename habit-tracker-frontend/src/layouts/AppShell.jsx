import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import {
  FiGrid,
  FiBookOpen,
  FiCompass,
  FiHeart,
  FiCalendar,
  FiActivity,
  FiSettings,
  FiShield,
  FiCheckSquare,
  FiLogOut,
} from "react-icons/fi";
import { FiBell } from "react-icons/fi";
import { useNotifications } from "../context/NotificationsContext";

const navItems = [
  { to: "/app", icon: FiGrid, label: "Dashboard" },
  { to: "/app/checkin", icon: FiCheckSquare, label: "Check-in" },
  { to: "/app/notifications", icon: FiBell, label: "Alerts", badge: true },
  { to: "/app/library", icon: FiBookOpen, label: "Library" },
  { to: "/app/recommended", icon: FiCompass, label: "Recommended" },
  { to: "/app/core", icon: FiHeart, label: "Core" },
  { to: "/app/recovery", icon: FiShield, label: "Recovery" },
  { to: "/app/calendar", icon: FiCalendar, label: "Calendar" },
  { to: "/app/insights", icon: FiActivity, label: "Insights" },
  { to: "/app/settings", icon: FiSettings, label: "Settings" },
];

function isRouteActive(pathname, to) {
  if (to === "/app") return pathname === "/app";
  return pathname === to || pathname.startsWith(`${to}/`);
}

function Item({ to, icon: Icon, label, badge, active }) {
  return (
    <Link
      to={to}
      aria-current={active ? "page" : undefined}
      className={
        [
          "relative flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold transition focus:outline-none focus:ring-4 focus:ring-[#3337a6]/15",
          active
            ? "bg-[#ebeef0] text-[#3337a6]"
            : "text-slate-600 hover:bg-slate-100 hover:text-slate-950",
        ].join(" ")
      }
    >
      <Icon className="shrink-0" />
      <span>{label}</span>
      {badge > 0 && (
        <span className="absolute right-2 top-1 rounded-full bg-red-600 px-2 text-xs font-semibold text-white">
          {badge}
        </span>
      )}
    </Link>
  );
}

export default function AppShell({ onLogout }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { notificationCount, setNotificationCount } = useNotifications();

  const logout = () => {
    setNotificationCount(0);
    onLogout?.();
    navigate("/auth", { replace: true });
  };

  return (
    <div className="min-h-screen bg-[#f7fafc] text-slate-950">
      <div className="mx-auto grid min-h-screen max-w-[1400px] grid-cols-1 md:grid-cols-[272px_1fr]">
        <aside className="hidden border-r border-slate-200/80 bg-white/80 px-4 py-8 shadow-sm backdrop-blur-xl md:sticky md:top-0 md:flex md:h-screen md:flex-col">
          <div className="mb-10 flex items-center gap-3 px-2">
            <div className="grid h-10 w-10 place-items-center rounded-2xl bg-[#3337a6] text-white shadow-[0_0_18px_rgba(51,55,166,0.22)]">
              <FiActivity aria-hidden="true" />
            </div>
            <div>
              <div className="text-lg font-bold text-[#3337a6]">Habitify</div>
              <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">AI Wellness</div>
            </div>
          </div>

          <nav className="flex-1 space-y-1" aria-label="Primary navigation">
            {navItems.map((item) => (
              <Item
                key={item.to}
                to={item.to}
                icon={item.icon}
                label={item.label}
                badge={item.badge ? notificationCount : 0}
                active={isRouteActive(location.pathname, item.to)}
              />
            ))}
          </nav>

          <div className="mt-6 rounded-2xl border border-indigo-100 bg-indigo-50/70 p-4">
            <div className="text-xs font-semibold uppercase tracking-wider text-[#3337a6]">Focus cue</div>
            <div className="mt-2 text-sm leading-6 text-slate-700">One honest log is enough to keep the system useful.</div>
          </div>

          <button
            onClick={logout}
            className="mt-5 flex w-full items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 focus:outline-none focus:ring-4 focus:ring-slate-300"
          >
            <FiLogOut />
            Logout
          </button>
        </aside>

        <main className="min-w-0 px-4 py-5 pb-24 md:px-8 md:py-8 md:pb-8">
          <Outlet />
        </main>

        <nav
          className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/90 px-3 py-2 shadow-[0_-8px_24px_rgba(15,23,42,0.08)] backdrop-blur-xl md:hidden"
          aria-label="Mobile navigation"
        >
          <div className="grid grid-cols-5 gap-1">
            {navItems.slice(0, 5).map((item) => (
              <Link
                key={item.to}
                to={item.to}
                aria-current={isRouteActive(location.pathname, item.to) ? "page" : undefined}
                className={
                  [
                    "relative flex flex-col items-center gap-1 rounded-xl px-2 py-2 text-[11px] font-semibold transition focus:outline-none focus:ring-2 focus:ring-[#3337a6]/20",
                    isRouteActive(location.pathname, item.to) ? "bg-indigo-50 text-[#3337a6]" : "text-slate-500",
                  ].join(" ")
                }
              >
                <item.icon aria-hidden="true" className="text-lg" />
                <span>{item.label}</span>
                {item.badge && notificationCount > 0 ? (
                  <span className="absolute right-3 top-1 h-2.5 w-2.5 rounded-full bg-red-600" />
                ) : null}
              </Link>
            ))}
          </div>
        </nav>
      </div>
    </div>
  );
}
