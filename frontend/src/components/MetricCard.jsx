export default function MetricCard({ label, value, sublabel, tone = "neutral" }) {
  const toneClass =
    tone === "positive" ? "text-emerald-400" :
    tone === "negative" ? "text-rose-400" :
    tone === "warn" ? "text-amber-400" :
    "text-zinc-100";

  return (
    <div className="rounded-xl border border-zinc-900 bg-zinc-950/60 p-5">
      <div className="text-xs uppercase tracking-wider text-zinc-500">{label}</div>
      <div className={`mt-2 text-2xl font-semibold tabular-nums ${toneClass}`}>
        {value}
      </div>
      {sublabel && <div className="mt-1 text-xs text-zinc-500">{sublabel}</div>}
    </div>
  );
}
