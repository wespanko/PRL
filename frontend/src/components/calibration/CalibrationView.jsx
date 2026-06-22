import { useState, useEffect, useMemo } from "react";
import { Plus, Trash2, Download, Upload } from "lucide-react";
import { ScatterChart, Scatter, XAxis, YAxis, ResponsiveContainer, Tooltip as RTooltip, ReferenceLine, Line, ComposedChart } from "recharts";
import Panel from "../layout/Panel";
import InfoTip from "../common/InfoTip";
import { brierScore, logLoss, expectedCalibrationError, calibrationBuckets, accuracy, brierSkill } from "../../lib/calibration";
import { fmtNum, fmtPct } from "../../lib/format";
import { GLOSSARY } from "../../lib/glossary";

const STORAGE_KEY = "pkn_calibration_v1";

function loadStored() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const arr = JSON.parse(raw);
    return arr.map((b) => ({ ...b, date: b.date ? new Date(b.date) : null }));
  } catch { return null; }
}

function persist(bets) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(bets.map((b) => ({ ...b, date: b.date ? b.date.toISOString() : null }))));
  } catch { /* ignore */ }
}

const SAMPLE = [
  { label: "BTC > $100k by EOY", forecast: 0.65, outcome: 1, date: new Date("2026-01-12") },
  { label: "Fed cuts at March FOMC", forecast: 0.40, outcome: 0, date: new Date("2026-03-19") },
  { label: "Lakers make playoffs", forecast: 0.55, outcome: 1, date: new Date("2026-04-14") },
  { label: "Nvidia earnings beat", forecast: 0.78, outcome: 1, date: new Date("2026-02-21") },
  { label: "Bitcoin halving rally > 50%", forecast: 0.30, outcome: 0, date: new Date("2026-04-30") },
  { label: "SPY hits 600", forecast: 0.45, outcome: 1, date: new Date("2026-05-22") },
  { label: "GTA VI delayed past 2026", forecast: 0.60, outcome: 0, date: new Date("2026-06-01") },
  { label: "Trump approval > 50%", forecast: 0.25, outcome: 0, date: new Date("2026-06-15") },
  { label: "OpenAI GPT-5 release H1", forecast: 0.70, outcome: 0, date: new Date("2026-06-30") },
  { label: "Recession declared 2026", forecast: 0.20, outcome: 0, date: new Date("2026-06-30") },
  { label: "ETH > $5k by Q3", forecast: 0.55, outcome: 1, date: new Date("2026-06-30") },
  { label: "Rate cut in June", forecast: 0.85, outcome: 1, date: new Date("2026-06-18") },
];

