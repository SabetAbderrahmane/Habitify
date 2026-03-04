import { useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../lib/api";
import { FiMail, FiLock, FiArrowRight, FiZap } from "react-icons/fi";


function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

function useTilt() {
  const ref = useRef(null);
  const [style, setStyle] = useState({});

  const onMove = (e) => {
    const el = ref.current;
    if (!el) return;

    const r = el.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width; // 0..1
    const py = (e.clientY - r.top) / r.height; // 0..1

    const rx = clamp((0.5 - py) * 14, -10, 10);
    const ry = clamp((px - 0.5) * 18, -12, 12);

    setStyle({
      transform: `perspective(1100px) rotateX(${rx}deg) rotateY(${ry}deg) translateZ(0)`,
    });
  };

  const onLeave = () => setStyle({ transform: "perspective(1100px) rotateX(0deg) rotateY(0deg)" });

  return { ref, style, onMove, onLeave };
}

export default function Auth({ onAuthed }) {
  const navigate = useNavigate();
  const [mode, setMode] = useState("login"); // "login" | "signup"
  const isSignup = mode === "signup";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);

  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const headline = useMemo(
    () => (isSignup ? "Create your account" : "Welcome back"),
    [isSignup]
  );

  const subtitle = useMemo(
    () => (isSignup ? "Start building habits with AI support." : "Pick up your streak where you left off."),
    [isSignup]
  );

  const tilt = useTilt();

  const submit = async (e) => {
    e.preventDefault();
    setErr("");
    setBusy(true);

    try {
      if (isSignup) {
        // Signup then auto-login
        await api.post("/signup", { email, password });
      }

      const res = await api.post("/login", { email, password });
      const token = res?.data?.access_token;

      if (!token) throw new Error("No token returned");

      localStorage.setItem("access_token", token);
      onAuthed?.(token);
      navigate("/app", { replace: true });
    } catch (error) {
      const msg =
        error?.response?.data?.detail ||
        error?.message ||
        "Something went wrong. Try again.";
      setErr(msg);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#05060a] text-white">
      {/* animated gradient backdrop */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-40 left-1/2 h-[520px] w-[520px] -translate-x-1/2 rounded-full bg-gradient-to-tr from-fuchsia-500/35 via-cyan-400/25 to-indigo-500/30 blur-3xl animate-[pulse_6s_ease-in-out_infinite]" />
        <div className="absolute -bottom-40 right-[-120px] h-[520px] w-[520px] rounded-full bg-gradient-to-tr from-emerald-400/20 via-sky-500/20 to-purple-500/25 blur-3xl animate-[pulse_7s_ease-in-out_infinite]" />
        <div className="absolute inset-0 opacity-[0.18] [background-image:radial-gradient(#ffffff_1px,transparent_1px)] [background-size:22px_22px]" />
      </div>

      {/* top brand bar */}
      <div className="relative mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-white/10 ring-1 ring-white/15 backdrop-blur">
            <FiZap className="text-cyan-200" />
          </div>
          <div>
            <div className="text-sm tracking-widest text-white/60">HABITIFY</div>
            <div className="text-xs text-white/40">AI Habit Tracker</div>
          </div>
        </div>

        <div className="hidden items-center gap-2 md:flex">
          <span className="text-xs text-white/50">No credit card. Local-first.</span>
          <span className="rounded-full bg-white/10 px-3 py-1 text-xs text-white/70 ring-1 ring-white/15">
            Beta
          </span>
        </div>
      </div>

      {/* center */}
      <div className="relative mx-auto grid max-w-6xl grid-cols-1 gap-10 px-6 pb-16 pt-4 md:grid-cols-2 md:items-center">
        {/* left marketing */}
        <div className="space-y-6">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-xs text-white/75 ring-1 ring-white/15 backdrop-blur">
            <FiZap className="text-cyan-200" />
            Predict lapses. Keep streaks. Win days.
          </div>

          <h1 className="text-4xl font-semibold leading-tight md:text-5xl">
            Build habits with
            <span className="bg-gradient-to-r from-cyan-300 via-fuchsia-300 to-indigo-300 bg-clip-text text-transparent">
              {" "}
              AI that actually helps
            </span>
            .
          </h1>

          <p className="max-w-xl text-base leading-relaxed text-white/65">
            Habitify turns your daily check-ins into insights: streak momentum, risk-of-lapse predictions,
            and personalized nudges that feel human—not spam.
          </p>

          <div className="grid max-w-xl grid-cols-1 gap-3 sm:grid-cols-3">
            {[
              { k: "Streak Engine", v: "visual + addictive" },
              { k: "Lapse Predictor", v: "lightweight ML" },
              { k: "Private by default", v: "your data stays yours" },
            ].map((x) => (
              <div
                key={x.k}
                className="rounded-2xl bg-white/5 p-4 ring-1 ring-white/10 backdrop-blur"
              >
                <div className="text-sm font-medium">{x.k}</div>
                <div className="mt-1 text-xs text-white/55">{x.v}</div>
              </div>
            ))}
          </div>
        </div>

        {/* right auth card */}
        <div className="md:justify-self-end">
          <div
            ref={tilt.ref}
            onMouseMove={tilt.onMove}
            onMouseLeave={tilt.onLeave}
            style={tilt.style}
            className="group relative w-full max-w-md rounded-3xl bg-white/10 p-1 ring-1 ring-white/15 backdrop-blur-xl transition-transform duration-200"
          >
            {/* glow */}
            <div className="pointer-events-none absolute inset-0 -z-10 rounded-3xl bg-gradient-to-tr from-cyan-400/15 via-fuchsia-400/10 to-indigo-400/15 blur-xl opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

            <div className="rounded-[22px] bg-[#0b0d14]/70 p-8">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-2xl font-semibold">{headline}</div>
                  <div className="mt-1 text-sm text-white/55">{subtitle}</div>
                </div>

                <div className="flex rounded-full bg-white/5 p-1 ring-1 ring-white/10">
                  <button
                    onClick={() => setMode("login")}
                    className={`rounded-full px-3 py-1 text-xs transition ${
                      !isSignup ? "bg-white/15 text-white" : "text-white/60 hover:text-white"
                    }`}
                    type="button"
                  >
                    Login
                  </button>
                  <button
                    onClick={() => setMode("signup")}
                    className={`rounded-full px-3 py-1 text-xs transition ${
                      isSignup ? "bg-white/15 text-white" : "text-white/60 hover:text-white"
                    }`}
                    type="button"
                  >
                    Sign up
                  </button>
                </div>
              </div>

              <form onSubmit={submit} className="mt-8 space-y-4">
                <div className="space-y-2">
                  <label className="text-xs text-white/60">Email</label>
                  <div className="flex items-center gap-2 rounded-2xl bg-white/5 px-4 py-3 ring-1 ring-white/10 focus-within:ring-cyan-300/40">
                    <FiMail className="text-white/55" />
                    <input
                      className="w-full bg-transparent text-sm outline-none placeholder:text-white/25"
                      placeholder="you@domain.com"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs text-white/60">Password</label>

                  <div className="flex items-center gap-2 rounded-2xl bg-white/5 px-4 py-3 ring-1 ring-white/10 focus-within:ring-fuchsia-300/35">
                    <FiLock className="text-white/55" />

                    <input
                      className="w-full bg-transparent text-sm outline-none placeholder:text-white/25"
                      placeholder="••••••••"
                      type={showPw ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      minLength={6}
                    />

                    <button
                      type="button"
                      onClick={() => setShowPw((v) => !v)}
                      className="rounded-xl bg-white/5 px-3 py-1 text-xs text-white/70 ring-1 ring-white/10 hover:bg-white/10"
                    >
                      {showPw ? "Hide" : "Show"}
                    </button>
                  </div>

                  <div className="text-[11px] text-white/35">
                    Minimum 6 characters.
                  </div>
                </div>


                {err ? (
                  <div className="rounded-2xl bg-red-500/10 p-3 text-sm text-red-200 ring-1 ring-red-300/20">
                    {err}
                  </div>
                ) : null}

                <button
                  disabled={busy}
                  className="group relative mt-2 w-full overflow-hidden rounded-2xl bg-gradient-to-r from-cyan-400 via-fuchsia-400 to-indigo-400 px-4 py-3 text-sm font-semibold text-black transition active:scale-[0.99] disabled:opacity-70"
                  type="submit"
                >
                  {/* shimmer */}
                  <span className={`absolute inset-0 ${busy ? "opacity-100" : "opacity-0"} transition-opacity`}>
                    <span className="absolute inset-0 -translate-x-full animate-[shimmer_1.1s_infinite] bg-[linear-gradient(110deg,transparent,rgba(255,255,255,0.6),transparent)]" />
                  </span>

                  <span className="relative z-10 inline-flex items-center justify-center gap-2">
                    {busy ? "Authenticating..." : isSignup ? "Create account" : "Enter Habitify"}
                    <FiArrowRight />
                  </span>

                  <span className="absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100 [background:radial-gradient(circle_at_30%_30%,rgba(255,255,255,0.55),transparent_55%)]" />
                </button>

                <div className="pt-2 text-center text-xs text-white/45">
                  By continuing you agree to our <span className="text-white/70">Terms</span> &{" "}
                  <span className="text-white/70">Privacy</span>.
                </div>
              </form>
            </div>
          </div>

          <div className="mt-4 text-center text-xs text-white/40">
            Tip: Use <span className="text-white/70">a strong password</span> — we’ll add reset + OAuth later.
          </div>
        </div>
      </div>
    </div>
  );
}
