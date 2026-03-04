import StreakCalendar from "../components/StreakCalendar";
import { useHabits } from "../context/HabitsContext";

export default function CalendarPage() {
  const { habits } = useHabits();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold">Calendar</h1>
        <p className="mt-2 text-white/60">Explore your momentum over time.</p>
      </div>
      <StreakCalendar habits={habits} />
    </div>
  );
}