export default function CalibrationView() {
  const [bets, setBets] = useState(() => loadStored() || SAMPLE);
  const [draft, setDraft] = useState({ label: "", forecast: 0.5, outcome: 1, date: new Date().toISOString().slice(0, 10) });

  useEffect(() => { persist(bets); }, [bets]);

  const stats = useMemo(() => ({
    n: bets.length,
    brier: brierScore(bets),
    logLoss: logLoss(bets),
    ece: expectedCalibrationError(bets),
    accuracy: accuracy(bets),
    skill: brierSkill(bets),
  }), [bets]);

  const buckets = useMemo(() => calibrationBuckets(bets), [bets]);
  const plotData = useMemo(() =>
    buckets.filter((b) => b.count > 0).map((b) => ({
      forecast: b.avgForecast * 100,
      realized: b.realized * 100,
      count: b.count,
      bucket: b.bucket,
    })),
    [buckets]
  );

  const addBet = () => {
    if (!draft.label.trim()) return;
    setBets([...bets, {
      label: draft.label.trim(),
      forecast: Number(draft.forecast),
      outcome: Number(draft.outcome),
      date: draft.date ? new Date(draft.date) : null,
    }]);
    setDraft({ label: "", forecast: 0.5, outcome: 1, date: new Date().toISOString().slice(0, 10) });
  };

  const removeBet = (i) => setBets(bets.filter((_, idx) => idx !== i));
  const clearAll = () => { if (confirm("Clear all logged bets?")) setBets([]); };
  const loadSample = () => setBets(SAMPLE);

  const exportCsv = () => {
    const rows = [["label", "forecast", "outcome", "date"]];
    bets.forEach((b) => rows.push([
      b.label.replaceAll(",", " "),
      b.forecast.toString(),
      b.outcome.toString(),
      b.date ? b.date.toISOString().slice(0, 10) : "",
    ]));
    const csv = rows.map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "calibration.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      <Panel title="CALIBRATION · YOUR FORECASTS vs OUTCOMES" sub="Log your past bets with the probability you assigned and what actually happened. The terminal computes Brier, log loss, ECE, and your calibration curve.">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-px bg-zinc-900">
          <Stat label="# BETS" value={stats.n} />
          <Stat label={<InfoTip text={GLOSSARY.brier}><span>BRIER SCORE</span></InfoTip>} value={fmtNum(stats.brier, { decimals: 4 })} tone={stats.brier !== null && stats.brier < 0.2 ? "text-emerald-400" : stats.brier !== null && stats.brier < 0.25 ? "text-amber-400" : "text-rose-400"} sub="Lower better. <0.20 = strong" />
          <Stat label={<InfoTip text={GLOSSARY.logLoss}><span>LOG LOSS</span></InfoTip>} value={fmtNum(stats.logLoss, { decimals: 4 })} sub="Lower better" />
          <Stat label={<InfoTip text={GLOSSARY.ece}><span>ECE</span></InfoTip>} value={fmtPct(stats.ece, { decimals: 1 })} tone={stats.ece !== null && stats.ece < 0.05 ? "text-emerald-400" : "text-amber-400"} sub="<5% well-calibrated" />
          <Stat label={<InfoTip text={GLOSSARY.brierSkill}><span>BRIER SKILL</span></InfoTip>} value={fmtPct(stats.skill, { decimals: 1, sign: true })} tone={stats.skill > 0 ? "text-emerald-400" : "text-rose-400"} sub="Above 0 = beats 50/50" />
        </div>

        <div className="grid md:grid-cols-2 gap-6 mt-4">
          <div>
            <div className="font-mono text-[10px] tracking-widest text-zinc-500 mb-2">CALIBRATION CURVE</div>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={plotData} margin={{ top: 6, right: 12, bottom: 24, left: 0 }}>
                  <XAxis type="number" dataKey="forecast" domain={[0, 100]} stroke="#52525b" fontSize={10} tickFormatter={(v) => `${v}%`} label={{ value: "Your forecast", position: "insideBottom", offset: -8, fill: "#71717a", fontSize: 10 }} />
                  <YAxis type="number" dataKey="realized" domain={[0, 100]} stroke="#52525b" fontSize={10} tickFormatter={(v) => `${v}%`} label={{ value: "Actual rate", angle: -90, position: "insideLeft", fill: "#71717a", fontSize: 10 }} />
                  <RTooltip
                    contentStyle={{ background: "#09090b", border: "1px solid #27272a", borderRadius: 4, fontSize: 11, fontFamily: "ui-monospace,Menlo,Consolas,monospace" }}
                    formatter={(v, name, p) => name === "realized" ? [`${v.toFixed(1)}%`, `Hit rate (n=${p.payload.count})`] : [`${v.toFixed(1)}%`, "Forecast avg"]}
                  />
                  <ReferenceLine segment={[{ x: 0, y: 0 }, { x: 100, y: 100 }]} stroke="#3f3f46" strokeDasharray="3 3" />
                  <Scatter data={plotData} fill="#fbbf24" />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
            <p className="text-[10px] font-mono text-zinc-500 mt-2 text-center">
              Diagonal = perfect calibration. Above = you under-bet your hits. Below = you over-bet.
            </p>
          </div>

          <div>
            <div className="font-mono text-[10px] tracking-widest text-zinc-500 mb-2">BUCKETS</div>
            <table className="w-full font-mono text-[11px]">
              <thead>
                <tr className="text-zinc-500 tracking-widest border-b border-zinc-900">
                  <th className="text-left py-1.5">BUCKET</th>
                  <th className="text-right py-1.5">N</th>
                  <th className="text-right py-1.5">AVG FCST</th>
                  <th className="text-right py-1.5">REALIZED</th>
                  <th className="text-right py-1.5">GAP</th>
                </tr>
              </thead>
              <tbody>
                {buckets.map((b) => {
                  const gap = b.realized !== null && b.avgForecast !== null ? b.realized - b.avgForecast : null;
                  return (
                    <tr key={b.bucket} className="border-b border-zinc-900/60">
                      <td className="py-1.5 text-zinc-400">{b.bucket}</td>
                      <td className="py-1.5 text-right text-zinc-300">{b.count || "—"}</td>
                      <td className="py-1.5 text-right tabular-nums text-zinc-300">{b.avgForecast !== null ? fmtPct(b.avgForecast) : "—"}</td>
                      <td className="py-1.5 text-right tabular-nums text-zinc-300">{b.realized !== null ? fmtPct(b.realized) : "—"}</td>
                      <td className={`py-1.5 text-right tabular-nums ${gap === null ? "text-zinc-500" : Math.abs(gap) < 0.05 ? "text-emerald-400" : "text-rose-400"}`}>
                        {gap !== null ? `${gap >= 0 ? "+" : ""}${(gap * 100).toFixed(0)}%` : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </Panel>

      <Panel title="ADD A BET" sub="Stored in your browser only (localStorage). Nothing uploaded.">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-2 items-end">
          <div className="md:col-span-2">
            <div className="font-mono text-[10px] tracking-widest text-zinc-500 mb-1">QUESTION</div>
            <input
              value={draft.label}
              onChange={(e) => setDraft({ ...draft, label: e.target.value })}
              placeholder="What was the question?"
              className="w-full bg-zinc-950 border border-zinc-800 rounded px-2 py-1.5 font-mono text-[12px] text-zinc-100 focus:outline-none focus:border-amber-500"
            />
          </div>
          <div>
            <div className="font-mono text-[10px] tracking-widest text-zinc-500 mb-1">YOUR P(YES)</div>
            <input
              type="number" min="0" max="1" step="0.01"
              value={draft.forecast}
              onChange={(e) => setDraft({ ...draft, forecast: Number(e.target.value) })}
              className="w-full bg-zinc-950 border border-zinc-800 rounded px-2 py-1.5 font-mono text-[12px] text-zinc-100 tabular-nums focus:outline-none focus:border-amber-500"
            />
          </div>
          <div>
            <div className="font-mono text-[10px] tracking-widest text-zinc-500 mb-1">OUTCOME</div>
            <select
              value={draft.outcome}
              onChange={(e) => setDraft({ ...draft, outcome: Number(e.target.value) })}
              className="w-full bg-zinc-950 border border-zinc-800 rounded px-2 py-1.5 font-mono text-[12px] text-zinc-100"
            >
              <option value={1}>YES</option>
              <option value={0}>NO</option>
            </select>
          </div>
          <div>
            <div className="font-mono text-[10px] tracking-widest text-zinc-500 mb-1">DATE</div>
            <input
              type="date"
              value={draft.date}
              onChange={(e) => setDraft({ ...draft, date: e.target.value })}
              className="w-full bg-zinc-950 border border-zinc-800 rounded px-2 py-1.5 font-mono text-[12px] text-zinc-100 focus:outline-none focus:border-amber-500"
            />
          </div>
        </div>
        <div className="flex flex-wrap gap-2 mt-3">
          <button onClick={addBet} className="inline-flex items-center gap-1.5 font-mono text-[11px] tracking-wider bg-amber-500 hover:bg-amber-400 text-black px-3 py-1.5 rounded">
            <Plus className="w-3 h-3" /> ADD
          </button>
          <button onClick={loadSample} className="inline-flex items-center gap-1.5 font-mono text-[11px] tracking-wider text-zinc-400 hover:text-amber-400 border border-zinc-800 px-3 py-1.5 rounded">
            LOAD SAMPLE
          </button>
          <button onClick={exportCsv} className="inline-flex items-center gap-1.5 font-mono text-[11px] tracking-wider text-zinc-400 hover:text-amber-400 border border-zinc-800 px-3 py-1.5 rounded">
            <Download className="w-3 h-3" /> EXPORT CSV
          </button>
          <button onClick={clearAll} className="ml-auto inline-flex items-center gap-1.5 font-mono text-[11px] tracking-wider text-rose-400 hover:text-rose-300 border border-zinc-800 px-3 py-1.5 rounded">
            <Trash2 className="w-3 h-3" /> CLEAR ALL
          </button>
        </div>
      </Panel>

      <Panel title={`LOG · ${bets.length} BETS`}>
        <div className="overflow-x-auto">
          <table className="w-full font-mono text-[11px]">
            <thead>
              <tr className="text-zinc-500 tracking-widest border-b border-zinc-900">
                <th className="text-left py-2 px-2">#</th>
                <th className="text-left py-2 px-2">DATE</th>
                <th className="text-left py-2 px-2">QUESTION</th>
                <th className="text-right py-2 px-2">YOUR P(YES)</th>
                <th className="text-right py-2 px-2">OUTCOME</th>
                <th className="text-right py-2 px-2">BRIER</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {bets.map((b, i) => {
                const bs = (b.forecast - b.outcome) ** 2;
                return (
                  <tr key={i} className="border-b border-zinc-900/60">
                    <td className="py-1.5 px-2 text-zinc-500">{i + 1}</td>
                    <td className="py-1.5 px-2 text-zinc-400">{b.date ? b.date.toISOString().slice(0, 10) : "—"}</td>
                    <td className="py-1.5 px-2 text-zinc-200 truncate max-w-[360px]">{b.label}</td>
                    <td className="py-1.5 px-2 text-right tabular-nums text-zinc-300">{fmtPct(b.forecast)}</td>
                    <td className={`py-1.5 px-2 text-right ${b.outcome === 1 ? "text-emerald-400" : "text-rose-400"}`}>{b.outcome === 1 ? "YES" : "NO"}</td>
                    <td className="py-1.5 px-2 text-right tabular-nums text-zinc-400">{bs.toFixed(3)}</td>
                    <td className="py-1.5 px-2 text-right">
                      <button onClick={() => removeBet(i)} className="text-zinc-600 hover:text-rose-400">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                );
              })}
              {!bets.length && (
                <tr><td colSpan={7} className="py-8 text-center text-zinc-500">No bets logged. Add one above or LOAD SAMPLE.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  );
}

function Stat({ label, value, sub, tone = "text-zinc-100" }) {
  return (
    <div className="bg-zinc-950 p-3">
      <div className="font-mono text-[10px] tracking-widest text-zinc-500">{label}</div>
      <div className={`mt-1.5 font-mono text-lg tabular-nums ${tone}`}>{value ?? "—"}</div>
      {sub && <div className="font-mono text-[10px] text-zinc-500 mt-0.5">{sub}</div>}
    </div>
  );
}
