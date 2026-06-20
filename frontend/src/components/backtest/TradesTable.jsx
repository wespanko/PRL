import { fmtMoney } from "../../lib/format";

export default function TradesTable({ trades }) {
  if (!trades.length) return <div className="text-zinc-500 text-[12px]">No trades.</div>;
  const recent = trades.slice(-25).reverse();
  return (
    <div className="overflow-x-auto">
      <table className="w-full font-mono text-[11px]">
        <thead>
          <tr className="text-zinc-500 tracking-widest border-b border-zinc-900">
            <th className="text-left py-2 px-2">#</th>
            <th className="text-left py-2 px-2">ENTRY</th>
            <th className="text-left py-2 px-2">EXIT</th>
            <th className="text-right py-2 px-2">QTY</th>
            <th className="text-right py-2 px-2">ENTRY PX</th>
            <th className="text-right py-2 px-2">EXIT PX</th>
            <th className="text-right py-2 px-2">DAYS</th>
            <th className="text-right py-2 px-2">NET P&L</th>
          </tr>
        </thead>
        <tbody>
          {recent.map((t, i) => (
            <tr key={i} className="border-b border-zinc-900/60 hover:bg-zinc-900/40">
              <td className="py-1.5 px-2 text-zinc-500">{trades.length - i}</td>
              <td className="py-1.5 px-2 text-zinc-300">{t.entryDate.toISOString().slice(0, 10)}</td>
              <td className="py-1.5 px-2 text-zinc-300">{t.date.toISOString().slice(0, 10)}</td>
              <td className="py-1.5 px-2 text-right text-zinc-300 tabular-nums">{t.quantity}</td>
              <td className="py-1.5 px-2 text-right text-zinc-300 tabular-nums">{t.entry.toFixed(2)}</td>
              <td className="py-1.5 px-2 text-right text-zinc-300 tabular-nums">{t.exit.toFixed(2)}</td>
              <td className="py-1.5 px-2 text-right text-zinc-500 tabular-nums">{t.duration}</td>
              <td className={`py-1.5 px-2 text-right tabular-nums ${t.netPnl >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                {fmtMoney(t.netPnl)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {trades.length > 25 && (
        <div className="text-[10px] font-mono text-zinc-500 mt-2 text-right">
          Showing last 25 of {trades.length} trades
        </div>
      )}
    </div>
  );
}
