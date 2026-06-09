export default function Footer() {
  return (
    <footer className="border-t border-zinc-900 mt-16">
      <div className="max-w-6xl mx-auto px-6 py-10 text-xs text-zinc-500 leading-relaxed">
        <p>
          Trade Reality Check is an educational analytics tool. It does not provide trading signals,
          investment recommendations, financial advice, or guarantees of future performance.
          All results are based on historical data provided by the user.
        </p>
        <p className="mt-3 text-zinc-600">© {new Date().getFullYear()} Trade Reality Check.</p>
      </div>
    </footer>
  );
}
