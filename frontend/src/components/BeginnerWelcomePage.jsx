import { profileFirstName, updateProfile } from "../utils/profile";

// JSX-friendly bodies so we can bold key phrases inline without a markdown lib.
const STEPS = [
  {
    n: 1,
    icon: "✎",
    title: "Tell us what you believe in",
    body: (
      <>
        <strong>Type in plain English</strong> what you think about markets — bullish on AI,
        worried about a recession, planning for retirement, whatever. We'll suggest{" "}
        <strong>specific tickers</strong> that match.
      </>
    ),
    cta: "Start with Thesis",
    target: "build",
  },
  {
    n: 2,
    icon: "▷",
    title: "See the risk you're actually taking",
    body: (
      <>
        Once you have a portfolio, Analyze tells you how risky it is — <strong>in real numbers</strong>.
        Worst-case loss. Volatility. <strong>How diversified you really are</strong> (not just ticker count).
      </>
    ),
    cta: "Try Analyze",
    target: "analyze",
  },
  {
    n: 3,
    icon: "✦",
    title: "Get specific ways to make it better",
    body: (
      <>
        Improve does the math to find <strong>specific trades</strong> that lower your risk
        without killing returns. Like <em>"add 12% TLT — here's exactly how that changes things."</em>
      </>
    ),
    cta: "See Improve",
    target: "improve",
  },
];

export default function BeginnerWelcomePage({ profile, setActiveTab, onComplete, onRunDemo }) {
  const firstName = profileFirstName(profile.name);

  function go(target) {
    updateProfile({ onboarded: true });
    onComplete?.();
    setActiveTab(target);
  }

  function skip() {
    updateProfile({ onboarded: true });
    onComplete?.();
    setActiveTab("dashboard");
  }

  function tryDemo() {
    updateProfile({ onboarded: true });
    onComplete?.();
    onRunDemo?.();
  }

  return (
    <div className="container">
      <div className="beginner-hero">
        <span className="beginner-hero-badge">Beginner-friendly</span>
        <h1 className="beginner-hero-title">Welcome, {firstName}.</h1>
        <p className="beginner-hero-sub">
          Panko is a tool that explains the <strong>real risk</strong> in your investments — not just whether they make money.
          Here's how it works in 3 steps. Start with whichever feels right.
        </p>
      </div>

      <div className="beginner-steps">
        {STEPS.map((s) => (
          <div key={s.n} className="beginner-step">
            <div className="beginner-step-icon-wrap">
              <span className="beginner-step-icon">{s.icon}</span>
              <span className="beginner-step-num">{s.n}</span>
            </div>
            <div className="beginner-step-text">
              <h2 className="beginner-step-title">{s.title}</h2>
              <p className="beginner-step-body">{s.body}</p>
              <button
                type="button"
                className="btn btn-primary beginner-step-cta"
                onClick={() => go(s.target)}
              >
                {s.cta} →
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="beginner-demo-cta">
        <div className="beginner-demo-cta-text">
          <strong>Not sure what any of this looks like?</strong>
          <span> Load a sample portfolio and see all the screens populated.</span>
        </div>
        <button type="button" className="btn btn-secondary" onClick={tryDemo}>
          Show me an example →
        </button>
      </div>

      <div className="beginner-footer">
        <div className="beginner-footer-tip">
          <strong>Pro tip:</strong> Anywhere you see a small <span className="beginner-q">?</span>,
          tap it for a plain-English explanation of that metric. The <strong>Learn</strong> tab
          (in the sidebar) has the full glossary.
        </div>
        <button type="button" className="beginner-skip" onClick={skip}>
          Skip — show me the full app instead
        </button>
      </div>
    </div>
  );
}
