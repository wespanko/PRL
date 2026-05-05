export default function DisclaimerFooter({ setActiveTab }) {
  const year = new Date().getFullYear();
  return (
    <footer className="disclaimer-footer">
      <div className="disclaimer-footer-inner">
        <div className="disclaimer-footer-strong">
          Educational tool · Not financial advice · No warranty
        </div>
        <div className="disclaimer-footer-body">
          Panko is provided <strong>"as is"</strong> by <strong>Panko Financial Strategies LLC</strong>{" "}
          for educational and informational purposes only. It is not investment advice, brokerage,
          or fiduciary service. Panko Financial Strategies LLC is <strong>not a registered
          investment adviser</strong> under the Investment Advisers Act of 1940. Numbers are
          computed from historical price data — <strong>past performance does not guarantee future
          results</strong>. Forward-looking projections are mathematical models, not forecasts.
          All investing carries risk of loss including loss of principal. The operator accepts no
          liability for losses, gains, taxes, or decisions made based on this tool's output.{" "}
          <strong>Consult a licensed financial advisor before making investment decisions.</strong>
        </div>
        {setActiveTab && (
          <div className="disclaimer-footer-links">
            <button type="button" onClick={() => setActiveTab("terms")}>Terms of Service</button>
            <span className="disclaimer-footer-link-divider">·</span>
            <button type="button" onClick={() => setActiveTab("privacy")}>Privacy Policy</button>
            <span className="disclaimer-footer-link-divider">·</span>
            <button type="button" onClick={() => setActiveTab("learn")}>Methodology (Learn tab)</button>
          </div>
        )}
        <div className="disclaimer-footer-copyright">
          © {year} Panko Financial Strategies LLC · All rights reserved
        </div>
      </div>
    </footer>
  );
}
