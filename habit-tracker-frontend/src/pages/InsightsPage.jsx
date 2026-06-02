import { useEffect, useState } from "react";
import InsightsPanel from "../components/InsightsPanel";
import { useHabits } from "../context/HabitsContext";
import { fetchLapseRisk } from "../lib/predictions";
import { fetchContextCorrelations } from "../lib/analytics";
import ExportReportButton from "../components/ExportReportButton";
import PageHeader from "../components/ui/PageHeader";

export default function InsightsPage() {
  const { habitDefinitions, habitLogs } = useHabits();
  const [predictions, setPredictions] = useState([]);
  const [contextCorrelations, setContextCorrelations] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      try {
        const [riskData, contextData] = await Promise.all([
          fetchLapseRisk(),
          fetchContextCorrelations().catch(() => null),
        ]);
        if (!alive) return;
        setPredictions(Array.isArray(riskData) ? riskData : []);
        setContextCorrelations(contextData);
      } catch (e) {
        console.error("Failed to load predictions", e);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [habitDefinitions]);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="AI wellness insights"
        title="Signals that help you stay consistent"
        description="Predictions and patterns are derived from logged habits, check-ins, and the existing ML endpoint."
        actions={
          <ExportReportButton 
          habits={habitDefinitions} 
          logs={habitLogs} 
          predictions={predictions} 
        />
        }
      />

      <InsightsPanel 
        habits={habitDefinitions} 
        logs={habitLogs} 
        predictions={predictions} 
        contextCorrelations={contextCorrelations}
        loading={loading}
      />
    </div>
  );
}
