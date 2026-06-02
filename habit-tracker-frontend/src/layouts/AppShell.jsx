import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import {
  FiActivity,
  FiBell,
  FiBookOpen,
  FiCalendar,
  FiCheckSquare,
  FiCompass,
  FiGrid,
  FiHeart,
  FiLogOut,
  FiSettings,
  FiShield,
  FiUser,
} from "react-icons/fi";
import { useNotifications } from "../context/NotificationsContext";

const navItems = [
  { to: "/app", icon: FiGrid, label: "Dashboard" },
  { to: "/app/library", icon: FiBookOpen, label: "Habit Library" },
  { to: "/app/insights", icon: FiActivity, label: "Analytics" },
  { to: "/app/recommended", icon: FiCompass, label: "Insights" },
  { to: "/app/checkin", icon: FiCheckSquare, label: "Daily Check-in" },
  { to: "/app/calendar", icon: FiCalendar, label: "Calendar" },
  { to: "/app/core", icon: FiHeart, label: "Core Habits" },
  { to: "/app/recovery", icon: FiShield, label: "Recovery" },
  { to: "/app/notifications", icon: FiBell, label: "Reports", badge: true },
];

function isRouteActive(pathname, to) {
  if (to === "/app") return pathname === "/app";
  return pathname === to || pathname.startsWith(`${to}/`);
}

function NavItem({ to, icon: Icon, label, badge, active }) {
  return (
    <Link
      to={to}
      aria-current={active ? "page" : undefined}
      className={[
        "relative flex items-center gap-5 rounded-xl px-5 py-3 text-[15px] font-semibold tracking-[0.08em] transition focus:outline-none focus:ring-4 focus:ring-[#3337a6]/15",
        active
          ? "bg-[#ebeef0] text-[#03006d] shadow-[inset_-4px_0_0_#3337a6]"
          : "text-[#181c1e] hover:bg-[#ebeef0]/70 hover:text-[#03006d]",
      ].join(" ")}
    >
      <Icon className="h-5 w-5 shrink-0" />
      <span>{label}</span>
      {badge > 0 ? (
        <span className="absolute right-3 top-2 rounded-full bg-red-600 px-2 text-xs font-semibold text-white">
          {badge}
        </span>
      ) : null}
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
    <div className="min-h-screen bg-[#f7fafc] text-[#181c1e]">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[320px] border-r border-[#e0e3e5] bg-[#f7fafc] px-5 py-10 md:flex md:flex-col">
        <div className="mb-11 flex items-center gap-3">
          <div className="grid h-11 w-11 place-items-center rounded-2xl bg-[#4c51bf] text-white">
            <FiActivity aria-hidden="true" className="h-5 w-5" />
          </div>
          <div>
            <div className="text-3xl font-bold leading-none text-[#1117a8]">HabitSphere</div>
            <div className="mt-1 text-sm font-semibold tracking-[0.16em] text-[#181c1e]">AI-Powered Wellness</div>
          </div>
        </div>

        <Link
          to="/app"
          className="mb-8 inline-flex h-[60px] items-center justify-center gap-3 rounded-xl bg-[#3337a6] px-5 text-base font-bold tracking-[0.06em] text-white shadow-[0_14px_30px_rgba(51,55,166,0.16)]"
        >
          <span className="text-3xl leading-none">+</span>
          New Habit
        </Link>

        <nav className="flex-1 space-y-3" aria-label="Primary navigation">
          {navItems.map((item) => (
            <NavItem
              key={`${item.to}-${item.label}`}
              to={item.to}
              icon={item.icon}
              label={item.label}
              badge={item.badge ? notificationCount : 0}
              active={isRouteActive(location.pathname, item.to)}
            />
          ))}
        </nav>

        <div className="mt-8 border-t border-[#e0e3e5] pt-8">
          <Link
            to="/app/profile"
            className="flex items-center gap-5 rounded-xl px-5 py-3 text-[15px] font-semibold tracking-[0.08em] text-[#181c1e] transition hover:bg-[#ebeef0]/70"
          >
            <FiUser className="h-5 w-5" />
            Profile
          </Link>
          <Link
            to="/app/settings"
            className="mt-3 flex items-center gap-5 rounded-xl px-5 py-3 text-[15px] font-semibold tracking-[0.08em] text-[#181c1e] transition hover:bg-[#ebeef0]/70"
          >
            <FiSettings className="h-5 w-5" />
            Settings
          </Link>
          <button
            onClick={logout}
            className="mt-3 flex w-full items-center gap-5 rounded-xl px-5 py-3 text-left text-[15px] font-semibold tracking-[0.08em] text-[#181c1e] transition hover:bg-[#ebeef0]/70"
          >
            <FiLogOut className="h-5 w-5" />
            Logout
          </button>
        </div>
      </aside>

      <div className="min-h-screen md:pl-[320px]">
        <main className="min-w-0 px-5 py-6 pb-24 md:px-10 md:py-10 md:pb-10">
          <div className="mx-auto max-w-[1220px]">
            <Outlet />
          </div>
        </main>

        <nav
          className="fixed inset-x-0 bottom-0 z-40 border-t border-[#e0e3e5] bg-white/95 px-3 py-2 shadow-[0_-8px_24px_rgba(15,23,42,0.08)] md:hidden"
          aria-label="Mobile navigation"
        >
          <div className="grid grid-cols-5 gap-1">
            {navItems.slice(0, 5).map((item) => (
              <Link
                key={`${item.to}-${item.label}-mobile`}
                to={item.to}
                aria-current={isRouteActive(location.pathname, item.to) ? "page" : undefined}
                className={[
                  "relative flex flex-col items-center gap-1 rounded-xl px-2 py-2 text-[11px] font-semibold transition focus:outline-none focus:ring-2 focus:ring-[#3337a6]/20",
                  isRouteActive(location.pathname, item.to) ? "bg-[#ebeef0] text-[#3337a6]" : "text-[#464653]",
                ].join(" ")}
              >
                <item.icon aria-hidden="true" className="text-lg" />
                <span>{item.label.replace("Habit ", "")}</span>
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
