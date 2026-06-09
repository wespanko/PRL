import { TrendingDown, AlertTriangle } from "lucide-react";
import { fmtMoney, fmtPct } from "../lib/format";

export default function OutlierAnalysis({ basic, outliers }) {
  return (
    <div className="rounded-xl border border-zinc-900 bg-zinc-950/60 p-6">
      <div className="flex items-center gap-2">
        <TrendingDown className="w-4 h-4 text-zinc-400" />
        <div className="text-xs uppercase tracking-wider text-zinc-500">Outlier dependence</div>
      </div>

      {outliers.warning && (
        <div className="mt-4 flex items-start gap-3 rounded-lg border border-amber-900/60 bg-amber-950/30 p-3 text-amber-200">
          <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
          <div className="text-sm">{outliers.warning}</div>
        </div>
      )}

      <div className="mt-4 grid grid-cols-2 gap-3">
        <Row label="Total P&L" value={fmtMoney(basic.totalPnl)} />
        <Row label="P&L excluding top trade" value={fmtMoney(outliers.pnlExclTop1)} />
        <Row label="P&L excluding top 3 trades" value={fmtMoney(outliers.pnlExclTop3)} />
        <Row label="% of gross profit from top 3" value={fmtPct(outliers.pctFromTop3)} />
      </div>

      <p className="mt-5 text-xs text-zinc-500 leading-relaxed">
        Outlier dependence measures how much of your profit comes from rare, oversized winners.
        High dependence means you cannot trust the size of your edge — a few missed trades wipe out the result.
      </p>
    </div>
  );
}

function Row({ label, value }) {
  return (
    <div className="rounded-lg border border-zinc-900 bg-zinc-950 p-3">
      <div className="text-[11px] text-zinc-500">{label}</div>
      <div className="mt-1 text-base font-semibold tabular-nums text-zinc-100">{value}</div>
    </div>
  );
}
