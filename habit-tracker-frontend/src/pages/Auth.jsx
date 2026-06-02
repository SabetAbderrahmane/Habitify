import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  FiArrowRight,
  FiCheckCircle,
  FiEye,
  FiEyeOff,
  FiLock,
  FiMail,
  FiShield,
  FiZap,
} from "react-icons/fi";

import Badge from "../components/ui/Badge";
import Button from "../components/ui/Button";
import Card from "../components/ui/Card";
import { api } from "../lib/api";

const featureCards = [
  {
    title: "Lapse-risk signals",
    body: "Use your real habits and check-ins to surface risk context.",
  },
  {
    title: "Daily reflections",
    body: "Keep mood, energy, and notes connected to your habit history.",
  },
  {
    title: "Private sessions",
    body: "Sign in to keep your habit dashboard tied to your account.",
  },
];

export default function Auth({ onAuthed }) {
  const navigate = useNavigate();
  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const isSignup = mode === "signup";
  const hasExistingSession = Boolean(localStorage.getItem("access_token"));

  const copy = useMemo(
    () =>
      isSignup
        ? {
            eyebrow: "Create your workspace",
            title: "Start tracking with Habitify",
            subtitle:
              "Create an account to log habits, check in daily, and review your real trend history.",
            submit: "Create account",
          }
        : {
            eyebrow: "Welcome back",
            title: "Sign in to Habitify",
            subtitle:
              "Continue to your dashboard, log today, and review your latest habit patterns.",
            submit: "Sign in",
          },
    [isSignup]
  );

  const submit = async (event) => {
    event.preventDefault();
    setError("");
    setBusy(true);

    try {
      if (isSignup) {
        await api.post("/signup", { email, password });
      }

      const response = await api.post("/login", { email, password });
      const token = response?.data?.access_token;

      if (!token) {
        throw new Error("No token returned");
      }

      localStorage.setItem("access_token", token);
      onAuthed?.(token);
      navigate("/app", { replace: true });
    } catch (err) {
      const message =
        err?.response?.data?.detail ||
        err?.message ||
        "Something went wrong. Try again.";
      setError(message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#f7fafc] text-slate-950">
      <div className="mx-auto grid min-h-screen max-w-6xl grid-cols-1 gap-8 px-4 py-6 sm:px-6 lg:grid-cols-[1fr_460px] lg:items-center lg:px-8">
        <section className="flex flex-col justify-center py-10 lg:py-16">
          <div className="flex items-center gap-3">
            <div className="grid h-12 w-12 place-items-center rounded-2xl bg-[#3337a6] text-white shadow-[0_14px_36px_rgba(51,55,166,0.22)]">
              <FiZap aria-hidden="true" />
            </div>
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-500">
                Habitify
              </p>
              <p className="text-sm text-slate-500">AI habit tracker</p>
            </div>
          </div>

          <div className="mt-12 max-w-2xl">
            <Badge tone="indigo" className="mb-5">
              Calm habit intelligence
            </Badge>
            <h1 className="text-4xl font-semibold leading-tight text-slate-950 sm:text-5xl">
              Build consistent habits with a dashboard that stays honest.
            </h1>
            <p className="mt-5 max-w-xl text-base leading-7 text-slate-600">
              Habitify connects your logs, check-ins, streaks, and AI risk
              predictions without inventing metrics. Sign in or create an
              account to start from your real data.
            </p>
          </div>

          <div className="mt-8 grid max-w-2xl gap-3 sm:grid-cols-3">
            {featureCards.map((feature) => (
              <Card key={feature.title} className="rounded-xl p-4">
                <FiCheckCircle className="mb-3 text-[#3337a6]" aria-hidden="true" />
                <h2 className="text-sm font-semibold text-slate-900">{feature.title}</h2>
                <p className="mt-2 text-xs leading-5 text-slate-500">{feature.body}</p>
              </Card>
            ))}
          </div>
        </section>

        <Card className="self-center rounded-3xl p-6 sm:p-8">
          <div className="flex items-start justify-between gap-4">
            <div>
              <Badge tone="slate" className="mb-4">
                {copy.eyebrow}
              </Badge>
              <h2 className="text-2xl font-semibold text-slate-950">{copy.title}</h2>
              <p className="mt-2 text-sm leading-6 text-slate-500">{copy.subtitle}</p>
            </div>
            <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-indigo-50 text-[#3337a6]">
              <FiShield aria-hidden="true" />
            </div>
          </div>

          <div
            className="mt-7 grid grid-cols-2 rounded-xl bg-slate-100 p-1"
            role="tablist"
            aria-label="Authentication mode"
          >
            <button
              type="button"
              role="tab"
              aria-selected={!isSignup}
              onClick={() => setMode("login")}
              className={`rounded-lg px-3 py-2 text-sm font-semibold transition focus:outline-none focus:ring-4 focus:ring-[#3337a6]/20 ${
                !isSignup ? "bg-white text-slate-950 shadow-sm" : "text-slate-500 hover:text-slate-800"
              }`}
            >
              Login
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={isSignup}
              onClick={() => setMode("signup")}
              className={`rounded-lg px-3 py-2 text-sm font-semibold transition focus:outline-none focus:ring-4 focus:ring-[#3337a6]/20 ${
                isSignup ? "bg-white text-slate-950 shadow-sm" : "text-slate-500 hover:text-slate-800"
              }`}
            >
              Sign up
            </button>
          </div>

          <form onSubmit={submit} className="mt-7 space-y-5">
            <div>
              <label htmlFor="auth-email" className="text-sm font-semibold text-slate-700">
                Email
              </label>
              <div className="mt-2 flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 focus-within:border-[#3337a6] focus-within:ring-4 focus-within:ring-[#3337a6]/10">
                <FiMail className="text-slate-400" aria-hidden="true" />
                <input
                  id="auth-email"
                  className="w-full bg-transparent text-sm text-slate-950 outline-none placeholder:text-slate-400"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="you@example.com"
                  autoComplete="email"
                  required
                />
              </div>
            </div>

            <div>
              <label htmlFor="auth-password" className="text-sm font-semibold text-slate-700">
                Password
              </label>
              <div className="mt-2 flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 focus-within:border-[#3337a6] focus-within:ring-4 focus-within:ring-[#3337a6]/10">
                <FiLock className="text-slate-400" aria-hidden="true" />
                <input
                  id="auth-password"
                  className="w-full bg-transparent text-sm text-slate-950 outline-none placeholder:text-slate-400"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Minimum 6 characters"
                  autoComplete={isSignup ? "new-password" : "current-password"}
                  minLength={6}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((value) => !value)}
                  className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-800 focus:outline-none focus:ring-4 focus:ring-slate-200"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <FiEyeOff aria-hidden="true" /> : <FiEye aria-hidden="true" />}
                </button>
              </div>
            </div>

            {error ? (
              <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            ) : null}

            <Button type="submit" size="lg" className="w-full" disabled={busy}>
              {busy ? "Please wait..." : copy.submit}
              <FiArrowRight aria-hidden="true" />
            </Button>

            {hasExistingSession ? (
              <Button
                type="button"
                variant="secondary"
                size="lg"
                className="w-full"
                onClick={() => navigate("/app", { replace: true })}
              >
                Continue to app
              </Button>
            ) : null}
          </form>

          <p className="mt-6 text-center text-xs leading-5 text-slate-500">
            By continuing, you agree to use Habitify with your own account data.
          </p>
        </Card>
      </div>
    </main>
  );
}
