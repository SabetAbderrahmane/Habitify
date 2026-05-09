import { useState } from "react";
import { downloadUserExport } from "../lib/export";

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
      <div>
        <h1 className="text-3xl font-semibold">Settings</h1>
        <p className="mt-2 text-white/60">
          Manage local account tools and export your data for backup or model retraining.
        </p>
      </div>

      <section className="rounded-3xl bg-white/5 p-6 ring-1 ring-white/10">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-xl font-semibold">Export your data</h2>
            <p className="mt-2 max-w-2xl text-sm text-white/60">
              Download a JSON file containing your profile, habit logs, check-ins, recovery events,
              nudges, and notifications.
            </p>
          </div>

          <button
            onClick={handleExport}
            disabled={busy}
            className="rounded-2xl bg-gradient-to-r from-cyan-400 via-fuchsia-400 to-indigo-400 px-5 py-3 text-sm font-semibold text-black disabled:opacity-60"
          >
            {busy ? "Exporting..." : "Download export"}
          </button>
        </div>

        {status ? (
          <div className="mt-4 rounded-2xl bg-emerald-500/10 p-4 text-sm text-emerald-200 ring-1 ring-emerald-300/20">
            {status}
          </div>
        ) : null}

        {error ? (
          <div className="mt-4 rounded-2xl bg-red-500/10 p-4 text-sm text-red-200 ring-1 ring-red-300/20">
            {error}
          </div>
        ) : null}
      </section>

      <section className="rounded-3xl bg-white/5 p-6 ring-1 ring-white/10">
        <h2 className="text-xl font-semibold">Roadmap</h2>
        <div className="mt-3 space-y-2 text-sm text-white/65">
          <p>• Import and merge exported datasets for retraining</p>
          <p>• Connect the predictor to dashboard and recommendations</p>
          <p>• Add LLM chat guidance on top of habits and recovery</p>
        </div>
      </section>
    </div>
  );
}
