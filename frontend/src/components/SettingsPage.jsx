import { useState } from "react";
import {
  User, ShieldCheck, Scale, Rocket,
  Sprout, BookOpen, Crosshair,
  RotateCcw, Trash2, CheckCircle2, AlertTriangle,
} from "lucide-react";
import { updateProfile } from "../utils/profile";
import { clearAllLocalData } from "../utils/schemaVersion";

const RISK_LEVELS = [
  { id: "conservative", icon: ShieldCheck, label: "Conservative", body: "Capital preservation first" },
  { id: "balanced",     icon: Scale,       label: "Balanced",     body: "Growth with risk control" },
  { id: "aggressive",   icon: Rocket,      label: "Aggressive",   body: "Growth-tilted, higher tolerance" },
];

const EXPERIENCE_LEVELS = [
  { id: "beginner",  icon: Sprout,    label: "New to investing",       body: "Plain-English explanations + guided onboarding" },
  { id: "some",      icon: BookOpen,  label: "I know the basics",      body: "Standard app, with metric explainers" },
  { id: "confident", icon: Crosshair, label: "I know what I'm doing",  body: "Skip the tour, drop me into the full app" },
];

const INPUT = "w-full bg-slate-900/70 border border-slate-700/60 rounded-2xl px-4 py-3 text-sm font-medium text-slate-100 placeholder:text-slate-500 outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-400/30 transition-colors";

function Section({ icon: Icon, title, help, children }) {
  return (
    <section className="bg-slate-900/70 border border-slate-700/60 rounded-3xl p-5 md:p-6 mb-4">
      <div className="flex items-center gap-3 mb-1">
        {Icon && (
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-sky-400/25 text-sky-400">
            <Icon className="h-4 w-4" strokeWidth={2.5} />
          </div>
        )}
        <h2 className="text-base font-extrabold text-slate-100">{title}</h2>
      </div>
      {help && <p className="text-sm text-slate-500 leading-relaxed mb-4">{help}</p>}
      {children}
    </section>
  );
}

function RadioCard({ active, icon: Icon, label, body, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full text-left flex items-start gap-3 p-4 rounded-2xl transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)]
        ${active
          ? "bg-sky-400/20 border-2 border-sky-400"
          : "bg-slate-900/70 border border-slate-700/60 hover:border-slate-700"}`}
    >
      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl
        ${active ? "bg-sky-400 text-white" : "bg-slate-800/60 text-slate-500"}`}>
        <Icon className="h-5 w-5" strokeWidth={2.25} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <div className="font-bold text-sm text-slate-100">{label}</div>
          {active && <CheckCircle2 className="h-4 w-4 text-sky-400" strokeWidth={2.5} />}
        </div>
        <div className="text-xs text-slate-500 mt-0.5 leading-snug">{body}</div>
      </div>
    </button>
  );
}

