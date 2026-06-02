import { useNavigate } from "react-router-dom";
import { FiBell } from "react-icons/fi";
import { useNotifications } from "../context/NotificationsContext";

export default function NotificationsButton({ className = "" }) {
  const navigate = useNavigate();
  const { notificationCount, refreshNotificationCount } = useNotifications();

  const openNotifications = async () => {
    try {
      await refreshNotificationCount();
    } finally {
      navigate("/app/notifications");
    }
  };

  return (
    <button
      className={className || "relative grid h-11 w-11 place-items-center rounded-full text-[#181c1e] hover:bg-[#ebeef0]"}
      type="button"
      aria-label="Open notifications"
      onClick={openNotifications}
    >
      <FiBell className="h-6 w-6" />
      {notificationCount > 0 ? (
        <span className="absolute right-1.5 top-1.5 min-w-[18px] rounded-full bg-red-600 px-1.5 text-[10px] font-bold leading-[18px] text-white">
          {notificationCount}
        </span>
      ) : null}
    </button>
  );
}
