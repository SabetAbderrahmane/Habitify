import { useState } from "react";
import { downloadUserExport } from "../lib/export";
import Button from "../components/ui/Button";
import Card from "../components/ui/Card";
import PageHeader from "../components/ui/PageHeader";

export default function SettingsPage() {
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");

  const handleExport = async () => {
    setBusy(true);
    setStatus("");
    setError("");

    try {
      await downloadUserExport();
      setStatus("Your data export has been downloaded.");
    } catch (err) {
      setError(err?.response?.data?.detail || err?.message || "Failed to export data.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Settings"
        title="Account tools"
        description="Manage local account tools and export your data for backup or model retraining."
      />

      <Card>
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-xl font-semibold text-slate-950">Export your data</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
              Download a JSON file containing your profile, habit logs, check-ins, recovery events,
              nudges, and notifications.
            </p>
          </div>

          <Button
            onClick={handleExport}
            disabled={busy}
          >
            {busy ? "Exporting..." : "Download export"}
          </Button>
        </div>

        {status ? (
          <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">
            {status}
          </div>
        ) : null}

        {error ? (
          <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        ) : null}
      </Card>

      <Card>
        <h2 className="text-xl font-semibold text-slate-950">Roadmap</h2>
        <div className="mt-3 space-y-2 text-sm leading-6 text-slate-600">
          <p>Import and merge exported datasets for retraining.</p>
          <p>Connect richer predictor explanations to dashboard and recommendations.</p>
          <p>Add chat guidance on top of habits and recovery when backend support exists.</p>
        </div>
      </Card>
    </div>
  );
}
