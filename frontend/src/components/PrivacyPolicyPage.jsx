import { ArrowLeft, ArrowRight, AlertTriangle } from "lucide-react";

export default function PrivacyPolicyPage({ setActiveTab }) {
  return (
    <div className="px-6 py-10 md:px-10 max-w-3xl mx-auto">
      <header className="mb-8">
        <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-slate-100 mb-2">
          Privacy Policy
        </h1>
        <p className="text-xs text-slate-500 font-mono">
          Last updated: May 3, 2025 · Template — review with counsel before commercial use.
        </p>
      </header>

      <div className="bg-slate-900/70 border border-slate-700/60 rounded-3xl p-6 md:p-8 space-y-6 text-[15px] text-slate-600 leading-relaxed">
        <Section title="1. What we collect — and what we don't">
          <p>
            Panko, operated by Panko Financial Strategies LLC ("Panko," "we"), stores all of your personal data <strong className="text-slate-100">only in your own browser's localStorage</strong>. No central database. The operator cannot see your name, email, portfolios, or analysis history. The data we hold in your browser:
          </p>
          <ul className="mt-3 space-y-1.5 list-disc pl-5">
            <li><strong className="text-slate-100">Profile:</strong> the name and (optional) email you entered at sign-up, plus your risk style and experience level.</li>
            <li><strong className="text-slate-100">Snapshots:</strong> the portfolio analyses you've saved, with their results.</li>
            <li><strong className="text-slate-100">Last analysis:</strong> the most recent run, so refreshing the page doesn't lose your work.</li>
          </ul>
        </Section>

        <Section title="2. What we send to servers">
          <p>
            When you analyze a portfolio, we send to <strong className="text-slate-100">our backend server</strong>: your tickers, weights, date range, benchmark, and risk-free rate. The server uses these to fetch market data and compute risk metrics. We do not store this data after the request completes; only a short-lived in-memory price cache (1 hour) is retained for performance.
          </p>
          <p className="mt-3">
            When you use the Assistant chat or the Build tab's free-form thesis, your message is sent to <strong className="text-slate-100">Anthropic's Claude API</strong> for processing. Anthropic's privacy practices apply to that data — see Anthropic's privacy policy. We do not retain LLM conversations server-side after the response is returned.
          </p>
          <p className="mt-3">
            When you fetch ticker prices, we query <strong className="text-slate-100">Yahoo Finance</strong> through the yfinance library. Yahoo's privacy practices apply.
          </p>
        </Section>

        <Section title="3. What we don't do">
          <ul className="space-y-1.5 list-disc pl-5">
            <li>We <strong className="text-slate-100">do not</strong> sell, share, or rent your personal data.</li>
            <li>We <strong className="text-slate-100">do not</strong> set tracking cookies, analytics pixels, or fingerprint your device.</li>
            <li>We <strong className="text-slate-100">do not</strong> serve ads or use behavioral advertising.</li>
            <li>We <strong className="text-slate-100">do not</strong> contact you outside the application.</li>
            <li>We <strong className="text-slate-100">do not</strong> have a way to recover your data if you clear your browser — there's no account on a server to log into.</li>
          </ul>
        </Section>

        <Section title="4. Hosting providers">
          The frontend is hosted by <strong className="text-slate-100">Vercel</strong>; the backend by <strong className="text-slate-100">Render</strong>. Standard server logs (request URLs, timestamps, IP addresses) may be retained by these providers per their respective terms. We do not link those logs to your personal data.
        </Section>

        <Section title="5. Children">
          Panko is not directed at children under 13. If you are under 13, do not use the Service.
        </Section>

        <Section title="6. Your rights">
          <p>
            Because all your data is local to your browser, you can <strong className="text-slate-100">delete it at any time</strong> from the Settings page ("Clear all my data" button) or by clearing your browser's localStorage for this site. There is no server-side account to delete.
          </p>
          <p className="mt-3">
            If you used the Assistant chat or LLM thesis features, you may have additional rights under Anthropic's privacy policy regarding the data sent to them.
          </p>
        </Section>

        <Section title="7. Security">
          We use HTTPS/TLS for all network traffic. We do not transmit or store passwords. We do not have any access to your funds or brokerage accounts — Panko never connects to a brokerage and never executes trades.
        </Section>

        <Section title="8. Changes to this Policy">
          This Policy may be updated. The "Last updated" date at the top reflects the most recent revision. Material changes will be noted in the application.
        </Section>

        <Section title="9. Contact">
          For privacy-related questions, contact Panko Financial Strategies LLC at the email used at sign-up, or via the project's GitHub repository.
        </Section>

        <div className="flex gap-3 rounded-2xl bg-amber-500/10 border border-amber-500/30 p-4 mt-6">
          <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" strokeWidth={2.5} />
          <p className="text-sm text-amber-200 leading-relaxed">
            <strong>Reminder:</strong> this document is a template and is not legal advice. If you collect data from EU residents, California residents, or anyone in a regulated jurisdiction, you have specific legal obligations (GDPR, CCPA, etc.) that this template does not fully address. Have a privacy attorney review before commercial use.
          </p>
        </div>
      </div>

      <div className="flex gap-3 mt-6">
        <button
          onClick={() => setActiveTab("dashboard")}
          className="flex items-center gap-2 px-6 py-3.5 rounded-2xl bg-slate-800/60 hover:bg-slate-700 text-slate-600 font-bold transition-colors"
        >
          <ArrowLeft className="h-4 w-4" strokeWidth={2.5} />
          Back to dashboard
        </button>
        <button
          onClick={() => setActiveTab("terms")}
          className="flex items-center gap-2 px-6 py-3.5 rounded-2xl bg-slate-800/60 hover:bg-slate-700 text-slate-600 font-bold transition-colors ml-auto"
        >
          Terms of Service
          <ArrowRight className="h-4 w-4" strokeWidth={2.5} />
        </button>
      </div>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <section>
      <h2 className="text-base font-extrabold text-slate-100 mb-2">{title}</h2>
      {children}
    </section>
  );
}
