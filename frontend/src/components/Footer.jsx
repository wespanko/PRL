export default function Footer() {
  return (
    <footer className="border-t border-zinc-900 mt-4">
      <div className="max-w-6xl mx-auto px-5 py-4 font-mono text-[10px] text-zinc-600 leading-relaxed">
        <p>
          PANKO PREDICTION TERMINAL surfaces prediction-market data from public Polymarket APIs for analytical and educational purposes.
          No trading signals, no betting advice, no guarantees of accuracy or availability. Data may be stale, incomplete, or
          unavailable from your network — verify on Polymarket before acting. Prediction markets are geoblocked in some
          jurisdictions; check local rules before trading.
        </p>
      </div>
    </footer>
  );
}
