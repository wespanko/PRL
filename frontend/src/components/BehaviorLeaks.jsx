import { AlertTriangle, AlertCircle, Info, CheckCircle2 } from "lucide-react";

const SEV = {
  high: { ring: "border-rose-900/60", bg: "bg-rose-950/30", text: "text-rose-300", icon: AlertTriangle, label: "High" },
  medium: { ring: "border-amber-900/60", bg: "bg-amber-950/30", text: "text-amber-300", icon: AlertCircle, label: "Medium" },
  low: { ring: "border-zinc-800", bg: "bg-zinc-900/40", text: "text-zinc-300", icon: Info, label: "Low" },
};

export default function BehaviorLeaks({ leaks }) {
  if (!leaks.length) {
    return (
      <div className="rounded-xl border border-zinc-900 bg-zinc-950/60 p-6">
        <SectionTitle>Behavior Leaks</SectionTitle>
        <div className="mt-4 flex items-start gap-3 text-emerald-300">
          <CheckCircle2 className="w-5 h-5 mt-0.5" />
          <div className="text-sm">
            No major behavior leaks detected at this sample size. Keep tracking — patterns can emerge later.
          </div>
        </div>
      </div>
    );
  }
  return (
    <div className="rounded-xl border border-zinc-900 bg-zinc-950/60 p-6">
      <SectionTitle>Behavior Leaks</SectionTitle>
      <div className="mt-4 space-y-3">
        {leaks.map((l) => {
          const s = SEV[l.severity] || SEV.low;
          const Icon = s.icon;
          return (
            <div key={l.id} className={`rounded-lg border ${s.ring} ${s.bg} p-4`}>
              <div className="flex items-start gap-3">
                <Icon className={`w-4 h-4 mt-0.5 shrink-0 ${s.text}`} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <div className="text-sm font-medium text-zinc-100">{l.title}</div>
                    <span className={`text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded ${s.text} border ${s.ring}`}>
                      {s.label}
                    </span>
                  </div>
                  <p className="mt-1.5 text-sm text-zinc-400 leading-relaxed">{l.explanation}</p>
                  <p className="mt-2 text-sm text-zinc-300">
                    <span className="text-zinc-500">Suggested rule: </span>{l.suggestedRule}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function SectionTitle({ children }) {
  return <div className="text-xs uppercase tracking-wider text-zinc-500">{children}</div>;
}
