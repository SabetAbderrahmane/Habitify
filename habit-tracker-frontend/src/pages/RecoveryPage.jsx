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

  const replacementOptions = plan?.replacements || [];
  const selectedReplacement = replacement || replacementOptions[0] || "";

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
        <h1 className="text-3xl font-semibold">Recovery / Quit Lab</h1>
        <p className="mt-2 text-white/60">
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
      <div className="rounded-3xl bg-white/5 p-6 ring-1 ring-white/10">
        <div className="text-xl font-semibold">{plan?.title}</div>
        <div className="mt-2 text-white/60">
          Based on your answers, here is your first recovery strategy.
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <PlanBox title="Risk pattern" value={`${frequency} • ${dangerTime}`} />
          <PlanBox title="Main trigger" value={trigger} />
        </div>

        <div className="mt-6">
          <div className="text-sm font-semibold text-white/80">Choose a replacement action</div>
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

        <div className="mt-6 rounded-2xl bg-black/30 p-5 ring-1 ring-white/10">
          <div className="text-sm text-white/60">Your recovery plan</div>
          <div className="mt-3 text-white/80 leading-relaxed">
            When <span className="font-semibold text-white">{trigger.toLowerCase()}</span> hits during{" "}
            <span className="font-semibold text-white">{dangerTime.toLowerCase()}</span>, instead of{" "}
            <span className="font-semibold text-white">
              {habitOptions.find((h) => h.key === habit)?.label.toLowerCase()}
            </span>
            , do: <span className="font-semibold text-white">{selectedReplacement}</span>.
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
              className="rounded-xl bg-red-500/20 px-4 py-3 text-sm font-semibold text-red-100 ring-1 ring-red-300/20 hover:bg-red-500/25"
            >
              Log a relapse
            </button>
          </div>
        </div>
      </div>

      <UrgeActionModal
        open={urgeOpen}
        onClose={() => setUrgeOpen(false)}
        habitLabel={habitOptions.find((h) => h.key === habit)?.label || "Bad habit"}
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
    <div className="rounded-2xl bg-white/5 p-5 ring-1 ring-white/10">
      <div className="text-sm font-semibold text-white/80">{title}</div>
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
        "rounded-xl px-4 py-2 text-sm ring-1 transition",
        active
          ? "bg-white text-black ring-white/20"
          : "bg-white/10 text-white ring-white/15 hover:bg-white/15",
      ].join(" ")}
    >
      {children}
    </button>
  );
}

function PlanBox({ title, value }) {
  return (
    <div className="rounded-2xl bg-black/30 p-4 ring-1 ring-white/10">
      <div className="text-sm text-white/60">{title}</div>
      <div className="mt-2 text-lg font-semibold">{value}</div>
    </div>
  );
}

function StatBox({ title, value }) {
  return (
    <div className="rounded-2xl bg-white/5 p-5 ring-1 ring-white/10">
      <div className="text-sm text-white/60">{title}</div>
      <div className="mt-2 text-3xl font-semibold">{value}</div>
    </div>
  );
}
