import { useState, useEffect, lazy, Suspense } from "react";
import Sidebar from "./components/Sidebar";
import StatusBar from "./components/StatusBar";
import WelcomePage from "./components/WelcomePage";
import DashboardPage from "./components/DashboardPage";
import PortfolioForm from "./components/PortfolioForm";
import ResultsPanel from "./components/ResultsPanel";
import ThesisPage from "./components/ThesisPage";
import DisclaimerFooter from "./components/DisclaimerFooter";
import AssistantPanel from "./components/AssistantPanel";
import { analyzePortfolio } from "./api/client";
import { findPriorSnapshot } from "./utils/snapshots";
import { loadProfile, clearProfile, updateProfile } from "./utils/profile";
import { loadSession, saveSession, clearSession } from "./utils/sessionState";
import { DEMO_PORTFOLIO } from "./data/demoPortfolio";

// Lazy-loaded routes — chart-heavy or rarely-on-first-load. Each becomes
// its own JS chunk, so the initial bundle stays lean and Recharts only
// downloads when the user actually opens a page that needs it.
const SimulatePage      = lazy(() => import("./components/SimulatePage"));
const MonitorPage       = lazy(() => import("./components/MonitorPage"));
const ImprovePage       = lazy(() => import("./components/ImprovePage"));
const LearnPage         = lazy(() => import("./components/LearnPage"));
const PracticePage      = lazy(() => import("./components/PracticePage"));
const PlanPage          = lazy(() => import("./components/PlanPage"));
const SettingsPage      = lazy(() => import("./components/SettingsPage"));
const TermsOfServicePage = lazy(() => import("./components/TermsOfServicePage"));
const PrivacyPolicyPage  = lazy(() => import("./components/PrivacyPolicyPage"));

// Minimal route-level fallback — matches the page-transition wrapper so
// the layout doesn't jump. Brief-token caption color.
function RouteFallback() {
  return (
    <div className="container" style={{ padding: "var(--space-12) 0", color: "var(--ink-400)" }}>
      Loading…
    </div>
  );
}

// Backend warmup — Render's free tier spins down after 15 min idle and
// takes ~30s to wake. We fire-and-forget a /api/health request on app
// mount so the backend is warming while the user reads the Welcome / Dashboard
// page, instead of cold-starting on their first Analyze submit.
function warmBackend() {
  const BASE = import.meta.env.VITE_API_URL ?? "";
  if (!BASE) return;
  fetch(`${BASE}/api/health`, { method: "GET" }).catch(() => { /* ignore */ });
}

