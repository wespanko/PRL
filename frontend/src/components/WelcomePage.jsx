import { useState } from "react";
import {
  Calculator, Sparkles, Layers, LineChart,
  Lock, Hash, Eye,
  ShieldCheck, Scale, Rocket,
  Sprout, BookOpen, Crosshair,
  ArrowRight, CheckCircle2,
} from "lucide-react";
import { saveProfile } from "../utils/profile";

const FEATURES = [
  { icon: Calculator, title: "Real risk math",         body: "Sharpe, beta, drawdown, VaR, downside capture — computed in Python (pandas/NumPy) on real price history. No LLM guessing." },
  { icon: Sparkles,   title: "Optimized rebalancing",  body: "Constrained grid-search optimizer finds the trade that mathematically improves your Panko Score subject to a Sharpe-preserving floor." },
  { icon: Layers,     title: "Real diversification",   body: "Correlation-adjusted ENP — measures independent bets, not just ticker count. Most retail tools miss this." },
  { icon: LineChart,  title: "Portfolio over time",    body: "Snapshot your portfolio, watch drift in volatility, beta, and concentration over weeks and months." },
];

const TRUST_BADGES = [
  { icon: Lock,       label: "100% local",         body: "Your data never leaves your browser" },
  { icon: Hash,       label: "Deterministic math", body: "Pure Python, not chatbot output" },
  { icon: Eye,        label: "Transparent",        body: "Every formula is documented in Learn" },
];

const RISK_LEVELS = [
  { id: "conservative", label: "Conservative", icon: ShieldCheck, body: "Capital preservation first. Cap drawdowns. Lower returns OK." },
  { id: "balanced",     label: "Balanced",     icon: Scale,       body: "Growth and risk control in equal measure. Bond-equity mix." },
  { id: "aggressive",   label: "Aggressive",   icon: Rocket,      body: "Growth-tilted. Higher volatility tolerance for higher upside." },
];

const EXPERIENCE_LEVELS = [
  { id: "beginner",  icon: Sprout,    label: "I'm new to investing",      body: "I'll get a guided tour, plain-English explanations, and help building a starter portfolio." },
  { id: "some",      icon: BookOpen,  label: "I know the basics",         body: "I understand stocks vs bonds and have invested before. I want help making smarter decisions." },
  { id: "confident", icon: Crosshair, label: "I know what I'm doing",     body: "Skip the tour. Drop me into the full app — Sharpe, drawdown, beta, the works." },
];

const STEPS = [
  { id: "name",       label: "Profile"     },
  { id: "risk",       label: "Risk style"  },
  { id: "experience", label: "Experience"  },
];

