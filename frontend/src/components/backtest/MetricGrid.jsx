import InfoTip from "../common/InfoTip";
import { GLOSSARY } from "../../lib/glossary";

export default function MetricGrid({ metrics }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-zinc-900">
      {metrics.map((m) => (
        <div key={m.key} className="bg-zinc-950 p-3">
          <div className="flex items-center justify-between font-mono text-[10px] tracking-widest text-zinc-500">
            <InfoTip text={GLOSSARY[m.tip] || m.tipText || ""}>
              <span>{m.label}</span>
            </InfoTip>
            {m.suffix && <span className="text-zinc-600">{m.suffix}</span>}
          </div>
          <div className={`mt-1.5 font-mono text-lg tabular-nums ${m.tone || "text-zinc-100"}`}>
            {m.value}
          </div>
          {m.sub && <div className="font-mono text-[10px] text-zinc-500 mt-0.5">{m.sub}</div>}
        </div>
      ))}
    </div>
  );
}
