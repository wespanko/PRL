import { ArrowLeft, ArrowRight, AlertTriangle } from "lucide-react";

export default function TermsOfServicePage({ setActiveTab }) {
  return (
    <div className="px-6 py-10 md:px-10 max-w-3xl mx-auto">
      <header className="mb-8">
        <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-slate-900 mb-2">
          Terms of Service
        </h1>
        <p className="text-xs text-slate-400 font-mono">
          Last updated: May 3, 2025 · Template — review with counsel before commercial use.
        </p>
      </header>

      <div className="bg-white border border-slate-200 rounded-3xl p-6 md:p-8 space-y-6 text-[15px] text-slate-700 leading-relaxed">
        <Section title="1. Educational Use Only">
          Panko, operated by Panko Financial Strategies LLC ("Panko," "we," "us," or "the Service"), is a portfolio risk diagnostics tool provided strictly for <strong className="text-slate-900">educational and informational purposes</strong>. The Service is <strong className="text-slate-900">not</strong> investment advice, financial advice, brokerage services, tax advice, legal advice, or a recommendation to buy, sell, or hold any security. The Service does not consider your personal financial situation, goals, or constraints.
        </Section>

        <Section title="2. No Investment Advisor Relationship">
          The Service is not a registered investment advisor under the Investment Advisers Act of 1940, a broker-dealer under the Securities Exchange Act of 1934, or an SEC-registered entity. No fiduciary, advisory, or professional relationship is created by your use of the Service. Output from the Service — including ticker suggestions, optimized portfolio paths, projected values, and risk scores — is generated mechanically from public data and rule-based logic and should be treated as <strong className="text-slate-900">illustrative, not actionable</strong>.
        </Section>

        <Section title="3. No Warranty">
          The Service is provided <strong className="text-slate-900">"as is" and "as available"</strong> with no warranties of any kind, express or implied, including merchantability, fitness for a particular purpose, accuracy, completeness, non-infringement, or uninterrupted operation. Market data may be delayed, incomplete, or inaccurate. Calculations may contain bugs. AI-generated content may be incorrect or hallucinated.
        </Section>

        <Section title="4. Limitation of Liability">
          To the maximum extent permitted by law, neither Panko Financial Strategies LLC nor its members, officers, employees, agents, or affiliates are liable for any direct, indirect, incidental, special, consequential, or punitive damages arising from your use of the Service, including but not limited to: investment losses, missed opportunities, tax consequences, data loss, business interruption, or any decision made based on Service output. <strong className="text-slate-900">You acknowledge that all investment decisions are yours alone and that you bear sole responsibility for any outcomes.</strong> Aggregate liability shall not exceed the amount you paid for the Service in the twelve months preceding the claim.
        </Section>

        <Section title="5. Past Performance">
          Past performance is not indicative of future results. Historical returns shown in the Service do not predict, project, or guarantee future returns. Forward-looking projections (e.g., the Plan tab's Future Value calculator) are mathematical models based on user-supplied assumptions; <strong className="text-slate-900">actual returns may vary substantially and could be negative</strong>.
        </Section>

        <Section title="6. Risk of Loss">
          All investing involves risk, including the loss of principal. There is no assurance that any investment strategy will achieve its objectives, generate profits, or avoid losses. Diversification does not guarantee against loss. Aggressive portfolios can lose more than 50% of their value in a market crash. <strong className="text-slate-900">Never invest money you cannot afford to lose.</strong>
        </Section>

        <Section title="7. AI-Generated Content">
          The Service uses large language models (Anthropic's Claude family) for narrative summaries, thesis-to-portfolio mapping, and the assistant chat. AI-generated content can be wrong, misleading, or incomplete. The Service constrains the AI to a curated ticker universe to reduce hallucination, but you should independently verify every suggestion before acting on it.
        </Section>

        <Section title="8. Your Responsibilities">
          You agree to: (a) use the Service only for lawful, personal, educational purposes; (b) not rely on the Service as your sole source for investment decisions; (c) consult a licensed financial advisor, CPA, or attorney before making material financial decisions; (d) not attempt to scrape, reverse-engineer, or overload the Service; (e) provide accurate information about your risk tolerance and experience.
        </Section>

        <Section title="9. Indemnification">
          You agree to indemnify and hold harmless Panko Financial Strategies LLC, its members, officers, employees, agents, and affiliates from any claim, loss, damage, or expense (including reasonable attorney fees) arising from your use of the Service, your violation of these Terms, or your investment decisions.
        </Section>

        <Section title="10. Modifications and Termination">
          These Terms may be updated at any time. Continued use after changes constitutes acceptance. The Service may be modified, suspended, or discontinued at any time without notice.
        </Section>

        <Section title="11. Governing Law">
          These Terms are governed by the laws of the State of California, USA, without regard to conflict-of-laws principles. Any dispute arising from these Terms or your use of the Service must be resolved in the courts of California.
        </Section>

        <Section title="12. Contact">
          For questions about these Terms, contact the operator at the email address provided at sign-up time, or via the GitHub repository linked from the application.
        </Section>

        <div className="flex gap-3 rounded-2xl bg-amber-50 border border-amber-200 p-4 mt-6">
          <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" strokeWidth={2.5} />
          <p className="text-sm text-amber-900 leading-relaxed">
            <strong>Reminder:</strong> this document is a template and is not legal advice. Before using Panko commercially, before charging money, before onboarding strangers, and before relying on these Terms in any dispute, have a licensed attorney in your jurisdiction review and customize them.
          </p>
        </div>
      </div>

      <div className="flex gap-3 mt-6">
        <button
          onClick={() => setActiveTab("dashboard")}
          className="flex items-center gap-2 px-6 py-3.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold transition-colors"
        >
          <ArrowLeft className="h-4 w-4" strokeWidth={2.5} />
          Back to dashboard
        </button>
        <button
          onClick={() => setActiveTab("privacy")}
          className="flex items-center gap-2 px-6 py-3.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold transition-colors ml-auto"
        >
          Privacy Policy
          <ArrowRight className="h-4 w-4" strokeWidth={2.5} />
        </button>
      </div>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <section>
      <h2 className="text-base font-extrabold text-slate-900 mb-2">{title}</h2>
      <p>{children}</p>
    </section>
  );
}
