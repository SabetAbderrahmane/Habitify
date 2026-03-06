import { useEffect, useMemo, useState } from "react";

export default function UrgeActionModal({
  open,
  onClose,
  habitLabel,
  trigger,
  dangerTime,
  replacement,
  onSuccess,
}) {
  const [phase, setPhase] = useState("breathe"); // breathe | delay | reflect
  const [secondsLeft, setSecondsLeft] = useState(30);
  const [delayLeft, setDelayLeft] = useState(120);

  useEffect(() => {
    if (!open) return;

    setPhase("breathe");
    setSecondsLeft(30);
    setDelayLeft(120);
  }, [open]);

  useEffect(() => {
    if (!open) return;

    if (phase === "breathe" && secondsLeft > 0) {
      const timer = setTimeout(() => setSecondsLeft((s) => s - 1), 1000);
      return () => clearTimeout(timer);
    }

    if (phase === "breathe" && secondsLeft === 0) {
      setPhase("delay");
    }
  }, [phase, secondsLeft, open]);

  useEffect(() => {
    if (!open) return;

    if (phase === "delay" && delayLeft > 0) {
      const timer = setTimeout(() => setDelayLeft((s) => s - 1), 1000);
      return () => clearTimeout(timer);
    }

    if (phase === "delay" && delayLeft === 0) {
      setPhase("reflect");
    }
  }, [phase, delayLeft, open]);

  const breathingText = useMemo(() => {
    const cycle = secondsLeft % 8;
    if (cycle >= 5) return "Exhale slowly";
    if (cycle >= 3) return "Hold";
    return "Inhale gently";
  }, [secondsLeft]);

  if (!open) return null;

  const minutes = String(Math.floor(delayLeft / 60)).padStart(2, "0");
  const seconds = String(delayLeft % 60).padStart(2, "0");

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4">
      <div className="w-full max-w-xl rounded-3xl bg-[#0b0d14]/90 p-1 ring-1 ring-white/15 backdrop-blur-xl">
        <div className="rounded-[22px] bg-white/5 p-6 ring-1 ring-white/10">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-2xl font-semibold">Urge Action Mode</h2>
              <p className="mt-1 text-sm text-white/55">
                A quick reset to help you avoid the automatic habit loop.
              </p>
            </div>

            <button
              onClick={onClose}
              className="rounded-xl bg-white/10 px-3 py-1 text-sm ring-1 ring-white/15 hover:bg-white/15"
              type="button"
            >
              Close
            </button>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-3">
            <InfoBox title="Habit" value={habitLabel} />
            <InfoBox title="Trigger" value={trigger} />
            <InfoBox title="Risk time" value={dangerTime} />
          </div>

          {/* Phase 1: Breathe */}
          {phase === "breathe" && (
            <div className="mt-6 rounded-3xl bg-black/30 p-6 text-center ring-1 ring-white/10">
              <div className="text-sm text-white/50">Step 1</div>
              <div className="mt-2 text-2xl font-semibold">Pause and breathe</div>

              <div className="mt-6 flex items-center justify-center">
                <div className="grid h-40 w-40 place-items-center rounded-full bg-gradient-to-r from-cyan-400/50 via-fuchsia-400/50 to-indigo-400/50 text-center ring-1 ring-white/15 animate-pulse">
                  <div>
                    <div className="text-sm text-black font-semibold">{breathingText}</div>
                    <div className="mt-1 text-3xl font-bold text-black">{secondsLeft}s</div>
                  </div>
                </div>
              </div>

              <div className="mt-6 text-sm text-white/65">
                You do not need to obey the urge immediately.
              </div>
            </div>
          )}

          {/* Phase 2: Delay */}
          {phase === "delay" && (
            <div className="mt-6 rounded-3xl bg-black/30 p-6 text-center ring-1 ring-white/10">
              <div className="text-sm text-white/50">Step 2</div>
              <div className="mt-2 text-2xl font-semibold">Delay the urge</div>

              <div className="mt-6 text-5xl font-bold">
                {minutes}:{seconds}
              </div>

              <div className="mt-4 text-sm text-white/65">
                While waiting, do this instead:
              </div>

              <div className="mt-4 rounded-2xl bg-white/10 px-4 py-3 text-lg font-semibold ring-1 ring-white/15">
                {replacement}
              </div>

              <div className="mt-4 text-sm text-white/45">
                The goal is not perfection. The goal is interruption.
              </div>
            </div>
          )}

          {/* Phase 3: Reflect */}
          {phase === "reflect" && (
            <div className="mt-6 rounded-3xl bg-black/30 p-6 text-center ring-1 ring-white/10">
              <div className="text-sm text-white/50">Step 3</div>
              <div className="mt-2 text-2xl font-semibold">How are you now?</div>

              <div className="mt-4 text-sm text-white/65">
                You just interrupted the automatic urge loop. That matters.
              </div>

              <div className="mt-6 grid gap-3 md:grid-cols-2">
                <button
                  onClick={() => {
                    onSuccess?.();
                    onClose?.();
                  }}
                  className="rounded-2xl bg-gradient-to-r from-cyan-400 via-fuchsia-400 to-indigo-400 px-4 py-3 text-sm font-semibold text-black"
                  type="button"
                >
                  I made it through
                </button>

                <button
                  onClick={() => {
                    setPhase("delay");
                    setDelayLeft(60);
                  }}
                  className="rounded-2xl bg-white/10 px-4 py-3 text-sm ring-1 ring-white/15 hover:bg-white/15"
                  type="button"
                >
                  Still struggling — give me 1 more minute
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function InfoBox({ title, value }) {
  return (
    <div className="rounded-2xl bg-white/5 p-4 ring-1 ring-white/10">
      <div className="text-xs text-white/50">{title}</div>
      <div className="mt-2 text-sm font-semibold">{value}</div>
    </div>
  );
}
