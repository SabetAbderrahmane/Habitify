import { createContext, useContext, useEffect, useState } from "react";
import { fetchPendingNotificationsCount } from "../lib/notifications";

const NotificationsContext = createContext(null);

export function NotificationsProvider({ children }) {
  const [notificationCount, setNotificationCount] = useState(0);

  const refreshNotificationCount = async () => {
    const storedToken = localStorage.getItem("access_token");
    if (!storedToken) {
      setNotificationCount(0);
      return;
    }

    try {
      const count = await fetchPendingNotificationsCount();
      setNotificationCount(count);
    } catch {
      setNotificationCount(0);
    }
  };

  useEffect(() => {
    refreshNotificationCount();
  }, []);

  return (
    <NotificationsContext.Provider
      value={{
        notificationCount,
        setNotificationCount,
        refreshNotificationCount,
      }}
    >
      {children}
    </NotificationsContext.Provider>
  );
}

export function useNotifications() {
  const ctx = useContext(NotificationsContext);
  if (!ctx) {
    throw new Error("useNotifications must be used inside NotificationsProvider");
  }
  return ctx;
}
