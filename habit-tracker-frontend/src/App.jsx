import { useEffect, useState } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import CalendarPage from "./pages/CalendarPage";
import InsightsPage from "./pages/InsightsPage";
import SettingsPage from "./pages/SettingsPage";
import HabitDetail from "./pages/HabitDetail";
import HabitLibrary from "./pages/HabitLibrary";
import RecommendedPage from "./pages/RecommendedPage";
import CoreHabitsPage from "./pages/CoreHabitsPage";
import RecoveryPage from "./pages/RecoveryPage";
import { HabitsProvider } from "./context/HabitsContext";

import AppShell from "./layouts/AppShell";
import ProtectedRoute from "./components/ProtectedRoute";
import { setAuthToken } from "./lib/api";
import { fetchHabits } from "./lib/habits";

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
      <Routes>
        <Route
          path="/auth"
          element={token ? <Navigate to="/app" replace /> : <Auth onAuthed={handleAuthed} />}
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
          <Route path="library" element={<HabitLibrary />} />
          <Route path="recommended" element={<RecommendedPage />} />
          <Route path="core" element={<CoreHabitsPage />} />
          <Route path="recovery" element={<RecoveryPage />} />
          <Route path="habit/:habitName" element={<HabitDetail />} />
        </Route>

        <Route path="/" element={<Navigate to={token ? "/app" : "/auth"} replace />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
