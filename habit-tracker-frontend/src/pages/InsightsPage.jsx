import { useEffect, useState } from "react";
import InsightsPanel from "../components/InsightsPanel";
import { useHabits } from "../context/HabitsContext";
import { fetchLapseRisk } from "../lib/predictions";
import ExportReportButton from "../components/ExportReportButton";

export default function InsightsPage() {
  const { habitDefinitions, habitLogs } = useHabits();
  const [predictions, setPredictions] = useState([]);

  useEffect(() => {
    (async () => {
      try {
        const data = await fetchLapseRisk();
        setPredictions(Array.isArray(data) ? data : []);
      } catch (e) {
        console.error("Failed to load predictions", e);
      }
    })();
  }, [habitDefinitions]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-3xl font-semibold">Insights</h1>
          <p className="mt-2 text-white/60">Signals that help you stay consistent.</p>
        </div>

        <ExportReportButton 
          habits={habitDefinitions} 
          logs={habitLogs} 
          predictions={predictions} 
        />
      </div>

      <InsightsPanel 
        habits={habitDefinitions} 
        logs={habitLogs} 
        predictions={predictions} 
      />
    </div>
  );
}
