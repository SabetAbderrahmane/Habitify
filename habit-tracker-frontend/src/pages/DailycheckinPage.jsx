import { useEffect, useMemo, useState } from "react";
import { useHabits } from "../context/HabitsContext";
import { useToast } from "../components/ToastProvider";
import { getCheckin, getTodayKey, saveCheckin } from "../lib/checkinStorage";

const moodOptions = ["Great", "Good", "Okay", "Low", "Bad"];
const energyOptions = ["High", "Medium", "Low"];

export default function DailyCheckinPage() {
  const { habits } = useHabits();
  const toast = useToast();

  const today = getTodayKey();

  const [mood, setMood] = useState("");
  const [energy, setEnergy] = useState("");
  const [hadUrges, setHadUrges] = useState(false);
  const [difficult, setDifficult] = useState("");
  const [note, setNote] = useState("");

  const todayHabits = useMemo(() => {
    return habits.filter((h) => h.date === today);
  }, [habits, today]);

  const completedToday = useMemo(() => {
    return todayHabits.filter((h) => Number(h.progress || 0) >= 80).length;
  }, [todayHabits]);

  useEffect(() => {
    const existing = getCheckin(today);
    setMood(existing.mood || "");
    setEnergy(existing.energy || "");
    setHadUrges(Boolean(existing.hadUrges));
    setDifficult(existing.difficult || "");
    setNote(existing.note || "");
  }, [today]);

  const save = () => {
    saveCheckin(today, {
      mood,
      energy,
      hadUrges,
      difficult,
      note,
      completed: true,
    });
    toast.success("Check-in saved", "Your daily reflection has been recorded.");
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-semibold">Daily Check-in</h1>
        <p className="mt-2 text-white/60">
          Reflect on your day, track how you felt, and build useful data for future insights.
        </p>
      </div>

      {/* Today summary */}
      <div className="grid gap-4 md:grid-cols-3">
        <StatBox title="Today’s logs" value={todayHabits.length} sub="habit entries" />
        <StatBox title="Completed" value={completedToday} sub="≥ 80% progress" />
        <StatBox title="Date" value={today} sub="today" />
      </div>

      {/* Today habit list */}
      <div className="rounded-3xl bg-white/5 p-6 ring-1 ring-white/10">
        <div className="text-lg font-semibold">Today’s habits</div>
        <div className="mt-2 text-sm text-white/60">
          A quick look at what you logged today.
        </div>

        {todayHabits.length === 0 ? (
          <div className="mt-6 rounded-2xl bg-black/30 p-4 text-white/55 ring-1 ring-white/10">
            No habits logged today yet.
          </div>
        ) : (
          <div className="mt-6 grid gap-3 md:grid-cols-2">
            {todayHabits.map((h) => (
              <div
                key={h.id || `${h.name}-${h.date}`}
                className="rounded-2xl bg-black/30 p-4 ring-1 ring-white/10"
              >
                <div className="text-sm font-semibold">{h.name}</div>
                <div className="mt-2 text-xs text-white/50">{h.date}</div>
                <div className="mt-3 rounded-xl bg-white/10 px-3 py-1 text-xs inline-block ring-1 ring-white/15">
                  {h.progress}%
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Reflection form */}
      <div className="rounded-3xl bg-white/5 p-6 ring-1 ring-white/10">
        <div className="text-lg font-semibold">Reflection</div>
        <div className="mt-2 text-sm text-white/60">
          This helps users understand their patterns and gives us future ML features.
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <QuestionBlock title="How was your mood today?">
            <div className="flex flex-wrap gap-2">
              {moodOptions.map((m) => (
                <ChoiceButton key={m} active={mood === m} onClick={() => setMood(m)}>
                  {m}
                </ChoiceButton>
              ))}
            </div>
          </QuestionBlock>

          <QuestionBlock title="How was your energy today?">
            <div className="flex flex-wrap gap-2">
              {energyOptions.map((e) => (
                <ChoiceButton key={e} active={energy === e} onClick={() => setEnergy(e)}>
                  {e}
                </ChoiceButton>
              ))}
            </div>
          </QuestionBlock>

          <QuestionBlock title="Did you have urges / temptations today?">
            <div className="flex flex-wrap gap-2">
              <ChoiceButton active={hadUrges === true} onClick={() => setHadUrges(true)}>
                Yes
              </ChoiceButton>
              <ChoiceButton active={hadUrges === false} onClick={() => setHadUrges(false)}>
                No
              </ChoiceButton>
            </div>
          </QuestionBlock>

          <QuestionBlock title="What was most difficult today?">
            <input
              className="w-full rounded-2xl bg-white/5 px-4 py-3 text-sm outline-none ring-1 ring-white/10 placeholder:text-white/30 focus:ring-cyan-300/35"
              placeholder="e.g. staying focused at night"
              value={difficult}
              onChange={(e) => setDifficult(e.target.value)}
            />
          </QuestionBlock>
        </div>

        <div className="mt-6">
          <QuestionBlock title="Any short note about today?">
            <textarea
              className="min-h-[120px] w-full rounded-2xl bg-white/5 px-4 py-3 text-sm outline-none ring-1 ring-white/10 placeholder:text-white/30 focus:ring-cyan-300/35"
              placeholder="What went well? What should improve tomorrow?"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </QuestionBlock>
        </div>

        <button
          onClick={save}
          className="mt-6 w-full rounded-xl bg-gradient-to-r from-cyan-400 via-fuchsia-400 to-indigo-400 px-4 py-3 text-sm font-semibold text-black"
          type="button"
        >
          Save Daily Check-in
        </button>
      </div>
    </div>
  );
}

function StatBox({ title, value, sub }) {
  return (
    <div className="rounded-2xl bg-white/5 p-5 ring-1 ring-white/10">
      <div className="text-sm text-white/60">{title}</div>
      <div className="mt-2 text-3xl font-semibold">{value}</div>
      <div className="mt-1 text-xs text-white/45">{sub}</div>
    </div>
  );
}

function QuestionBlock({ title, children }) {
  return (
    <div>
      <div className="mb-3 text-sm font-semibold text-white/80">{title}</div>
      {children}
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
