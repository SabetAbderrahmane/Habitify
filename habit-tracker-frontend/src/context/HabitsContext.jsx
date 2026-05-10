import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { 
  fetchHabitDefinitions, 
  fetchHabitLogs, 
  createHabitDefinition,
  logHabitProgress 
} from "../lib/habits";

const HabitsContext = createContext(null);

export function HabitsProvider({ token, children }) {
  const [habitDefinitions, setHabitDefinitions] = useState([]);
  const [habitLogs, setHabitLogs] = useState([]);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const refreshData = async (date) => {
    if (!token) return;
    setLoading(true);
    setError("");
    try {
      const [defs, logs] = await Promise.all([
        fetchHabitDefinitions(),
        fetchHabitLogs(date || selectedDate)
      ]);
      setHabitDefinitions(defs);
      setHabitLogs(logs);
    } catch (e) {
      setError(e?.message || "Failed to load habit data");
    } finally {
      setLoading(false);
    }
  };

  const addHabit = async (habitData) => {
    let habitId;
    
    // Check if definition already exists (by name)
    const existingDef = habitDefinitions.find(
      (d) => d.name.toLowerCase() === habitData.name.toLowerCase()
    );
    
    if (existingDef) {
      habitId = existingDef.id;
    } else {
      // 1. Create definition
      const created = await createHabitDefinition({
        name: habitData.name,
        category: habitData.category || "Other",
        target: habitData.target || "Daily",
        frequency: habitData.frequency || "daily"
      });
      setHabitDefinitions((prev) => [...prev, created]);
      habitId = created.id;
    }
    
    // 2. Log progress
    if (habitData.progress !== undefined && habitData.date) {
      await updateProgress(habitId, habitData.progress, habitData.date);
    }
    
    return habitId;
  };

  const updateProgress = async (habitId, progress, date) => {
    const logDate = date || selectedDate;
    const updatedLog = await logHabitProgress(habitId, progress, logDate);
    
    setHabitLogs((prev) => {
      const exists = prev.find(l => l.habit_id === habitId && l.date === logDate);
      if (exists) {
        return prev.map(l => (l.id === updatedLog.id ? updatedLog : l));
      }
      return [...prev, updatedLog];
    });
    
    return updatedLog;
  };

  useEffect(() => {
    if (!token) {
      setHabitDefinitions([]);
      setHabitLogs([]);
      return;
    }
    refreshData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, selectedDate]);

  const value = useMemo(
    () => ({ 
      habits: habitDefinitions, // alias for legacy code
      habitDefinitions, 
      habitLogs, 
      selectedDate,
      setSelectedDate,
      loading, 
      error, 
      refreshData, 
      addHabit,
      updateProgress
    }),
    [habitDefinitions, habitLogs, selectedDate, loading, error]
  );

  return <HabitsContext.Provider value={value}>{children}</HabitsContext.Provider>;
}

export function useHabits() {
  const ctx = useContext(HabitsContext);
  if (!ctx) throw new Error("useHabits must be used within HabitsProvider");
  return ctx;
}
