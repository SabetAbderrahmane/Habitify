import { useEffect, useState } from "react";
import { api } from "../lib/api";
import { fetchOnboardingProfile, saveOnboardingProfile } from "../lib/profile";
import Button from "../components/ui/Button";
import Card from "../components/ui/Card";
import PageHeader from "../components/ui/PageHeader";

const goalOptions = ["focus", "fitness", "sleep", "energy", "mental", "discipline"];
const timeOptions = ["2 min", "5 min", "15 min", "30+ min"];
const dayOptions = ["Morning", "Afternoon", "Evening", "Late night"];

export default function ProfilePage() {
  const [email, setEmail] = useState("");
  const [profile, setProfile] = useState({
    goal: "focus",
    time_commitment: "5 min",
    best_time: "Morning",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      setError("");
      try {
        const [statusResponse, profileResponse] = await Promise.allSettled([
          api.get("/status"),
          fetchOnboardingProfile(),
        ]);

        if (!alive) return;

        if (statusResponse.status === "fulfilled") {
          setEmail(statusResponse.value?.data?.email || "");
        }

        if (profileResponse.status === "fulfilled") {
          setProfile({
            goal: profileResponse.value?.goal || "focus",
            time_commitment: profileResponse.value?.time_commitment || "5 min",
            best_time: profileResponse.value?.best_time || "Morning",
          });
        }
      } catch (err) {
        if (alive) setError(err?.message || "Failed to load profile");
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, []);

  const saveProfile = async () => {
    setSaving(true);
    setStatus("");
    setError("");
    try {
      await saveOnboardingProfile(profile);
      setStatus("Profile preferences saved.");
    } catch (err) {
      setError(err?.response?.data?.detail || err?.message || "Failed to save profile.");
    } finally {
      setSaving(false);
    }
  };

  const update = (key, value) => {
    setProfile((current) => ({ ...current, [key]: value }));
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Profile"
        title="Your wellness profile"
        description="Keep your recommendation preferences connected to the real onboarding profile stored by the backend."
      />

      <Card className="rounded-3xl">
        <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="text-sm font-bold uppercase tracking-[0.14em] text-[var(--color-text-muted)]">Signed in as</div>
            <div className="mt-2 text-2xl font-semibold text-[var(--color-text-primary)]">
              {loading ? "Loading..." : email || "Authenticated user"}
            </div>
          </div>
          <div className="rounded-2xl bg-indigo-50 px-4 py-2 text-sm font-semibold text-[var(--color-accent)]">
            Active session
          </div>
        </div>
      </Card>

      <Card className="rounded-3xl">
        <h2 className="text-xl font-semibold text-[var(--color-text-primary)]">Recommendation preferences</h2>
        <p className="mt-2 text-sm leading-6 text-[var(--color-text-secondary)]">
          These values are used by Recommended Habits and are saved through the existing onboarding profile API.
        </p>

        <div className="mt-6 grid gap-5 md:grid-cols-3">
          <ProfileSelect
            label="Primary goal"
            value={profile.goal}
            options={goalOptions}
            onChange={(value) => update("goal", value)}
          />
          <ProfileSelect
            label="Daily time"
            value={profile.time_commitment}
            options={timeOptions}
            onChange={(value) => update("time_commitment", value)}
          />
          <ProfileSelect
            label="Best time"
            value={profile.best_time}
            options={dayOptions}
            onChange={(value) => update("best_time", value)}
          />
        </div>

        {status ? (
          <div className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">{status}</div>
        ) : null}
        {error ? (
          <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>
        ) : null}

        <div className="mt-6">
          <Button onClick={saveProfile} disabled={saving || loading}>
            {saving ? "Saving..." : "Save profile"}
          </Button>
        </div>
      </Card>
    </div>
  );
}

function ProfileSelect({ label, value, options, onChange }) {
  return (
    <label className="block">
      <span className="text-sm font-semibold text-[var(--color-text-secondary)]">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-2 w-full rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-soft)] px-4 py-3 text-sm font-semibold text-[var(--color-text-primary)] outline-none focus:border-[var(--color-accent)] focus:ring-4 focus:ring-[#3337a6]/10"
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}
