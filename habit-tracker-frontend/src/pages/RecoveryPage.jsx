import { useEffect, useMemo, useState } from "react";
import UrgeActionModal from "../components/UrgeActionModal";
import { useToast } from "../components/ToastProvider";
import {
  fetchRecoveryPlan,
  fetchRecoveryStats,
  logRecoveryRelapse,
  logSurvivedUrge,
} from "../lib/recovery";

const habitOptions = [
  { key: "smoking", label: "Smoking" },
  { key: "sleep_late", label: "Sleeping late" },
  { key: "alcohol", label: "Alcohol" },
  { key: "doomscrolling", label: "Doomscrolling" },
];

const frequencyOptions = ["Daily", "A few times a week", "Weekly", "Irregularly"];
const timeOptions = ["Morning", "Afternoon", "Evening", "Late night"];
const triggerOptions = ["Stress", "Boredom", "Social pressure", "Low energy", "Anxiety", "Habit / autopilot"];
const fallbackReplacements = {
  smoking: ["Drink cold water", "Take a 5-minute walk", "Do 10 slow breaths"],
  sleep_late: ["Start a 10-minute wind-down", "Put the phone away", "Dim the lights"],
  alcohol: ["Make tea or sparkling water", "Leave the room", "Text an accountability contact"],
  doomscrolling: ["Lock the phone for 10 minutes", "Stretch", "Open a book"],
};

