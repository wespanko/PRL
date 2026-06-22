import { useState, useMemo } from "react";
import { ArrowLeft, ExternalLink } from "lucide-react";
import Panel from "../layout/Panel";
import InfoTip from "../common/InfoTip";
import { evYes, kellyFraction, annualizedEdgeReturn } from "../../lib/polymarket";
import { fmtCents, fmtCompact, fmtDaysUntil, fmtPct, fmtMoney, daysUntil } from "../../lib/format";
import { GLOSSARY } from "../../lib/glossary";

export default function MarketDetail({ market, onBack }) {
  const [myProb, setMyProb] = useState(market?.yesPrice ? Math.min(0.99, market.yesPrice + 0.05) : 0.5);
  const [bankroll, setBankroll] = useState(10000);
  const [kellyMult, setKellyMult] = useState(0.25);

  const calc = useMemo(() => {
    if (!market || market.yesPrice === null) return null;
    const edge = evYes(myProb, market.yesPrice);
    const ev = (myProb / market.yesPrice) - 1;
    const kf = kellyFraction(myProb, market.yesPrice);
    const adjKf = kf * kellyMult;
    const stake = bankroll * adjKf;
    const payoffIfYes = stake / market.yesPrice;
    const profitIfYes = payoffIfYes - stake;
    const lossIfNo = stake;
    const expProfit = myProb * profitIfYes - (1 - myProb) * lossIfNo;
    const dte = daysUntil(market.endDate) || 1;
    const annlReturn = annualizedEdgeReturn(myProb, market.yesPrice, dte);
    return { edge, ev, kf, adjKf, stake, payoffIfYes, profitIfYes, lossIfNo, expProfit, dte, annlReturn };
  }, [market, myProb, market?.yesPrice, bankroll, kellyMult]);

  if (!market) {
    return (
      <Panel title="NO MARKET SELECTED">
        <div className="text-[12px] text-zinc-500">Pick a market from MARKETS to deep-dive.</div>
      </Panel>
    );
  }

  return (
    <div className="space-y-4">
      <button onClick={onBack} className="inline-flex items-center gap-1.5 font-mono text-[11px] tracking-wider text-zinc-400 hover:text-amber-400">
        <ArrowLeft className="w-3.5 h-3.5" /> ALL MARKETS
      </button>

      <Panel
        title={market.category?.toUpperCase() || "MARKET"}
        sub={market.question}
        right={
          <a href={`https://polymarket.com/market/${market.slug}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 font-mono text-[11px] text-zinc-400 hover:text-amber-400">
            VIEW ON POLYMARKET <ExternalLink className="w-3 h-3" />
          </a>
        }
      >
        <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-zinc-900">
          <Stat label="YES PRICE" value={fmtCents(market.yesPrice)} tone="text-emerald-400" tip="yesPrice" />
          <Stat label="NO PRICE" value={fmtCents(market.noPrice)} tone="text-rose-400" tip="noPrice" />
          <Stat label="BASIS (Y+N-1)" value={market.yesNoBasis !== null ? `${(market.yesNoBasis * 100).toFixed(2)}¢` : "—"} tone={Math.abs(market.yesNoBasis ?? 0) > 0.02 ? "text-amber-400" : "text-zinc-300"} tip="basis" />
          <Stat label="RESOLVES" value={fmtDaysUntil(market.endDate)} sub={market.endDate?.toISOString().slice(0, 10)} />
          <Stat label="24H VOL" value={`$${fmtCompact(market.volume24hr)}`} tip="volume24h" />
          <Stat label="TOTAL VOL" value={`$${fmtCompact(market.volume)}`} tip="volume" />
          <Stat label="LIQUIDITY" value={`$${fmtCompact(market.liquidity)}`} tip="liquidity" />
          <Stat label="IMPLIED PROB" value={fmtPct(market.yesPrice ?? 0)} sub="Same as YES price" />
        </div>
        {market.description && (
          <p className="mt-4 text-[12px] text-zinc-400 leading-relaxed whitespace-pre-wrap">{market.description}</p>
        )}
      </Panel>

      <Panel title="EDGE & KELLY · YOUR VIEW" sub="Enter the probability you assign to YES. The terminal computes edge, EV, and Kelly stake.">
        <div className="grid md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div>
              <div className="flex justify-between items-baseline mb-1">
                <label className="font-mono text-[10px] tracking-widest text-zinc-500">YOUR P(YES)</label>
                <span className="font-mono text-[14px] text-amber-400 tabular-nums">{fmtPct(myProb, { decimals: 1 })}</span>
              </div>
              <input
                type="range"
                min="0.01" max="0.99" step="0.005"
                value={myProb}
                onChange={(e) => setMyProb(Number(e.target.value))}
                className="w-full accent-amber-500"
              />
              <div className="flex justify-between font-mono text-[10px] text-zinc-600 mt-1">
                <span>1%</span><span>50%</span><span>99%</span>
              </div>
            </div>
            <NumberField label="BANKROLL ($)" value={bankroll} onChange={setBankroll} step={500} />
            <div>
              <div className="flex justify-between items-baseline mb-1">
                <label className="font-mono text-[10px] tracking-widest text-zinc-500">KELLY MULTIPLIER</label>
                <span className="font-mono text-[14px] text-amber-400 tabular-nums">{kellyMult.toFixed(2)}x</span>
              </div>
              <input
                type="range" min="0.05" max="1" step="0.05"
                value={kellyMult}
                onChange={(e) => setKellyMult(Number(e.target.value))}
                className="w-full accent-amber-500"
              />
              <div className="flex justify-between font-mono text-[10px] text-zinc-600 mt-1">
                <span>1/20</span><span>1/2</span><span>FULL</span>
              </div>
              <div className="text-[10px] font-mono text-zinc-500 mt-1.5">Pros typically use 1/4 to 1/2 Kelly to reduce volatility.</div>
            </div>
          </div>

          <div className="space-y-2 font-mono text-[11px]">
            <Row label={<InfoTip text={GLOSSARY.edge}><span>EDGE</span></InfoTip>} value={`${(calc.edge * 100).toFixed(1)}¢`} tone={calc.edge > 0 ? "text-emerald-400" : "text-rose-400"} />
            <Row label={<InfoTip text={GLOSSARY.ev}><span>EV PER $1</span></InfoTip>} value={fmtPct(calc.ev, { decimals: 1 })} tone={calc.ev > 0 ? "text-emerald-400" : "text-rose-400"} />
            <Row label={<InfoTip text={GLOSSARY.kelly}><span>FULL KELLY %</span></InfoTip>} value={fmtPct(calc.kf, { decimals: 1 })} />
            <Row label={`${kellyMult.toFixed(2)}× KELLY %`} value={fmtPct(calc.adjKf, { decimals: 1 })} tone="text-amber-400" />
            <Row label="RECOMMENDED STAKE" value={fmtMoney(calc.stake, { decimals: 0 })} tone="text-amber-400" />
            <Row label="PAYOFF IF YES" value={fmtMoney(calc.payoffIfYes, { decimals: 0 })} />
            <Row label="PROFIT IF YES" value={fmtMoney(calc.profitIfYes, { decimals: 0 })} tone="text-emerald-400" />
            <Row label="LOSS IF NO" value={`-${fmtMoney(calc.lossIfNo, { decimals: 0 })}`} tone="text-rose-400" />
            <Row label="EXPECTED PROFIT" value={fmtMoney(calc.expProfit, { decimals: 0 })} tone={calc.expProfit > 0 ? "text-emerald-400" : "text-rose-400"} />
            <Row label="ANNL EDGE RETURN" value={fmtPct(calc.annlReturn)} sub={`Over ~${Math.max(0, Math.round(calc.dte))} days to resolve`} />
          </div>
        </div>

        {calc.edge <= 0 && (
          <div className="mt-4 pt-4 border-t border-zinc-900 text-[11px] text-zinc-500 leading-relaxed">
            Your probability is below the market price — Kelly recommends NOT betting YES. Consider buying NO instead (mirror calc), or move on.
          </div>
        )}
      </Panel>
    </div>
  );
}

function Stat({ label, value, sub, tone = "text-zinc-100", tip }) {
  return (
    <div className="bg-zinc-950 p-3">
      <div className="font-mono text-[10px] tracking-widest text-zinc-500">
        {tip ? <InfoTip text={GLOSSARY[tip] || ""}><span>{label}</span></InfoTip> : label}
      </div>
      <div className={`mt-1.5 font-mono text-lg tabular-nums ${tone}`}>{value}</div>
      {sub && <div className="font-mono text-[10px] text-zinc-500 mt-0.5">{sub}</div>}
    </div>
  );
}

function NumberField({ label, value, onChange, step }) {
  return (
    <label className="block">
      <div className="font-mono text-[10px] tracking-widest text-zinc-500 mb-1">{label}</div>
      <input
        type="number"
        value={value}
        step={step}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full bg-zinc-950 border border-zinc-800 rounded px-2 py-1.5 font-mono text-[12px] text-zinc-100 tabular-nums focus:outline-none focus:border-amber-500"
      />
    </label>
  );
}

function Row({ label, value, tone, sub }) {
  return (
    <div className="border-b border-zinc-900/60 py-1.5">
      <div className="flex justify-between">
        <span className="text-zinc-500 tracking-widest">{label}</span>
        <span className={`tabular-nums ${tone || "text-zinc-200"}`}>{value}</span>
      </div>
      {sub && <div className="text-[10px] text-zinc-600 mt-0.5">{sub}</div>}
    </div>
  );
}
