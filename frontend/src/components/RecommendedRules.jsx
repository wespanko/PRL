import { ListChecks } from "lucide-react";

export default function RecommendedRules({ rules }) {
  if (!rules.length) return null;
  return (
    <div className="rounded-xl border border-zinc-900 bg-zinc-950/60 p-6">
      <div className="flex items-center gap-2">
        <ListChecks className="w-4 h-4 text-zinc-400" />
        <div className="text-xs uppercase tracking-wider text-zinc-500">Recommended rules</div>
      </div>
      <ol className="mt-4 space-y-2">
        {rules.map((r, i) => (
          <li key={i} className="flex items-start gap-3 text-sm text-zinc-200">
            <span className="text-xs font-mono text-zinc-500 mt-0.5">{String(i + 1).padStart(2, "0")}</span>
            <span className="leading-relaxed">{r}</span>
          </li>
        ))}
      </ol>
      <p className="mt-5 text-xs text-zinc-500 leading-relaxed">
        Rules are generated from patterns in your historical trades. They are starting points, not guarantees.
      </p>
    </div>
  );
}