// ── small helpers ────────────────────────────────────────────────────
function StepBar({ current }) {
  const idx = STEPS.findIndex((s) => s.id === current);
  return (
    <div className="flex items-center gap-2 mb-8">
      {STEPS.map((s, i) => {
        const done   = i < idx;
        const active = i === idx;
        return (
          <div key={s.id} className="flex-1 flex items-center gap-2">
            <div className={`h-1.5 rounded-full flex-1 transition-colors duration-500
              ${active ? "bg-emerald-500" : done ? "bg-emerald-300" : "bg-slate-200"}`} />
            <span className={`text-xs font-semibold whitespace-nowrap
              ${active ? "text-emerald-700" : done ? "text-emerald-600" : "text-slate-400"}`}>
              {s.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function ChoiceCard({ active, icon: Icon, label, body, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full text-left rounded-3xl p-5 transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)]
        ${active
          ? "bg-emerald-50 border-2 border-emerald-500 shadow-sm shadow-emerald-100"
          : "bg-white border border-slate-200 hover:border-slate-300"}`}
    >
      <div className="flex items-start gap-4">
        <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl
          ${active ? "bg-emerald-500 text-white" : "bg-slate-100 text-slate-600"}`}>
          <Icon className="h-6 w-6" strokeWidth={2.25} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-bold text-slate-900">{label}</h3>
            {active && <CheckCircle2 className="h-4 w-4 text-emerald-500" strokeWidth={2.5} />}
          </div>
          <p className="text-sm text-slate-500 mt-1 leading-relaxed">{body}</p>
        </div>
      </div>
    </button>
  );
}

// ── main ─────────────────────────────────────────────────────────────
export default function WelcomePage({ onSignIn }) {
  const [step, setStep] = useState("hero");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [riskTolerance, setRiskTolerance] = useState("balanced");
  const [experience, setExperience] = useState("some");
  const [acknowledged, setAcknowledged] = useState(false);
  const [error, setError] = useState(null);

  function handleNameStep(e) {
    e.preventDefault();
    if (!name.trim()) { setError("Please enter your name."); return; }
    if (email && !/^\S+@\S+\.\S+$/.test(email)) { setError("That doesn't look like a valid email."); return; }
    setError(null);
    setStep("risk");
  }

  function handleFinish() {
    if (!acknowledged) {
      setError("Please confirm you understand this is educational only, not financial advice.");
      return;
    }
    setError(null);
    const profile = saveProfile({ name, email, riskTolerance, experience });
    onSignIn(profile);
  }

  return (
    <div className="min-h-screen bg-white text-slate-900 font-sans antialiased px-6 py-10 md:px-10 md:py-16">
      <div className="max-w-2xl mx-auto">

        {/* ── HERO ─────────────────────────────────────────────── */}
        {step === "hero" && (
          <>
            <div className="flex justify-center mb-10">
              <img src="/logo.png" alt="Panko" className="h-10 w-auto" />
            </div>

            <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-center text-slate-900 mb-5 leading-tight">
              Your portfolio,<br/>
              <span className="text-emerald-500">analyzed like a quant.</span>
            </h1>
            <p className="text-center text-slate-600 text-lg mb-10 max-w-xl mx-auto leading-relaxed">
              <strong className="text-slate-900">Real risk math.</strong> Optimized rebalancing.
              The diversification metric your brokerage <em>doesn't show you</em>.
            </p>

            <button
              onClick={() => setStep("name")}
              className="w-full mb-10 bg-emerald-500 hover:bg-emerald-600 text-white rounded-2xl font-bold text-lg py-5 flex items-center justify-center gap-2 transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] active:scale-[0.98] shadow-md shadow-emerald-200"
            >
              Get started — it's free
              <ArrowRight className="h-5 w-5" strokeWidth={2.5} />
            </button>

            {/* Trust row */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-12">
              {TRUST_BADGES.map((b) => {
                const Icon = b.icon;
                return (
                  <div key={b.label} className="bg-slate-50 border border-slate-200 rounded-2xl p-4">
                    <div className="flex items-center gap-2 mb-1">
                      <Icon className="h-4 w-4 text-emerald-600" strokeWidth={2.5} />
                      <div className="font-bold text-sm text-slate-900">{b.label}</div>
                    </div>
                    <div className="text-xs text-slate-500 leading-relaxed">{b.body}</div>
                  </div>
                );
              })}
            </div>

            {/* Feature grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-10">
              {FEATURES.map((f) => {
                const Icon = f.icon;
                return (
                  <div key={f.title} className="rounded-3xl border border-slate-200 p-5">
                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-600 mb-3">
                      <Icon className="h-5 w-5" strokeWidth={2.25} />
                    </div>
                    <div className="font-bold text-slate-900 mb-1">{f.title}</div>
                    <div className="text-sm text-slate-500 leading-relaxed">{f.body}</div>
                  </div>
                );
              })}
            </div>

            <div className="text-xs text-slate-500 leading-relaxed text-center max-w-lg mx-auto">
              <strong className="text-slate-700">Educational tool · Not financial advice.</strong> Panko computes
              real risk metrics from historical data — but historical performance does not
              guarantee future results. Consult a licensed advisor before acting on any
              portfolio decision. We don't store your data on any server.
            </div>
          </>
        )}

        {/* ── NAME / EMAIL ─────────────────────────────────────── */}
        {step === "name" && (
          <>
            <StepBar current="name" />
            <div className="flex justify-center mb-6">
              <img src="/logo.png" alt="Panko" className="h-8 w-auto" />
            </div>
            <h2 className="text-3xl font-extrabold tracking-tight text-slate-900 mb-2">Let's set you up</h2>
            <p className="text-slate-500 mb-8">
              Just a name to personalize the app. Email is optional and stored only in your browser.
            </p>

            <form onSubmit={handleNameStep} className="space-y-5">
              <div>
                <label className="block text-sm font-bold text-slate-900 mb-2">Your name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => { setName(e.target.value); setError(null); }}
                  placeholder="Wes Panko"
                  autoFocus
                  maxLength={60}
                  className="w-full bg-white border border-slate-200 rounded-2xl px-5 py-4 text-base font-medium text-slate-900 placeholder:text-slate-400 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 transition-colors"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-900 mb-2">
                  Email <span className="text-slate-400 font-medium">(optional)</span>
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setError(null); }}
                  placeholder="you@example.com"
                  maxLength={120}
                  className="w-full bg-white border border-slate-200 rounded-2xl px-5 py-4 text-base font-medium text-slate-900 placeholder:text-slate-400 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 transition-colors"
                />
              </div>

              {error && (
                <div className="bg-rose-50 border border-rose-200 rounded-2xl px-4 py-3 text-sm font-medium text-rose-900">
                  {error}
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setStep("hero")}
                  className="px-6 py-3.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold transition-colors"
                >
                  Back
                </button>
                <button
                  type="submit"
                  className="flex-1 px-6 py-3.5 rounded-2xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold transition-colors active:scale-[0.99] flex items-center justify-center gap-2"
                >
                  Next
                  <ArrowRight className="h-4 w-4" strokeWidth={2.5} />
                </button>
              </div>
            </form>

            <div className="mt-8 text-xs text-slate-500 text-center">
              No password, no server, no tracking. This is a local app.
            </div>
          </>
        )}

        {/* ── RISK STYLE ───────────────────────────────────────── */}
        {step === "risk" && (
          <>
            <StepBar current="risk" />
            <div className="flex justify-center mb-6">
              <img src="/logo.png" alt="Panko" className="h-8 w-auto" />
            </div>
            <h2 className="text-3xl font-extrabold tracking-tight text-slate-900 mb-2">What's your risk style?</h2>
            <p className="text-slate-500 mb-8">
              We'll use this to tune Thesis suggestions and Improve recommendations. You can change it anytime.
            </p>

            <div className="space-y-3">
              {RISK_LEVELS.map((r) => (
                <ChoiceCard
                  key={r.id}
                  active={riskTolerance === r.id}
                  icon={r.icon}
                  label={r.label}
                  body={r.body}
                  onClick={() => setRiskTolerance(r.id)}
                />
              ))}
            </div>

            <div className="flex gap-3 mt-6">
              <button
                type="button"
                onClick={() => setStep("name")}
                className="px-6 py-3.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold transition-colors"
              >
                Back
              </button>
              <button
                type="button"
                onClick={() => setStep("experience")}
                className="flex-1 px-6 py-3.5 rounded-2xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold transition-colors active:scale-[0.99] flex items-center justify-center gap-2"
              >
                Next
                <ArrowRight className="h-4 w-4" strokeWidth={2.5} />
              </button>
            </div>

            <div className="mt-8 text-xs text-slate-500 text-center leading-relaxed">
              <strong className="text-slate-700">Reminder:</strong> Panko is educational. It is not your financial advisor. Risk style helps tune the engine — it does not constitute advice.
            </div>
          </>
        )}

        {/* ── EXPERIENCE ───────────────────────────────────────── */}
        {step === "experience" && (
          <>
            <StepBar current="experience" />
            <div className="flex justify-center mb-6">
              <img src="/logo.png" alt="Panko" className="h-8 w-auto" />
            </div>
            <h2 className="text-3xl font-extrabold tracking-tight text-slate-900 mb-2">How familiar are you with investing?</h2>
            <p className="text-slate-500 mb-8">
              Be honest — there's no wrong answer. We'll tailor what you see in the app.
            </p>

            <div className="space-y-3">
              {EXPERIENCE_LEVELS.map((e) => (
                <ChoiceCard
                  key={e.id}
                  active={experience === e.id}
                  icon={e.icon}
                  label={e.label}
                  body={e.body}
                  onClick={() => setExperience(e.id)}
                />
              ))}
            </div>

            <label className="mt-6 flex items-start gap-3 bg-slate-50 border border-slate-200 rounded-2xl p-4 cursor-pointer">
              <input
                type="checkbox"
                checked={acknowledged}
                onChange={(e) => { setAcknowledged(e.target.checked); setError(null); }}
                className="mt-0.5 h-5 w-5 accent-emerald-500 cursor-pointer"
              />
              <span className="text-sm text-slate-700 leading-relaxed">
                I understand Panko is for <strong className="text-slate-900">educational purposes only</strong>, is{" "}
                <strong className="text-slate-900">not financial advice</strong>, and that I am responsible for my own
                investment decisions. Past performance does not guarantee future results. Risk of loss is real.
              </span>
            </label>

            {error && (
              <div className="mt-3 bg-rose-50 border border-rose-200 rounded-2xl px-4 py-3 text-sm font-medium text-rose-900">
                {error}
              </div>
            )}

            <div className="flex gap-3 mt-6">
              <button
                type="button"
                onClick={() => setStep("risk")}
                className="px-6 py-3.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold transition-colors"
              >
                Back
              </button>
              <button
                type="button"
                onClick={handleFinish}
                className="flex-1 px-6 py-3.5 rounded-2xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold transition-colors active:scale-[0.99] flex items-center justify-center gap-2"
              >
                Enter Panko
                <ArrowRight className="h-4 w-4" strokeWidth={2.5} />
              </button>
            </div>

            <div className="mt-8 text-xs text-slate-500 text-center">
              You can change this anytime in your profile.
            </div>
          </>
        )}
      </div>
    </div>
  );
}