export default function SettingsPage({ profile, onProfileUpdated, setActiveTab }) {
  const [name, setName] = useState(profile.name);
  const [email, setEmail] = useState(profile.email || "");
  const [riskTolerance, setRiskTolerance] = useState(profile.riskTolerance);
  const [experience, setExperience] = useState(profile.experience);
  const [savedFlash, setSavedFlash] = useState(false);
  const [error, setError] = useState(null);

  function handleSave() {
    if (!name.trim()) { setError("Name can't be empty."); return; }
    if (email && !/^\S+@\S+\.\S+$/.test(email)) { setError("That email doesn't look valid."); return; }
    setError(null);
    const updated = updateProfile({ name: name.trim(), email: email.trim(), riskTolerance, experience });
    onProfileUpdated?.(updated);
    setSavedFlash(true);
    setTimeout(() => setSavedFlash(false), 1800);
  }

  function handleRestartOnboarding() {
    const updated = updateProfile({ onboarded: false });
    onProfileUpdated?.(updated);
    setActiveTab("beginner");
  }

  return (
    <div className="px-6 py-10 md:px-10 max-w-3xl mx-auto">
      <header className="mb-8">
        <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-slate-100 mb-2">Settings</h1>
        <p className="text-slate-500 text-base md:text-lg leading-relaxed">
          All settings are stored only in your browser. Changing them here doesn't sync anywhere.
        </p>
      </header>

      <Section icon={User} title="Profile">
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">Display name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => { setName(e.target.value); setError(null); }}
              maxLength={60}
              className={INPUT}
            />
          </div>
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
              Email <span className="text-slate-500 font-medium normal-case tracking-normal">(optional)</span>
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => { setEmail(e.target.value); setError(null); }}
              placeholder="you@example.com"
              maxLength={120}
              className={INPUT}
            />
          </div>
        </div>
      </Section>

      <Section icon={ShieldCheck} title="Risk style" help="Used by the Improve optimizer (sets how much Sharpe you'll allow giving up to lower risk) and the Thesis tab (tilts suggestions toward your stated tolerance).">
        <div className="space-y-2">
          {RISK_LEVELS.map((r) => (
            <RadioCard
              key={r.id}
              active={riskTolerance === r.id}
              icon={r.icon}
              label={r.label}
              body={r.body}
              onClick={() => setRiskTolerance(r.id)}
            />
          ))}
        </div>
      </Section>

      <Section icon={BookOpen} title="Experience level" help="Affects what you see when you first open the app. Beginners get a guided onboarding; others skip straight to the dashboard.">
        <div className="space-y-2 mb-3">
          {EXPERIENCE_LEVELS.map((e) => (
            <RadioCard
              key={e.id}
              active={experience === e.id}
              icon={e.icon}
              label={e.label}
              body={e.body}
              onClick={() => setExperience(e.id)}
            />
          ))}
        </div>
        {experience === "beginner" && (
          <button
            type="button"
            onClick={handleRestartOnboarding}
            className="inline-flex items-center gap-1.5 text-sm font-bold text-sky-400 hover:text-sky-300 mt-2"
          >
            <RotateCcw className="h-4 w-4" strokeWidth={2.5} />
            Restart guided onboarding
          </button>
        )}
      </Section>

      {error && (
        <div className="rounded-2xl bg-rose-500/10 border border-rose-500/30 px-4 py-3 mb-4 text-sm font-medium text-rose-200">
          {error}
        </div>
      )}

      <div className="flex items-center gap-3 mb-8">
        <button
          onClick={handleSave}
          className="bg-sky-400 hover:bg-sky-500 text-white rounded-2xl font-bold px-6 py-3.5 transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] active:scale-[0.99] shadow-md shadow-sky-400/40"
        >
          Save changes
        </button>
        {savedFlash && (
          <span className="inline-flex items-center gap-1.5 text-sm font-bold text-sky-400">
            <CheckCircle2 className="h-4 w-4" strokeWidth={2.5} />
            Saved
          </span>
        )}
      </div>

      {/* Danger zone */}
      <section className="bg-rose-500/10 border border-rose-500/30 rounded-3xl p-5 md:p-6">
        <div className="flex items-center gap-3 mb-1">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-rose-500 text-white">
            <AlertTriangle className="h-4 w-4" strokeWidth={2.5} />
          </div>
          <h2 className="text-base font-extrabold text-rose-200">Reset</h2>
        </div>
        <p className="text-sm text-rose-200/80 leading-relaxed mb-4">
          Wipes your profile, snapshots, and last analysis from this browser. Useful for starting fresh or if you're handing the link to someone else on the same device.
        </p>
        <button
          onClick={() => {
            if (!window.confirm("Erase your profile, snapshots, and last analysis from this browser? This cannot be undone.")) return;
            clearAllLocalData();
            window.location.reload();
          }}
          className="inline-flex items-center gap-2 bg-slate-950 border border-rose-300 hover:bg-rose-500/100/10 text-rose-300 rounded-2xl font-bold px-5 py-3 text-sm transition-colors"
        >
          <Trash2 className="h-4 w-4" strokeWidth={2.5} />
          Clear all my data
        </button>
      </section>

      <div className="mt-8 text-xs text-slate-500 text-center font-mono">
        Profile created {new Date(profile.createdAt).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}
      </div>
    </div>
  );
}
