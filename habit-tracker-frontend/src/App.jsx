import { useEffect, useState } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import CalendarPage from "./pages/CalendarPage";
import InsightsPage from "./pages/InsightsPage";
import SettingsPage from "./pages/SettingsPage";
import ProfilePage from "./pages/ProfilePage";
import HabitDetail from "./pages/HabitDetail";
import HabitLibrary from "./pages/HabitLibrary";
import RecommendedPage from "./pages/RecommendedPage";
import CoreHabitsPage from "./pages/CoreHabitsPage";
import RecoveryPage from "./pages/RecoveryPage";
import DailyCheckinPage from "./pages/DailyCheckinPage";
import { HabitsProvider } from "./context/HabitsContext";

import AppShell from "./layouts/AppShell";
import ProtectedRoute from "./components/ProtectedRoute";
import { setAuthToken } from "./lib/api";
import NotificationsPage from "./pages/NotificationsPage";
import { NotificationsProvider } from "./context/NotificationsContext";



export default function App() {
  const [token, setToken] = useState(localStorage.getItem("access_token") || "");

  useEffect(() => setAuthToken(token), [token]);

  const handleAuthed = (t) => setToken(t);

  const logout = () => {
    localStorage.removeItem("access_token");
    setToken("");
  };

  return (
    <BrowserRouter>
      <NotificationsProvider>
      <Routes>
        <Route
          path="/auth"
          element={<Auth onAuthed={handleAuthed} />}
        />

        <Route
          path="/app"
          element={
            <ProtectedRoute token={token}>
              <HabitsProvider token={token}>
                <AppShell onLogout={logout} />
              </HabitsProvider>
            </ProtectedRoute>
          }
        >
          <Route index element={<Dashboard />} />
          <Route path="calendar" element={<CalendarPage />} />
          <Route path="insights" element={<InsightsPage />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="profile" element={<ProfilePage />} />
          <Route path="library" element={<HabitLibrary />} />
          <Route path="recommended" element={<RecommendedPage />} />
          <Route path="core" element={<CoreHabitsPage />} />
          <Route path="recovery" element={<RecoveryPage />} />
          <Route path="checkin" element={<DailyCheckinPage />} />
          <Route path="habit/:habitName" element={<HabitDetail />} />
          <Route path="notifications" element={<NotificationsPage />} />
        </Route>
        
        <Route path="/" element={<Navigate to="/auth" replace />} />
        <Route path="/dashboard" element={<Navigate to="/app" replace />} />
        <Route path="/calendar" element={<Navigate to="/app/calendar" replace />} />
        <Route path="/recovery" element={<Navigate to="/app/recovery" replace />} />
        <Route path="/recommended" element={<Navigate to="/app/recommended" replace />} />
        <Route path="/library" element={<Navigate to="/app/library" replace />} />
        <Route path="/insights" element={<Navigate to="/app/insights" replace />} />
        <Route path="/notifications" element={<Navigate to="/app/notifications" replace />} />
        <Route path="/alerts" element={<Navigate to="/app/notifications" replace />} />
        <Route path="/settings" element={<Navigate to="/app/settings" replace />} />
        <Route path="/profile" element={<Navigate to="/app/profile" replace />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      </NotificationsProvider>
    </BrowserRouter>
  );
}
