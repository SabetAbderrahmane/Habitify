export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold">Settings</h1>
        <p className="mt-2 text-white/60">Account & preferences (coming next).</p>
      </div>

      <div className="rounded-2xl bg-black/30 p-5 ring-1 ring-white/10">
        <div className="text-sm text-white/70">Roadmap</div>
        <ul className="mt-3 list-disc pl-5 text-sm text-white/55 space-y-1">
          <li>Reminder schedule</li>
          <li>Theme toggle</li>
          <li>Export reports</li>
          <li>ML lapse predictor</li>
        </ul>
      </div>
    </div>
  );
}
