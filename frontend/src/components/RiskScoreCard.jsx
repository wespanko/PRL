export default function RiskScoreCard({ score, label, confidence }) {
  const ring =
    score >= 80 ? "stroke-emerald-400" :
    score >= 60 ? "stroke-emerald-500/80" :
    score >= 40 ? "stroke-amber-400" :
    score >= 20 ? "stroke-orange-400" : "stroke-rose-500";

  const circumference = 2 * Math.PI * 56;
  const dashOffset = circumference * (1 - score / 100);

  return (
    <div className="rounded-xl border border-zinc-900 bg-zinc-950/60 p-6 flex items-center gap-6">
      <div className="relative w-32 h-32 shrink-0">
        <svg viewBox="0 0 128 128" className="w-full h-full -rotate-90">
          <circle cx="64" cy="64" r="56" className="stroke-zinc-900 fill-none" strokeWidth="10" />
          <circle
            cx="64" cy="64" r="56"
            className={`fill-none ${ring}`}
            strokeWidth="10"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={dashOffset}
            style={{ transition: "stroke-dashoffset 700ms ease" }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <div className="text-3xl font-semibold tabular-nums">{score}</div>
          <div className="text-xs text-zinc-500">/ 100</div>
        </div>
      </div>
      <div className="min-w-0">
        <div className="text-xs uppercase tracking-wider text-zinc-500">Reality Check Score</div>
        <div className="mt-1 text-xl font-medium text-zinc-100">{label.label}</div>
        <div className="mt-3 text-sm text-zinc-400">
          <span className="text-zinc-300">{confidence.label}.</span> {confidence.note}
        </div>
      </div>
    </div>
  );
}
