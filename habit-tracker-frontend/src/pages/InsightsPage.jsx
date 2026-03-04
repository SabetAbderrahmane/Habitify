import InsightsPanel from "../components/InsightsPanel";
import { useHabits } from "../context/HabitsContext";

export default function InsightsPage() {
  const { habits } = useHabits();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold">Insights</h1>
        <p className="mt-2 text-white/60">Signals that help you stay consistent.</p>
      </div>
      <InsightsPanel habits={habits} />
    </div>
  );
}
