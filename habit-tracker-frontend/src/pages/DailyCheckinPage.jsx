import { useEffect, useMemo, useState } from "react";
import { FiCheckCircle } from "react-icons/fi";
import GlobalSearchButton from "../components/GlobalSearchButton";
import NotificationsButton from "../components/NotificationsButton";
import { useHabits } from "../context/HabitsContext";
import { useToast } from "../components/ToastProvider";
import { fetchCheckin, saveCheckin } from "../lib/checkins";
import Button from "../components/ui/Button";
import Card from "../components/ui/Card";
import EmptyState from "../components/ui/EmptyState";
import ProgressBar from "../components/ui/ProgressBar";

function getTodayKey() {
  return new Date().toISOString().slice(0, 10);
}

const moodOptions = ["Happy", "Good", "Neutral", "Low", "Sad"];
const energyOptions = ["High", "Good", "Moderate", "Low", "Drained"];

export default function DailyCheckinPage() {
  const { habitDefinitions, habitLogs } = useHabits();
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
    const logMap = new Map();
    (habitLogs || [])
      .filter((log) => log.date === today)
      .forEach((log) => {
        const key = log.habit_id || log.name;
        const current = logMap.get(key);
        if (!current || Number(log.progress || 0) >= Number(current.progress || 0)) {
          logMap.set(key, log);
        }
        if (log.name) logMap.set(log.name, log);
      });

    return (habitDefinitions || []).map((habit) => {
      const log = logMap.get(habit.id) || logMap.get(habit.name);
      return {
        ...habit,
        date: log?.date || today,
        progress: Number(log?.progress || 0),
      };
    });
  }, [habitDefinitions, habitLogs, today]);

  const completedToday = useMemo(() => {
    return todayHabits.filter((h) => Number(h.progress || 0) >= 80).length;
  }, [todayHabits]);
  const remainingToday = Math.max(0, todayHabits.length - completedToday);
  const completionPct = todayHabits.length ? Math.round((completedToday / todayHabits.length) * 100) : 0;

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
    <div>
      <div className="mb-14 flex items-center justify-end gap-6 border-b border-[#e0e3e5] pb-5">
        <GlobalSearchButton />
        <NotificationsButton />
        <div className="grid h-11 w-11 place-items-center rounded-full bg-[#195864] font-bold text-white">A</div>
      </div>

      <section className="mx-auto max-w-[960px] text-center">
        <div className="mx-auto grid h-[188px] w-[188px] place-items-center rounded-full bg-[conic-gradient(#3337a6_var(--progress),#e0e3e5_0)] p-3" style={{ "--progress": `${completionPct}%` }}>
          <div className="grid h-full w-full place-items-center rounded-full bg-[#f7fafc]">
            <div>
              <div className="text-3xl font-bold text-[#3337a6]">{completionPct}%</div>
              <div className="mt-1 text-sm font-semibold tracking-[0.08em] text-[#464653]">Today</div>
            </div>
          </div>
        </div>
        <h1 className="mt-9 text-4xl font-semibold tracking-[-0.02em] text-[#181c1e] md:text-5xl">
          {completedToday} down, {remainingToday} to go.
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-xl leading-8 text-[#464653]">
          Check in with your day, then keep the next action small.
        </p>
      </section>

      <section className="mx-auto mt-12 max-w-[960px]">
        <div className="mb-7 text-sm font-bold tracking-[0.12em] text-[#767684]">Today&apos;s Focus</div>

        {todayHabits.length === 0 ? (
          <EmptyState title="No habits logged today yet" description="Quick-log from the dashboard to populate this section." />
        ) : (
          <div className="space-y-5">
            {todayHabits.map((h) => (
              <div
                key={h.id || `${h.name}-${h.date}`}
                className={[
                  "flex min-h-[112px] items-center gap-6 rounded-3xl px-8 py-5 shadow-[0_8px_24px_rgba(24,28,30,0.04)]",
                  Number(h.progress || 0) >= 80 ? "border border-[#c6ecc6] bg-[#c6ecc6]" : "border border-[#e0e3e5] bg-white",
                ].join(" ")}
              >
                <div className="grid h-[58px] w-[58px] place-items-center rounded-full bg-[#e5e9eb] text-xl font-bold text-[#39485c]">
                  {(h.name || "H").slice(0, 1).toUpperCase()}
                </div>
                <div className="flex-1 text-left">
                  <div className="text-2xl font-semibold text-[#181c1e]">{h.name}</div>
                  <ProgressBar value={h.progress} className="mt-4 max-w-md" />
                </div>
                {Number(h.progress || 0) >= 80 ? (
                  <FiCheckCircle className="h-8 w-8 text-[#2d4e32]" />
                ) : (
                  <div className="text-lg font-bold text-[#3337a6]">{h.progress}%</div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      <Card className="mx-auto mt-10 max-w-[960px] p-8">
        <div className="text-3xl font-semibold tracking-[-0.01em] text-[#181c1e]">Reflection</div>
        <div className="mt-2 text-lg text-[#464653]">
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
      <div className="mb-3 text-sm font-bold tracking-[0.08em] text-[#181c1e]">{title}</div>
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
