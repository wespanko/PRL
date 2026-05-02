export default function DisclaimerFooter() {
  return (
    <footer className="disclaimer-footer">
      <div className="disclaimer-footer-inner">
        <div className="disclaimer-footer-strong">
          Educational tool · Not financial advice
        </div>
        <div className="disclaimer-footer-body">
          Panko provides quantitative portfolio analysis for educational purposes. Numbers
          are computed from historical price data and are <strong>not predictions</strong>.
          Past performance does not guarantee future results. The Improve and Thesis tabs
          surface mechanical structural alternatives — they are not investment recommendations
          tailored to you. Consult a licensed financial advisor before making investment
          decisions. All data stays in your browser.
        </div>
      </div>
    </footer>
  );
}