export default function App() {
  const [profile, setProfile] = useState(loadProfile());
  const [activeTab, setActiveTab] = useState(() => {
    const p = loadProfile();
    return p?.experience === "beginner" && !p?.onboarded ? "build" : "dashboard";
  });
  // Restore the most recent analysis if the user is signed in and has one.
  // Lazy initializer so localStorage is read once at mount, not on every render.
  const [results, setResults] = useState(() => loadProfile() ? (loadSession()?.results ?? null) : null);
  const [payload, setPayload] = useState(() => loadProfile() ? (loadSession()?.payload ?? null) : null);
  const [prevSnapshot, setPrevSnapshot] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [assistantOpen, setAssistantOpen] = useState(false);
  const [simulateOverride, setSimulateOverride] = useState(null);
  const [simulatePayload, setSimulatePayload] = useState(null);
  const [simulateResults, setSimulateResults] = useState(null);
  const [learnTarget, setLearnTarget] = useState(null);
  const [analyzeInitialHoldings, setAnalyzeInitialHoldings] = useState(null);

  function openLearn(metricId) {
    setLearnTarget(metricId);
    setActiveTab("learn");
  }

  function loadIntoAnalyze(holdings) {
    setAnalyzeInitialHoldings(holdings);
    setActiveTab("analyze");
  }

  async function runDemoPortfolio() {
    const demoPayload = { ...DEMO_PORTFOLIO };
    delete demoPayload.label;
    delete demoPayload.description;
    setActiveTab("dashboard");
    await handleSubmit(demoPayload);
  }

  useEffect(() => {
    function onKey(e) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setAssistantOpen((open) => !open);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Wake the Render backend on app load so it's warm by the time the user
  // submits their first request. Free tier sleeps after 15 min idle.
  useEffect(() => { warmBackend(); }, []);

  async function handleSubmit(formPayload) {
    setLoading(true);
    setError(null);
    setResults(null);
    setPrevSnapshot(null);
    const prior = findPriorSnapshot(formPayload);
    try {
      const data = await analyzePortfolio(formPayload);
      setResults(data);
      setPayload(formPayload);
      setPrevSnapshot(prior);
      saveSession(formPayload, data);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  function handleSignOut() {
    if (!window.confirm("Sign out of Panko? Your snapshots stay in this browser.")) return;
    clearProfile();
    clearSession();
    setProfile(null);
    setResults(null);
    setPayload(null);
    setActiveTab("dashboard");
  }

  if (!profile) {
    return <WelcomePage onSignIn={(p) => {
      setProfile(p);
      setActiveTab(p.experience === "beginner" ? "build" : "dashboard");
    }} />;
  }

  return (
    <div className="app-shell">
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        hasResults={!!results}
        profile={profile}
        onSignOut={handleSignOut}
      />

      <main className="app-main">
        <StatusBar results={results} payload={payload} />
        <div key={activeTab} className="page-transition">

          {activeTab === "dashboard" && (
            <DashboardPage
              profile={profile}
              results={results}
              payload={payload}
              prevSnapshot={prevSnapshot}
              setActiveTab={setActiveTab}
              onLearnMore={openLearn}
              onRunDemo={runDemoPortfolio}
              loading={loading}
            />
          )}

          {activeTab === "analyze" && (
            <div className="container">
              <PortfolioForm
                onSubmit={handleSubmit}
                loading={loading}
                initialHoldings={analyzeInitialHoldings}
                onInitialConsumed={() => setAnalyzeInitialHoldings(null)}
              />
              {error && <div className="error">{error}</div>}
              {results && (
                <ResultsPanel results={results} payload={payload} prevSnapshot={prevSnapshot} onLearnMore={openLearn} />
              )}
            </div>
          )}

          {activeTab === "build" && (
            <ThesisPage onUseInAnalyze={loadIntoAnalyze} profile={profile} />
          )}

          {activeTab === "simulate" && (
            <Suspense fallback={<RouteFallback />}>
              <SimulatePage
                lastPayload={payload}
                lastResults={results}
                simulateOverride={simulateOverride}
                onOverrideConsumed={() => setSimulateOverride(null)}
                onSimulateComplete={(p, r) => { setSimulatePayload(p); setSimulateResults(r); }}
                onLearnMore={openLearn}
              />
            </Suspense>
          )}

          {activeTab === "improve" && (
            <Suspense fallback={<RouteFallback />}>
              <ImprovePage
                lastPayload={payload}
                lastResults={results}
                simulatePayload={simulatePayload}
                simulateResults={simulateResults}
                onUseInSimulate={(holdings) => {
                  setSimulateOverride(holdings);
                  setActiveTab("simulate");
                }}
                onLearnMore={openLearn}
                profile={profile}
              />
            </Suspense>
          )}

          {activeTab === "plan" && (
            <Suspense fallback={<RouteFallback />}>
              <PlanPage results={results} payload={payload} />
            </Suspense>
          )}

          {activeTab === "monitor" && (
            <Suspense fallback={<RouteFallback />}>
              <MonitorPage setActiveTab={setActiveTab} />
            </Suspense>
          )}

          {activeTab === "learn" && (
            <Suspense fallback={<RouteFallback />}>
              <LearnPage initialMetricId={learnTarget} />
            </Suspense>
          )}

          {activeTab === "practice" && (
            <Suspense fallback={<RouteFallback />}>
              <PracticePage />
            </Suspense>
          )}

          {activeTab === "settings" && (
            <Suspense fallback={<RouteFallback />}>
              <SettingsPage
                profile={profile}
                onProfileUpdated={setProfile}
                setActiveTab={setActiveTab}
              />
            </Suspense>
          )}

          {activeTab === "terms" && (
            <Suspense fallback={<RouteFallback />}>
              <TermsOfServicePage setActiveTab={setActiveTab} />
            </Suspense>
          )}
          {activeTab === "privacy" && (
            <Suspense fallback={<RouteFallback />}>
              <PrivacyPolicyPage setActiveTab={setActiveTab} />
            </Suspense>
          )}
        </div>
        <DisclaimerFooter setActiveTab={setActiveTab} />
      </main>

      <button
        onClick={() => setAssistantOpen(true)}
        title="Ask the assistant about your portfolio"
        className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 flex items-center gap-3 bg-slate-900 hover:bg-slate-800 text-white rounded-full pl-5 pr-3 py-3 shadow-lg shadow-slate-900/20 transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] hover:scale-[1.02] active:scale-[0.98]"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <circle cx="12" cy="12" r="9" />
          <circle cx="12" cy="12" r="3" />
        </svg>
        <span className="text-sm font-semibold">Ask about your portfolio</span>
        <span className="bg-white/10 text-white/80 text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-full">⌘K</span>
      </button>

      <AssistantPanel
        isOpen={assistantOpen}
        onClose={() => setAssistantOpen(false)}
        lastResults={results}
        lastPayload={payload}
      />
    </div>
  );
}
