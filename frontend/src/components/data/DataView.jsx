import { useRef, useState } from "react";
import { Upload, CheckCircle2, AlertTriangle } from "lucide-react";
import Panel from "../layout/Panel";
import { getSampleSymbols, getBars } from "../../lib/sampleData";
import { parseBarCsv } from "../../lib/parseBars";

export default function DataView({ symbol, setSymbol, customBars, setCustomBars }) {
  const sample = getSampleSymbols();
  const [error, setError] = useState(null);
  const [status, setStatus] = useState(null);
  const inputRef = useRef(null);

  const onFile = (file) => {
    if (!file) return;
    setError(null);
    setStatus(null);
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const result = parseBarCsv(e.target.result);
        if (result.error) {
          setError(result.error);
          return;
        }
        if (!result.bars.length) {
          setError("No bars parsed.");
          return;
        }
        const sym = result.symbol || file.name.replace(/\.csv$/i, "");
        setCustomBars({ symbol: sym, bars: result.bars });
        setSymbol(sym);
        setStatus(`Loaded ${result.bars.length} bars for ${sym}`);
      } catch (err) {
        setError(err.message || "Could not parse the file.");
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="grid md:grid-cols-2 gap-4">
      <Panel title="SAMPLE UNIVERSE" sub="Synthetic daily bars built into the app.">
        <div className="space-y-1.5">
          {sample.map((s) => {
            const bars = getBars(s);
            const active = symbol === s;
            return (
              <button
                key={s}
                onClick={() => setSymbol(s)}
                className={`w-full flex items-center justify-between p-2.5 rounded border transition-all ${
                  active ? "border-amber-500/60 bg-amber-500/10" : "border-zinc-800 bg-zinc-950 hover:border-zinc-700"
                }`}
              >
                <span className="font-mono text-[12px] text-zinc-100 tracking-wider">{s}</span>
                <span className="font-mono text-[10px] text-zinc-500">
                  {bars.length} bars · {bars[0]?.date.toISOString().slice(0, 10)} → {bars[bars.length - 1]?.date.toISOString().slice(0, 10)}
                </span>
              </button>
            );
          })}
        </div>
        <p className="mt-3 text-[10px] font-mono text-zinc-600 leading-relaxed">
          MVP uses synthetic price series with realistic drift, vol, and regime shifts so the engine demo works without an API key.
          Real data via CSV upload (below) or a future backend.
        </p>
      </Panel>

      <Panel title="UPLOAD BARS" sub="CSV with daily OHLC + date + symbol (any column names work).">
        <label
          className="block border-2 border-dashed border-zinc-800 rounded p-8 text-center cursor-pointer hover:bg-zinc-900/40"
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => { e.preventDefault(); onFile(e.dataTransfer.files?.[0]); }}
        >
          <input ref={inputRef} type="file" accept=".csv" className="hidden" onChange={(e) => onFile(e.target.files?.[0])} />
          <Upload className="w-7 h-7 mx-auto text-zinc-500 mb-2" />
          <div className="font-mono text-[11px] tracking-wider text-zinc-300">DROP CSV OR CLICK</div>
          <div className="font-mono text-[10px] text-zinc-500 mt-1">date, open, high, low, close, volume</div>
        </label>

        {error && (
          <div className="mt-3 flex items-start gap-2 p-3 rounded border border-rose-900/50 bg-rose-950/30">
            <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0 text-rose-400" />
            <div className="text-[12px] text-rose-200">{error}</div>
          </div>
        )}
        {status && (
          <div className="mt-3 flex items-start gap-2 p-3 rounded border border-emerald-900/50 bg-emerald-950/30">
            <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0 text-emerald-400" />
            <div className="text-[12px] text-emerald-200">{status}</div>
          </div>
        )}

        {customBars && (
          <div className="mt-4 font-mono text-[11px] text-zinc-400">
            ACTIVE CUSTOM: <span className="text-amber-400">{customBars.symbol}</span> · {customBars.bars.length} bars
          </div>
        )}
      </Panel>
    </div>
  );
}
