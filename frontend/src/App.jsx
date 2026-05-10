import { useState, useEffect } from "react";
import Sidebar from "./components/Sidebar";
import StatusBar from "./components/StatusBar";
import WelcomePage from "./components/WelcomePage";
import DashboardPage from "./components/DashboardPage";
import PortfolioForm from "./components/PortfolioForm";
import ResultsPanel from "./components/ResultsPanel";
import SimulatePage from "./components/SimulatePage";
import MonitorPage from "./components/MonitorPage";
import ImprovePage from "./components/ImprovePage";
import LearnPage from "./components/LearnPage";
import ThesisPage from "./components/ThesisPage";
import PlanPage from "./components/PlanPage";
import SettingsPage from "./components/SettingsPage";
import TermsOfServicePage from "./components/TermsOfServicePage";
import PrivacyPolicyPage from "./components/PrivacyPolicyPage";
import DisclaimerFooter from "./components/DisclaimerFooter";
import AssistantPanel from "./components/AssistantPanel";
import { analyzePortfolio } from "./api/client";
import { findPriorSnapshot } from "./utils/snapshots";
import { loadProfile, clearProfile, updateProfile } from "./utils/profile";
import { loadSession, saveSession, clearSession } from "./utils/sessionState";
import { DEMO_PORTFOLIO } from "./data/demoPortfolio";

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
            <SimulatePage
              lastPayload={payload}
              lastResults={results}
              simulateOverride={simulateOverride}
              onOverrideConsumed={() => setSimulateOverride(null)}
              onSimulateComplete={(p, r) => { setSimulatePayload(p); setSimulateResults(r); }}
              onLearnMore={openLearn}
            />
          )}

          {activeTab === "improve" && (
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
          )}

          {activeTab === "plan" && (
            <PlanPage results={results} payload={payload} />
          )}

          {activeTab === "monitor" && <MonitorPage setActiveTab={setActiveTab} />}

          {activeTab === "learn" && <LearnPage initialMetricId={learnTarget} />}

          {activeTab === "settings" && (
            <SettingsPage
              profile={profile}
              onProfileUpdated={setProfile}
              setActiveTab={setActiveTab}
            />
          )}

          {activeTab === "terms" && <TermsOfServicePage setActiveTab={setActiveTab} />}
          {activeTab === "privacy" && <PrivacyPolicyPage setActiveTab={setActiveTab} />}
        </div>
        <DisclaimerFooter setActiveTab={setActiveTab} />
      </main>

      <button
        className="assistant-fab"
        onClick={() => setAssistantOpen(true)}
        title="Ask the assistant about your portfolio"
      >
        <span className="assistant-fab-icon">✦</span>
        <span className="assistant-fab-label">Ask about your portfolio…</span>
        <span className="assistant-fab-shortcut">⌘K</span>
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
