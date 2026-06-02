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
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/30 p-4">
      <div className="w-full max-w-xl rounded-[24px] border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-[0_24px_70px_rgba(15,23,42,0.18)]">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-2xl font-semibold text-[var(--color-text-primary)]">Urge Action Mode</h2>
            <p className="mt-1 text-sm leading-6 text-[var(--color-text-secondary)]">
              A quick reset to help you avoid the automatic habit loop.
            </p>
          </div>

          <button
            onClick={onClose}
            className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-soft)] px-3 py-1 text-sm font-semibold text-[var(--color-text-secondary)] hover:bg-white"
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

        {phase === "breathe" && (
          <div className="mt-6 rounded-[24px] border border-indigo-100 bg-indigo-50/50 p-6 text-center">
            <div className="text-sm font-semibold text-[var(--color-text-muted)]">Step 1</div>
            <div className="mt-2 text-2xl font-semibold text-[var(--color-text-primary)]">Pause and breathe</div>

            <div className="mt-6 flex items-center justify-center">
              <div className="grid h-40 w-40 place-items-center rounded-full bg-[var(--color-surface)] text-center shadow-[inset_0_0_0_14px_#dde2ff,0_18px_44px_rgba(51,55,166,0.12)]">
                <div>
                  <div className="text-sm font-semibold text-[var(--color-accent)]">{breathingText}</div>
                  <div className="mt-1 text-3xl font-bold text-[var(--color-text-primary)]">{secondsLeft}s</div>
                </div>
              </div>
            </div>

            <div className="mt-6 text-sm text-[var(--color-text-secondary)]">
              You do not need to obey the urge immediately.
            </div>
          </div>
        )}

        {phase === "delay" && (
          <div className="mt-6 rounded-[24px] border border-[var(--color-border)] bg-[var(--color-surface-soft)] p-6 text-center">
            <div className="text-sm font-semibold text-[var(--color-text-muted)]">Step 2</div>
            <div className="mt-2 text-2xl font-semibold text-[var(--color-text-primary)]">Delay the urge</div>

            <div className="mt-6 text-5xl font-bold text-[var(--color-text-primary)]">
              {minutes}:{seconds}
            </div>

            <div className="mt-4 text-sm text-[var(--color-text-secondary)]">
              While waiting, do this instead:
            </div>

            <div className="mt-4 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 text-lg font-semibold text-[var(--color-text-primary)]">
              {replacement}
            </div>

            <div className="mt-4 text-sm text-[var(--color-text-muted)]">
              The goal is interruption, then a better next action.
            </div>
          </div>
        )}

        {phase === "reflect" && (
          <div className="mt-6 rounded-[24px] border border-emerald-100 bg-emerald-50/70 p-6 text-center">
            <div className="text-sm font-semibold text-[var(--color-text-muted)]">Step 3</div>
            <div className="mt-2 text-2xl font-semibold text-[var(--color-text-primary)]">How are you now?</div>

            <div className="mt-4 text-sm text-[var(--color-text-secondary)]">
              You just interrupted the automatic urge loop. That matters.
            </div>

            <div className="mt-6 grid gap-3 md:grid-cols-2">
              <button
                onClick={() => {
                  onSuccess?.();
                  onClose?.();
                }}
                className="rounded-2xl bg-[var(--color-accent)] px-4 py-3 text-sm font-semibold text-white shadow-[0_12px_28px_rgba(51,55,166,0.18)]"
                type="button"
              >
                I made it through
              </button>

              <button
                onClick={() => {
                  setPhase("delay");
                  setDelayLeft(60);
                }}
                className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 text-sm font-semibold text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-soft)]"
                type="button"
              >
                Still struggling - give me 1 more minute
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function InfoBox({ title, value }) {
  return (
    <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-soft)] p-4">
      <div className="text-xs font-semibold text-[var(--color-text-muted)]">{title}</div>
      <div className="mt-2 text-sm font-semibold text-[var(--color-text-primary)]">{value}</div>
    </div>
  );
}
