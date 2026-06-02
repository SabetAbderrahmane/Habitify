import { useEffect, useMemo, useState } from "react";
import { FiCalendar, FiCheckCircle, FiList } from "react-icons/fi";
import { useHabits } from "../context/HabitsContext";
import { useToast } from "../components/ToastProvider";
import { fetchCheckin, saveCheckin } from "../lib/checkins";
import Button from "../components/ui/Button";
import Card from "../components/ui/Card";
import EmptyState from "../components/ui/EmptyState";
import PageHeader from "../components/ui/PageHeader";
import ProgressBar from "../components/ui/ProgressBar";
import StatCard from "../components/ui/StatCard";

function getTodayKey() {
  return new Date().toISOString().slice(0, 10);
}

const moodOptions = ["Happy", "Good", "Neutral", "Low", "Sad"];
const energyOptions = ["High", "Good", "Moderate", "Low", "Drained"];

export default function DailyCheckinPage() {
  const { habits } = useHabits();
  const toast = useToast();

  const today = getTodayKey();

  const [mood, setMood] = useState("");
  const [energy, setEnergy] = useState("");
  const [hadUrges, setHadUrges] = useState(false);
  const [difficult, setDifficult] = useState("");
  const [note, setNote] = useState("");
  const [sleepHours, setSleepHours] = useState("");
  const [sleepQuality, setSleepQuality] = useState("");
  const [weatherCondition, setWeatherCondition] = useState("");
  const [temperatureC, setTemperatureC] = useState("");

  const todayHabits = useMemo(() => {
    return habits.filter((h) => h.date === today);
  }, [habits, today]);

  const completedToday = useMemo(() => {
    return todayHabits.filter((h) => Number(h.progress || 0) >= 80).length;
  }, [todayHabits]);

  useEffect(() => {
    (async () => {
      try {
        const existing = await fetchCheckin(today);
        setMood(existing.mood || "");
        setEnergy(existing.energy || "");
        setHadUrges(Boolean(existing.had_urges));
        setDifficult(existing.difficult || "");
        setNote(existing.note || "");
        setSleepHours(existing.sleep_hours ?? "");
        setSleepQuality(existing.sleep_quality || "");
        setWeatherCondition(existing.weather_condition || "");
        setTemperatureC(existing.temperature_c ?? "");
      } catch (e) {
        toast.error("Failed to load check-in", e?.message || "Unknown error");
      }
    })();
  }, [today, toast]);

  const save = async () => {
    try {
      await saveCheckin({
        date: today,
        mood,
        energy,
        had_urges: hadUrges,
        difficult,
        note,
        completed: true,
        sleep_hours: sleepHours === "" ? null : Number(sleepHours),
        sleep_quality: sleepQuality,
        weather_condition: weatherCondition,
        temperature_c: temperatureC === "" ? null : Number(temperatureC),
      });
      toast.success("Check-in saved", "Your daily reflection has been recorded.");
    } catch (e) {
      toast.error("Failed to save check-in", e?.message || "Unknown error");
    }
  };

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Daily check-in"
        title="Reflect on today"
        description="Track mood, energy, optional context, and what made the day easier or harder."
      />

      <div className="grid gap-4 md:grid-cols-3">
        <StatCard label="Today’s logs" value={todayHabits.length} sub="Habit entries" icon={FiList} />
        <StatCard label="Completed" value={completedToday} sub="≥ 80% progress" icon={FiCheckCircle} tone="green" />
        <StatCard label="Date" value={today} sub="Today" icon={FiCalendar} tone="slate" />
      </div>

      <Card>
        <div className="text-lg font-semibold text-slate-950">Today’s habits</div>
        <div className="mt-2 text-sm text-slate-600">
          A quick look at what you logged today.
        </div>

        {todayHabits.length === 0 ? (
          <EmptyState title="No habits logged today yet" description="Quick-log from the dashboard to populate this section." />
        ) : (
          <div className="mt-6 grid gap-3 md:grid-cols-2">
            {todayHabits.map((h) => (
              <div
                key={h.id || `${h.name}-${h.date}`}
                className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
              >
                <div className="text-sm font-semibold text-slate-950">{h.name}</div>
                <div className="mt-2 text-xs text-slate-500">{h.date}</div>
                <ProgressBar value={h.progress} label="Progress" className="mt-4" />
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card>
        <div className="text-lg font-semibold text-slate-950">Reflection</div>
        <div className="mt-2 text-sm text-slate-600">
          This stores real check-in context for future analysis. Sleep/weather are optional.
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
              className="w-full rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-[#3337a6] focus:ring-4 focus:ring-[#3337a6]/10"
              placeholder="e.g. staying focused at night"
              value={difficult}
              onChange={(e) => setDifficult(e.target.value)}
            />
          </QuestionBlock>

          <QuestionBlock title="Sleep hours (optional)">
            <input
              className="w-full rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-[#3337a6] focus:ring-4 focus:ring-[#3337a6]/10"
              type="number"
              min="0"
              max="24"
              step="0.25"
              placeholder="e.g. 7.5"
              value={sleepHours}
              onChange={(e) => setSleepHours(e.target.value)}
            />
          </QuestionBlock>

          <QuestionBlock title="Sleep quality (optional)">
            <input
              className="w-full rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-[#3337a6] focus:ring-4 focus:ring-[#3337a6]/10"
              placeholder="e.g. Good"
              value={sleepQuality}
              onChange={(e) => setSleepQuality(e.target.value)}
            />
          </QuestionBlock>

          <QuestionBlock title="Weather condition (optional)">
            <input
              className="w-full rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-[#3337a6] focus:ring-4 focus:ring-[#3337a6]/10"
              placeholder="e.g. Sunny"
              value={weatherCondition}
              onChange={(e) => setWeatherCondition(e.target.value)}
            />
          </QuestionBlock>

          <QuestionBlock title="Temperature C (optional)">
            <input
              className="w-full rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-[#3337a6] focus:ring-4 focus:ring-[#3337a6]/10"
              type="number"
              step="0.1"
              placeholder="e.g. 22"
              value={temperatureC}
              onChange={(e) => setTemperatureC(e.target.value)}
            />
          </QuestionBlock>
        </div>

        <div className="mt-6">
          <QuestionBlock title="Any short note about today?">
            <textarea
              className="min-h-[120px] w-full rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-[#3337a6] focus:ring-4 focus:ring-[#3337a6]/10"
              placeholder="What went well? What should improve tomorrow?"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </QuestionBlock>
        </div>

        <Button onClick={save} className="mt-6 w-full" size="lg">
          Save Daily Check-in
        </Button>
      </Card>
    </div>
  );
}

function QuestionBlock({ title, children }) {
  return (
    <div>
      <div className="mb-3 text-sm font-semibold text-slate-700">{title}</div>
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
        "rounded-lg px-4 py-2 text-sm font-semibold ring-1 transition focus:outline-none focus:ring-4 focus:ring-[#3337a6]/10",
        active
          ? "bg-[#3337a6] text-white ring-[#3337a6]"
          : "bg-white text-slate-700 ring-slate-200 hover:bg-slate-50",
      ].join(" ")}
    >
      {children}
    </button>
  );
}
