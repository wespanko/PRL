export default function TermsOfServicePage({ setActiveTab }) {
  return (
    <div className="container">
      <div className="legal-hero">
        <h1 className="legal-hero-title">Terms of Service</h1>
        <p className="legal-hero-meta">Last updated: May 3, 2025 · Template — review with counsel before commercial use.</p>
      </div>

      <div className="card legal-card">
        <h2 className="legal-h2">1. Educational Use Only</h2>
        <p>
          Panko, operated by Panko Financial Strategies LLC ("Panko," "we," "us," or "the Service"), is a portfolio risk diagnostics tool provided strictly for
          <strong> educational and informational purposes</strong>. The Service is <strong>not</strong> investment
          advice, financial advice, brokerage services, tax advice, legal advice, or a recommendation
          to buy, sell, or hold any security. The Service does not consider your personal financial
          situation, goals, or constraints.
        </p>

        <h2 className="legal-h2">2. No Investment Advisor Relationship</h2>
        <p>
          The Service is not a registered investment advisor under the Investment Advisers Act of 1940,
          a broker-dealer under the Securities Exchange Act of 1934, or an SEC-registered entity. No
          fiduciary, advisory, or professional relationship is created by your use of the Service.
          Output from the Service — including ticker suggestions, optimized portfolio paths, projected
          values, and risk scores — is generated mechanically from public data and rule-based logic
          and should be treated as <strong>illustrative, not actionable</strong>.
        </p>

        <h2 className="legal-h2">3. No Warranty</h2>
        <p>
          The Service is provided <strong>"as is" and "as available"</strong> with no warranties of
          any kind, express or implied, including merchantability, fitness for a particular purpose,
          accuracy, completeness, non-infringement, or uninterrupted operation. Market data may be
          delayed, incomplete, or inaccurate. Calculations may contain bugs. AI-generated content
          may be incorrect or hallucinated.
        </p>

        <h2 className="legal-h2">4. Limitation of Liability</h2>
        <p>
          To the maximum extent permitted by law, neither Panko Financial Strategies LLC nor its
          members, officers, employees, agents, or affiliates are liable for any direct, indirect,
          incidental, special, consequential, or punitive damages arising from your use of the
          Service, including but not limited to: investment losses, missed opportunities, tax
          consequences, data loss, business interruption, or any decision made based on Service
          output. <strong>You acknowledge that all investment decisions are yours alone and that
          you bear sole responsibility for any outcomes.</strong> Aggregate liability shall not
          exceed the amount you paid for the Service in the twelve months preceding the claim.
        </p>

        <h2 className="legal-h2">5. Past Performance</h2>
        <p>
          Past performance is not indicative of future results. Historical returns shown in the
          Service do not predict, project, or guarantee future returns. Forward-looking projections
          (e.g., the Plan tab's Future Value calculator) are mathematical models based on user-supplied
          assumptions; <strong>actual returns may vary substantially and could be negative</strong>.
        </p>

        <h2 className="legal-h2">6. Risk of Loss</h2>
        <p>
          All investing involves risk, including the loss of principal. There is no assurance that
          any investment strategy will achieve its objectives, generate profits, or avoid losses.
          Diversification does not guarantee against loss. Aggressive portfolios can lose more than
          50% of their value in a market crash. <strong>Never invest money you cannot afford to lose.</strong>
        </p>

        <h2 className="legal-h2">7. AI-Generated Content</h2>
        <p>
          The Service uses large language models (Anthropic's Claude family) for narrative summaries,
          thesis-to-portfolio mapping, and the assistant chat. AI-generated content can be wrong,
          misleading, or incomplete. The Service constrains the AI to a curated ticker universe to
          reduce hallucination, but you should independently verify every suggestion before acting on it.
        </p>

        <h2 className="legal-h2">8. Your Responsibilities</h2>
        <p>
          You agree to: (a) use the Service only for lawful, personal, educational purposes; (b) not
          rely on the Service as your sole source for investment decisions; (c) consult a licensed
          financial advisor, CPA, or attorney before making material financial decisions; (d) not
          attempt to scrape, reverse-engineer, or overload the Service; (e) provide accurate
          information about your risk tolerance and experience.
        </p>

        <h2 className="legal-h2">9. Indemnification</h2>
        <p>
          You agree to indemnify and hold harmless Panko Financial Strategies LLC, its members,
          officers, employees, agents, and affiliates from any claim, loss, damage, or expense
          (including reasonable attorney fees) arising from your use of the Service, your
          violation of these Terms, or your investment decisions.
        </p>

        <h2 className="legal-h2">10. Modifications and Termination</h2>
        <p>
          These Terms may be updated at any time. Continued use after changes constitutes acceptance.
          The Service may be modified, suspended, or discontinued at any time without notice.
        </p>

        <h2 className="legal-h2">11. Governing Law</h2>
        <p>
          These Terms are governed by the laws of the State of California, USA, without regard to
          conflict-of-laws principles. Any dispute arising from these Terms or your use of the
          Service must be resolved in the courts of California.
        </p>

        <h2 className="legal-h2">12. Contact</h2>
        <p>
          For questions about these Terms, contact the operator at the email address provided at
          sign-up time, or via the GitHub repository linked from the application.
        </p>

        <div className="legal-footer-note">
          <strong>Reminder:</strong> this document is a template and is not legal advice. Before
          using Panko commercially, before charging money, before onboarding strangers, and before
          relying on these Terms in any dispute, have a licensed attorney in your jurisdiction
          review and customize them.
        </div>
      </div>

      <div className="legal-back-row">
        <button
          type="button"
          className="btn btn-secondary"
          onClick={() => setActiveTab("dashboard")}
        >
          ← Back to dashboard
        </button>
        <button
          type="button"
          className="btn btn-secondary"
          onClick={() => setActiveTab("privacy")}
        >
          Privacy Policy →
        </button>
      </div>
    </div>
  );
}