export default function RecoveryPage() {
  const toast = useToast();

  const [habit, setHabit] = useState("smoking");
  const [frequency, setFrequency] = useState("Daily");
  const [dangerTime, setDangerTime] = useState("Evening");
  const [trigger, setTrigger] = useState("Stress");
  const [replacement, setReplacement] = useState("");
  const [urgeOpen, setUrgeOpen] = useState(false);
  const [stats, setStats] = useState({
    relapseCount: 0,
    survivedCount: 0,
    strongestTrigger: "—",
    cleanStreak: 0,
  });
  const [plan, setPlan] = useState({ title: "", replacements: [] });

  const replacementOptions =
    plan?.replacements?.length ? plan.replacements : fallbackReplacements[habit] || [];
  const selectedReplacement = replacement || replacementOptions[0] || "";
  const habitLabel = habitOptions.find((h) => h.key === habit)?.label || "habit";
  const planTitle = plan?.title || `Reduce ${habitLabel}`;

  useEffect(() => {
    (async () => {
      try {
        const data = await fetchRecoveryPlan(habit);
        setPlan(data);
      } catch (e) {
        toast.error("Failed to load recovery plan", e?.message || "Unknown error");
        setPlan({ title: "", replacements: [] });
      }
    })();
  }, [habit, toast]);

  useEffect(() => {
    (async () => {
      try {
        const data = await fetchRecoveryStats(habit);
        setStats(data);
      } catch (e) {
        toast.error("Failed to load recovery stats", e?.message || "Unknown error");
      }
    })();
  }, [habit, toast]);

  const refreshStats = async () => {
    try {
      const data = await fetchRecoveryStats(habit);
      setStats(data);
    } catch (e) {
      toast.error("Failed to refresh stats", e?.message || "Unknown error");
    }
  };

  const handleRelapse = async () => {
    try {
      await logRecoveryRelapse({
        habit_key: habit,
        trigger,
      });
      await refreshStats();
      toast.error("Relapse logged", "No shame. Start again from the next decision.");
    } catch (e) {
      toast.error("Failed to log relapse", e?.message || "Unknown error");
    }
  };

  const handleUrgeSuccess = async () => {
    try {
      await logSurvivedUrge({
        habit_key: habit,
        trigger,
      });
      await refreshStats();
      toast.success("Urge survived", "That was a real win.");
    } catch (e) {
      toast.error("Failed to log urge success", e?.message || "Unknown error");
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-semibold text-[var(--color-text-primary)]">Recovery / Quit Lab</h1>
        <p className="mt-2 text-[var(--color-text-secondary)]">
          Build a recovery plan to reduce harmful habits and replace them with healthier actions.
        </p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <StatBox title="Clean streak" value={`${stats.cleanStreak}d`} />
        <StatBox title="Relapses" value={stats.relapseCount} />
        <StatBox title="Urges survived" value={stats.survivedCount} />
        <StatBox title="Strongest trigger" value={stats.strongestTrigger} />
      </div>

      {/* Questionnaire */}
      <div className="grid gap-4 lg:grid-cols-2">
        <QuestionCard title="1. What habit do you want to reduce?">
          <div className="flex flex-wrap gap-2">
            {habitOptions.map((h) => (
              <ChoiceButton
                key={h.key}
                active={habit === h.key}
                onClick={() => {
                  setHabit(h.key);
                  setReplacement("");
                }}
              >
                {h.label}
              </ChoiceButton>
            ))}
          </div>
        </QuestionCard>

        <QuestionCard title="2. How often does it happen?">
          <div className="flex flex-wrap gap-2">
            {frequencyOptions.map((f) => (
              <ChoiceButton key={f} active={frequency === f} onClick={() => setFrequency(f)}>
                {f}
              </ChoiceButton>
            ))}
          </div>
        </QuestionCard>

        <QuestionCard title="3. When is it most likely to happen?">
          <div className="flex flex-wrap gap-2">
            {timeOptions.map((t) => (
              <ChoiceButton key={t} active={dangerTime === t} onClick={() => setDangerTime(t)}>
                {t}
              </ChoiceButton>
            ))}
          </div>
        </QuestionCard>

        <QuestionCard title="4. What triggers it the most?">
          <div className="flex flex-wrap gap-2">
            {triggerOptions.map((t) => (
              <ChoiceButton key={t} active={trigger === t} onClick={() => setTrigger(t)}>
                {t}
              </ChoiceButton>
            ))}
          </div>
        </QuestionCard>
      </div>

      {/* Recovery plan */}
      <div className="rounded-3xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-[0_4px_20px_rgba(15,23,42,0.06)]">
        <div className="text-xl font-semibold text-[var(--color-text-primary)]">{planTitle}</div>
        <div className="mt-2 text-[var(--color-text-secondary)]">
          Based on your answers, here is your first recovery strategy.
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <PlanBox title="Risk pattern" value={`${frequency} • ${dangerTime}`} />
          <PlanBox title="Main trigger" value={trigger} />
        </div>

        <div className="mt-6">
          <div className="text-sm font-semibold text-[var(--color-text-primary)]">Choose a replacement action</div>
          <div className="mt-3 flex flex-wrap gap-2">
            {replacementOptions.map((r) => (
              <ChoiceButton
                key={r}
                active={selectedReplacement === r}
                onClick={() => setReplacement(r)}
              >
                {r}
              </ChoiceButton>
            ))}
          </div>
        </div>

        <div className="mt-6 rounded-2xl border border-indigo-100 bg-indigo-50/60 p-5">
          <div className="text-sm font-semibold text-[var(--color-text-secondary)]">Your recovery plan</div>
          <div className="mt-3 leading-relaxed text-[var(--color-text-secondary)]">
            When <span className="font-semibold text-[var(--color-text-primary)]">{trigger.toLowerCase()}</span> hits during{" "}
            <span className="font-semibold text-[var(--color-text-primary)]">{dangerTime.toLowerCase()}</span>, instead of{" "}
            <span className="font-semibold text-[var(--color-text-primary)]">
              {habitLabel.toLowerCase()}
            </span>
            , do: <span className="font-semibold text-[var(--color-text-primary)]">{selectedReplacement}</span>.
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-2">
            <button
              type="button"
              onClick={() => setUrgeOpen(true)}
              className="rounded-xl bg-gradient-to-r from-cyan-400 via-fuchsia-400 to-indigo-400 px-4 py-3 text-sm font-semibold text-black"
            >
              I have an urge right now
            </button>

            <button
              type="button"
              onClick={handleRelapse}
              className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700 hover:bg-red-100"
            >
              Log a relapse
            </button>
          </div>
        </div>
      </div>

      <UrgeActionModal
        open={urgeOpen}
        onClose={() => setUrgeOpen(false)}
        habitLabel={habitLabel}
        trigger={trigger}
        dangerTime={dangerTime}
        replacement={selectedReplacement}
        onSuccess={handleUrgeSuccess}
      />
    </div>
  );
}

function QuestionCard({ title, children }) {
  return (
    <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-[0_4px_20px_rgba(15,23,42,0.05)]">
      <div className="text-sm font-semibold text-[var(--color-text-primary)]">{title}</div>
      <div className="mt-4">{children}</div>
    </div>
  );
}

function ChoiceButton({ children, active, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "rounded-xl px-4 py-2 text-sm font-semibold ring-1 transition focus:outline-none focus:ring-4 focus:ring-[#3337a6]/10",
        active
          ? "bg-[var(--color-accent)] text-white ring-[var(--color-accent)]"
          : "bg-[var(--color-surface)] text-[var(--color-text-secondary)] ring-[var(--color-border)] hover:bg-[var(--color-surface-soft)] hover:text-[var(--color-text-primary)]",
      ].join(" ")}
    >
      {children}
    </button>
  );
}

function PlanBox({ title, value }) {
  return (
    <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-soft)] p-4">
      <div className="text-sm text-[var(--color-text-muted)]">{title}</div>
      <div className="mt-2 text-lg font-semibold text-[var(--color-text-primary)]">{value}</div>
    </div>
  );
}

function StatBox({ title, value }) {
  return (
    <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-[0_4px_20px_rgba(15,23,42,0.05)]">
      <div className="text-sm text-[var(--color-text-muted)]">{title}</div>
      <div className="mt-2 text-3xl font-semibold text-[var(--color-text-primary)]">{value}</div>
    </div>
  );
}
