import { useState } from "react";
import { saveProfile } from "../utils/profile";

const FEATURES = [
  {
    icon: "◎",
    title: "Real risk math",
    body: "Sharpe, beta, drawdown, VaR, downside capture — computed in Python (pandas/NumPy) on real price history. No LLM guessing.",
  },
  {
    icon: "✦",
    title: "Optimized rebalancing",
    body: "Constrained grid-search optimizer finds the trade that mathematically improves your Panko Score subject to a Sharpe-preserving floor.",
  },
  {
    icon: "◐",
    title: "Real diversification",
    body: "Correlation-adjusted ENP — measures independent bets, not just ticker count. Most retail tools miss this.",
  },
  {
    icon: "↻",
    title: "Portfolio over time",
    body: "Snapshot your portfolio, watch drift in volatility, beta, and concentration over weeks and months.",
  },
];

const TRUST_BADGES = [
  { icon: "🔒", label: "100% local", body: "Your data never leaves your browser" },
  { icon: "🧮", label: "Deterministic math", body: "Pure Python, not chatbot output" },
  { icon: "📖", label: "Transparent", body: "Every formula is documented in Learn" },
];

const RISK_LEVELS = [
  { id: "conservative", label: "Conservative", icon: "◐", body: "Capital preservation first. Cap drawdowns. Lower returns OK." },
  { id: "balanced",     label: "Balanced",     icon: "◎", body: "Growth and risk control in equal measure. Bond-equity mix." },
  { id: "aggressive",   label: "Aggressive",   icon: "▲", body: "Growth-tilted. Higher volatility tolerance for higher upside." },
];

export default function WelcomePage({ onSignIn }) {
  const [step, setStep] = useState("hero");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [riskTolerance, setRiskTolerance] = useState("balanced");
  const [error, setError] = useState(null);

  function handleNameStep(e) {
    e.preventDefault();
    if (!name.trim()) {
      setError("Please enter your name.");
      return;
    }
    if (email && !/^\S+@\S+\.\S+$/.test(email)) {
      setError("That doesn't look like a valid email.");
      return;
    }
    setError(null);
    setStep("risk");
  }

  function handleFinish() {
    const profile = saveProfile({ name, email, riskTolerance });
    onSignIn(profile);
  }

  return (
    <div className="welcome-bg">
      <div className="welcome-container">
        {step === "hero" && (
          <div className="welcome-hero">
            <div className="welcome-brand">
              <span className="welcome-brand-mark">P</span>
              <span className="welcome-brand-name">Panko</span>
            </div>

            <h1 className="welcome-headline">
              Your portfolio,
              <br />
              <span className="welcome-headline-accent">analyzed like a quant.</span>
            </h1>
            <p className="welcome-subhead">
              Real risk math. Optimized rebalancing. The diversification metric
              your brokerage doesn't show you.
            </p>

            <button className="welcome-cta" onClick={() => setStep("name")}>
              Get started — it's free
              <span className="welcome-cta-arrow">→</span>
            </button>

            <div className="welcome-trust-row">
              {TRUST_BADGES.map((b) => (
                <div key={b.label} className="welcome-trust-item">
                  <span className="welcome-trust-icon" aria-hidden="true">{b.icon}</span>
                  <div className="welcome-trust-text">
                    <div className="welcome-trust-label">{b.label}</div>
                    <div className="welcome-trust-body">{b.body}</div>
                  </div>
                </div>
              ))}
            </div>

            <div className="welcome-feature-grid">
              {FEATURES.map((f) => (
                <div key={f.title} className="welcome-feature">
                  <span className="welcome-feature-icon">{f.icon}</span>
                  <div className="welcome-feature-title">{f.title}</div>
                  <div className="welcome-feature-body">{f.body}</div>
                </div>
              ))}
            </div>

            <div className="welcome-disclaimer">
              <strong>Educational tool · Not financial advice.</strong> Panko computes
              real risk metrics from historical data — but historical performance does not
              guarantee future results. Consult a licensed advisor before acting on any
              portfolio decision. We don't store your data on any server.
            </div>
          </div>
        )}

        {step === "name" && (
          <div className="welcome-signin">
            <div className="welcome-stepbar">
              <span className="welcome-step welcome-step--active">1 — Profile</span>
              <span className="welcome-step-divider">·</span>
              <span className="welcome-step">2 — Risk style</span>
            </div>
            <div className="welcome-brand welcome-brand--small">
              <span className="welcome-brand-mark">P</span>
              <span className="welcome-brand-name">Panko</span>
            </div>

            <h2 className="welcome-signin-title">Let's set you up</h2>
            <p className="welcome-signin-subtitle">
              Just a name to personalize the app. Email is optional and stored
              only in your browser.
            </p>

            <form className="welcome-form" onSubmit={handleNameStep}>
              <label className="welcome-field">
                <span className="welcome-field-label">Your name</span>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => { setName(e.target.value); setError(null); }}
                  placeholder="Wes Panko"
                  autoFocus
                  maxLength={60}
                />
              </label>
              <label className="welcome-field">
                <span className="welcome-field-label">
                  Email <span className="welcome-field-optional">(optional)</span>
                </span>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setError(null); }}
                  placeholder="you@example.com"
                  maxLength={120}
                />
              </label>

              {error && <div className="welcome-error">{error}</div>}

              <div className="welcome-form-actions">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setStep("hero")}
                >
                  Back
                </button>
                <button type="submit" className="btn btn-primary welcome-form-submit">
                  Next →
                </button>
              </div>
            </form>

            <div className="welcome-disclaimer welcome-disclaimer--signin">
              No password, no server, no tracking. This is a local app.
            </div>
          </div>
        )}

        {step === "risk" && (
          <div className="welcome-signin">
            <div className="welcome-stepbar">
              <span className="welcome-step">1 — Profile</span>
              <span className="welcome-step-divider">·</span>
              <span className="welcome-step welcome-step--active">2 — Risk style</span>
            </div>
            <div className="welcome-brand welcome-brand--small">
              <span className="welcome-brand-mark">P</span>
              <span className="welcome-brand-name">Panko</span>
            </div>

            <h2 className="welcome-signin-title">What's your risk style?</h2>
            <p className="welcome-signin-subtitle">
              We'll use this to tune Thesis suggestions and Improve recommendations.
              You can change it anytime from your profile.
            </p>

            <div className="welcome-risk-grid">
              {RISK_LEVELS.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  className={`welcome-risk-card ${riskTolerance === r.id ? "welcome-risk-card--active" : ""}`}
                  onClick={() => setRiskTolerance(r.id)}
                >
                  <span className="welcome-risk-icon">{r.icon}</span>
                  <div className="welcome-risk-label">{r.label}</div>
                  <div className="welcome-risk-body">{r.body}</div>
                </button>
              ))}
            </div>

            <div className="welcome-form-actions" style={{ marginTop: 24 }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setStep("name")}
              >
                Back
              </button>
              <button
                type="button"
                className="btn btn-primary welcome-form-submit"
                onClick={handleFinish}
              >
                Enter Panko →
              </button>
            </div>

            <div className="welcome-disclaimer welcome-disclaimer--signin">
              <strong>Reminder:</strong> Panko is educational. It is not your financial
              advisor. Risk style helps tune the engine — it does not constitute advice.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
