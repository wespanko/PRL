export default function DisclaimerFooter({ setActiveTab }) {
  return (
    <footer className="disclaimer-footer">
      <div className="disclaimer-footer-inner">
        <div className="disclaimer-footer-strong">
          Educational tool · Not financial advice · No warranty
        </div>
        <div className="disclaimer-footer-body">
          Panko is provided <strong>"as is"</strong> for educational and informational purposes only.
          It is not investment advice, brokerage, or fiduciary service. Numbers are computed from
          historical price data — <strong>past performance does not guarantee future results</strong>.
          Forward-looking projections are mathematical models, not forecasts. All investing carries
          risk of loss including loss of principal. The operator accepts no liability for losses,
          gains, taxes, or decisions made based on this tool's output.{" "}
          <strong>Consult a licensed financial advisor before making investment decisions.</strong>
          {" "}All data stays in your browser.
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
      </div>
    </footer>
  );
}
