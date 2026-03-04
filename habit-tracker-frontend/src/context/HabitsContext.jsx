import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { createHabit, fetchHabits } from "../lib/habits";

const HabitsContext = createContext(null);

export function HabitsProvider({ token, children }) {
  const [habits, setHabits] = useState([]);
  const [loadingHabits, setLoadingHabits] = useState(false);
  const [habitsError, setHabitsError] = useState("");

  const reloadHabits = async () => {
    setHabitsError("");
    setLoadingHabits(true);
    try {
      const data = await fetchHabits();
      setHabits(Array.isArray(data) ? data : []);
    } catch (e) {
      setHabitsError(e?.message || "Failed to load habits");
    } finally {
      setLoadingHabits(false);
    }
  };

  const addHabit = async (habit) => {
    const created = await createHabit(habit);
    setHabits((prev) => [created, ...prev]);
    return created;
  };

  useEffect(() => {
    if (!token) {
      setHabits([]);
      return;
    }
    reloadHabits();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const value = useMemo(
    () => ({ habits, setHabits, loadingHabits, habitsError, reloadHabits, addHabit }),
    [habits, loadingHabits, habitsError]
  );

  return <HabitsContext.Provider value={value}>{children}</HabitsContext.Provider>;
}

export function useHabits() {
  const ctx = useContext(HabitsContext);
  if (!ctx) throw new Error("useHabits must be used within HabitsProvider");
  return ctx;
}
