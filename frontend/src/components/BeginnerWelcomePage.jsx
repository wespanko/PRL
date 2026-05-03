import { profileFirstName, updateProfile } from "../utils/profile";

const STEPS = [
  {
    n: 1,
    icon: "✎",
    title: "Tell us what you believe in",
    body: "Think you're bullish on AI? Worried about a recession? Want a portfolio that lasts through retirement? Just type it in plain English on the Thesis tab — we'll suggest specific tickers that match.",
    cta: "Start with Thesis",
    target: "thesis",
  },
  {
    n: 2,
    icon: "▷",
    title: "See the risk you're actually taking",
    body: "Once you have a portfolio, the Analyze tab tells you how risky it is — not in vague terms, in real numbers. Your portfolio's worst-case loss, how much it swings, how diversified it really is.",
    cta: "Try Analyze",
    target: "analyze",
  },
  {
    n: 3,
    icon: "✦",
    title: "Get specific ways to make it better",
    body: "The Improve tab does the math to find specific trades that lower your risk without killing your returns. Like 'add 12% TLT, here's exactly how that changes things.'",
    cta: "See Improve",
    target: "improve",
  },
];

export default function BeginnerWelcomePage({ profile, setActiveTab, onComplete }) {
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
