import { Button } from "./ui";

export default function PrivacyPolicyPage({ setActiveTab }) {
  return (
    <div className="container">
      <div className="legal-hero">
        <h1 className="legal-hero-title">Privacy Policy</h1>
        <p className="legal-hero-meta">Last updated: May 3, 2025 · Template — review with counsel before commercial use.</p>
      </div>

      <div className="card legal-card">
        <h2 className="legal-h2">1. What we collect — and what we don't</h2>
        <p>
          Panko, operated by Panko Financial Strategies LLC ("Panko," "we"), stores all of your
          personal data <strong>only in your own browser's localStorage</strong>.
          No central database. The operator cannot see your name, email, portfolios, or analysis history.
          The data we hold in your browser:
        </p>
        <ul className="legal-list">
          <li><strong>Profile:</strong> the name and (optional) email you entered at sign-up, plus your risk style and experience level. Used to personalize the app.</li>
          <li><strong>Snapshots:</strong> the portfolio analyses you've saved, with their results.</li>
          <li><strong>Last analysis:</strong> the most recent run, so refreshing the page doesn't lose your work.</li>
        </ul>

        <h2 className="legal-h2">2. What we send to servers</h2>
        <p>
          When you analyze a portfolio, we send to <strong>our backend server</strong>: your tickers,
          weights, date range, benchmark, and risk-free rate. The server uses these to fetch market
          data and compute risk metrics. We do not store this data after the request completes; only
          a short-lived in-memory price cache (1 hour) is retained for performance.
        </p>
        <p>
          When you use the Assistant chat or the Build tab's free-form thesis, your message is sent
          to <strong>Anthropic's Claude API</strong> for processing. Anthropic's privacy practices
          apply to that data — see Anthropic's privacy policy. We do not retain LLM conversations
          server-side after the response is returned.
        </p>
        <p>
          When you fetch ticker prices, we query <strong>Yahoo Finance</strong> through the yfinance
          library. Yahoo's privacy practices apply.
        </p>

        <h2 className="legal-h2">3. What we don't do</h2>
        <ul className="legal-list">
          <li>We <strong>do not</strong> sell, share, or rent your personal data.</li>
          <li>We <strong>do not</strong> set tracking cookies, analytics pixels, or fingerprint your device.</li>
          <li>We <strong>do not</strong> serve ads or use behavioral advertising.</li>
          <li>We <strong>do not</strong> contact you outside the application.</li>
          <li>We <strong>do not</strong> have a way to recover your data if you clear your browser — there's no account on a server to log into.</li>
        </ul>

        <h2 className="legal-h2">4. Hosting providers</h2>
        <p>
          The frontend is hosted by <strong>Vercel</strong>; the backend by <strong>Render</strong>.
          Standard server logs (request URLs, timestamps, IP addresses) may be retained by these
          providers per their respective terms. We do not link those logs to your personal data.
        </p>

        <h2 className="legal-h2">5. Children</h2>
        <p>
          Panko is not directed at children under 13. If you are under 13, do not use the Service.
        </p>

        <h2 className="legal-h2">6. Your rights</h2>
        <p>
          Because all your data is local to your browser, you can <strong>delete it at any time</strong>{" "}
          from the Settings page ("Clear all my data" button) or by clearing your browser's
          localStorage for this site. There is no server-side account to delete.
        </p>
        <p>
          If you used the Assistant chat or LLM thesis features, you may have additional rights
          under Anthropic's privacy policy regarding the data sent to them.
        </p>

        <h2 className="legal-h2">7. Security</h2>
        <p>
          We use HTTPS/TLS for all network traffic. We do not transmit or store passwords. We do
          not have any access to your funds or brokerage accounts — Panko never connects to a
          brokerage and never executes trades.
        </p>

        <h2 className="legal-h2">8. Changes to this Policy</h2>
        <p>
          This Policy may be updated. The "Last updated" date at the top reflects the most recent
          revision. Material changes will be noted in the application.
        </p>

        <h2 className="legal-h2">9. Contact</h2>
        <p>
          For privacy-related questions, contact Panko Financial Strategies LLC at the email used at sign-up, or via
          the project's GitHub repository.
        </p>

        <div className="legal-footer-note">
          <strong>Reminder:</strong> this document is a template and is not legal advice. If you
          collect data from EU residents, California residents, or anyone in a regulated jurisdiction,
          you have specific legal obligations (GDPR, CCPA, etc.) that this template does not fully
          address. Have a privacy attorney review before commercial use.
        </div>
      </div>

      <div className="legal-back-row">
        <Button variant="secondary" onClick={() => setActiveTab("dashboard")}>
          ← Back to dashboard
        </Button>
        <Button variant="secondary" onClick={() => setActiveTab("terms")}>
          Terms of Service →
        </Button>
      </div>
    </div>
  );
}
