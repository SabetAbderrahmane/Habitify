import { useEffect, useState } from "react";
import { useToast } from "../components/ToastProvider";
import { useHabits } from "../context/HabitsContext";
import { fetchRecommendedPack } from "../lib/content";
import { fetchOnboardingProfile, saveOnboardingProfile } from "../lib/profile";

const goalOptions = [
  { key: "focus", label: "Focus" },
  { key: "fitness", label: "Fitness" },
  { key: "sleep", label: "Sleep" },
  { key: "energy", label: "Energy" },
  { key: "mental", label: "Mental Health" },
  { key: "discipline", label: "Discipline" },
];

const timeOptions = ["2 min", "5 min", "15 min", "30+ min"];
const dayOptions = ["Morning", "Afternoon", "Evening", "Late night"];

export default function RecommendedPage() {
  const toast = useToast();
  const { addHabit, refreshData } = useHabits();

  const [goal, setGoal] = useState("focus");
  const [timeCommitment, setTimeCommitment] = useState("5 min");
  const [bestTime, setBestTime] = useState("Morning");

  const [pack, setPack] = useState({ title: "", habits: [] });
  const [profileLoading, setProfileLoading] = useState(true);
  const [busyName, setBusyName] = useState("");

  // Load saved onboarding profile from backend
  useEffect(() => {
    (async () => {
      try {
        const profile = await fetchOnboardingProfile();
        setGoal(profile.goal || "focus");
        setTimeCommitment(profile.time_commitment || "5 min");
        setBestTime(profile.best_time || "Morning");
      } catch (e) {
        toast.error("Failed to load profile", e?.message || "Unknown error");
      } finally {
        setProfileLoading(false);
      }
    })();
  }, [toast]);

  // Auto-save onboarding answers to backend
  useEffect(() => {
    if (profileLoading) return;

    const saveProfile = async () => {
      try {
        await saveOnboardingProfile({
          goal,
          time_commitment: timeCommitment,
          best_time: bestTime,
        });
      } catch (e) {
        console.error("Failed to save onboarding profile", e);
      }
    };

    saveProfile();
  }, [goal, timeCommitment, bestTime, profileLoading]);

  // Load recommended pack from backend when goal changes
  useEffect(() => {
    (async () => {
      try {
        const data = await fetchRecommendedPack(goal);
        setPack(data || { title: "", habits: [] });
      } catch (e) {
        toast.error("Failed to load recommendations", e?.message || "Unknown error");
        setPack({ title: "", habits: [] });
      }
    })();
  }, [goal, toast]);

  const addSuggestedHabit = async (habit) => {
    const today = new Date().toISOString().slice(0, 10);
    setBusyName(habit.name);

    try {
      await addHabit({
        name: habit.name,
        progress: habit.defaultProgress ?? 0,
        date: today,
      });

      await refreshData();
      toast.success("Habit added", habit.name);
    } catch (e) {
      toast.error("Could not add habit", e?.message || "Unknown error");
    } finally {
      setBusyName("");
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-semibold text-[var(--color-text-primary)]">Recommended Habits</h1>
        <p className="mt-2 text-[var(--color-text-secondary)]">
          Build a starter pack based on your goals, time, and daily rhythm.
        </p>
      </div>

      {/* Questionnaire */}
      <div className="grid gap-4 lg:grid-cols-3">
        <QuestionCard title="1. What do you want to improve first?">
          <div className="flex flex-wrap gap-2">
            {goalOptions.map((g) => (
              <ChoiceButton
                key={g.key}
                active={goal === g.key}
                onClick={() => setGoal(g.key)}
              >
                {g.label}
              </ChoiceButton>
            ))}
          </div>
        </QuestionCard>

        <QuestionCard title="2. Daily time commitment">
          <div className="flex flex-wrap gap-2">
            {timeOptions.map((t) => (
              <ChoiceButton
                key={t}
                active={timeCommitment === t}
                onClick={() => setTimeCommitment(t)}
              >
                {t}
              </ChoiceButton>
            ))}
          </div>
        </QuestionCard>

        <QuestionCard title="3. Best time of day">
          <div className="flex flex-wrap gap-2">
            {dayOptions.map((t) => (
              <ChoiceButton
                key={t}
                active={bestTime === t}
                onClick={() => setBestTime(t)}
              >
                {t}
              </ChoiceButton>
            ))}
          </div>
        </QuestionCard>
      </div>

      {/* Summary */}
      <div className="rounded-3xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-[0_4px_20px_rgba(15,23,42,0.06)]">
        <div className="text-lg font-semibold text-[var(--color-text-primary)]">
          {pack.title || "Recommended Pack"}
        </div>
        <div className="mt-2 text-[var(--color-text-secondary)]">
          Based on your current goal: <span className="font-semibold text-[var(--color-text-primary)]">{goal}</span>,
          time: <span className="font-semibold text-[var(--color-text-primary)]"> {timeCommitment}</span>,
          and preferred time: <span className="font-semibold text-[var(--color-text-primary)]"> {bestTime}</span>.
        </div>
      </div>

      {/* Suggested habits */}
      {(pack.habits || []).length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[var(--color-border)] bg-[var(--color-surface)] p-8 text-center shadow-[0_4px_20px_rgba(15,23,42,0.04)]">
          <div className="text-sm font-semibold text-[var(--color-text-primary)]">No recommendations available yet</div>
          <div className="mx-auto mt-2 max-w-md text-sm leading-6 text-[var(--color-text-secondary)]">
            Recommendations will appear here when the content endpoint returns habits for the selected goal.
          </div>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {(pack.habits || []).map((habit) => (
          <div
            key={habit.name}
            className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-[0_4px_20px_rgba(15,23,42,0.05)] transition hover:-translate-y-0.5 hover:shadow-[0_10px_28px_rgba(15,23,42,0.08)]"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-lg font-semibold text-[var(--color-text-primary)]">{habit.name}</div>
                <div className="mt-2 text-sm leading-6 text-[var(--color-text-secondary)]">
                  {habit.description}
                </div>
              </div>

              <span className="rounded-xl bg-indigo-50 px-3 py-1 text-xs font-semibold text-[var(--color-accent)] ring-1 ring-indigo-100">
                {habit.difficulty}
              </span>
            </div>

            <div className="mt-5 text-xs font-medium text-[var(--color-text-muted)]">
              Suggested timing: {bestTime}
            </div>

            <button
              onClick={() => addSuggestedHabit(habit)}
              disabled={busyName === habit.name}
              className="mt-5 w-full rounded-xl bg-gradient-to-r from-cyan-400 via-fuchsia-400 to-indigo-400 px-4 py-2 text-sm font-semibold text-black disabled:opacity-60"
              type="button"
            >
              {busyName === habit.name ? "Adding..." : "Add to My Habits"}
            </button>
          </div>
          ))}
        </div>
      )}
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
