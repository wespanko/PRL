import { useRef, useState } from "react";
import { Upload, FileText, AlertTriangle, ArrowLeft } from "lucide-react";
import { parseCsv } from "../lib/parseTrades";

export default function CsvUploader({ onParsed, onBack, onTryDemo }) {
  const [error, setError] = useState(null);
  const [dragging, setDragging] = useState(false);
  const [parsing, setParsing] = useState(false);
  const inputRef = useRef(null);

  const handleFile = (file) => {
    if (!file) return;
    setError(null);
    setParsing(true);
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target.result;
        const result = parseCsv(text);
        if (result.fatal) {
          setError(result.fatal);
          setParsing(false);
          return;
        }
        if (!result.trades.length) {
          setError("No trades could be parsed from this file.");
          setParsing(false);
          return;
        }
        onParsed(result);
      } catch (err) {
        setError(err.message || "Could not parse the file.");
        setParsing(false);
      }
    };
    reader.onerror = () => {
      setError("Could not read the file.");
      setParsing(false);
    };
    reader.readAsText(file);
  };

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-zinc-900">
        <div className="max-w-6xl mx-auto px-6 py-5 flex items-center justify-between">
          <button onClick={onBack} className="inline-flex items-center gap-2 text-sm text-zinc-400 hover:text-zinc-200">
            <ArrowLeft className="w-4 h-4" /> Back
          </button>
          <div className="text-xs text-zinc-500">Analyzed in-browser. Never uploaded.</div>
        </div>
      </header>

      <div className="flex-1 flex items-center justify-center px-6 py-16">
        <div className="w-full max-w-2xl">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-semibold tracking-tight text-zinc-50">
              Upload your trade CSV
            </h2>
            <p className="mt-3 text-zinc-400">
              Most broker, prop firm, and journal exports work. We auto-detect common column names.
            </p>
          </div>

          <label
            onDragEnter={(e) => { e.preventDefault(); setDragging(true); }}
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragging(false);
              const file = e.dataTransfer.files?.[0];
              handleFile(file);
            }}
            className={`block border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-colors ${
              dragging
                ? "border-zinc-400 bg-zinc-900"
                : "border-zinc-800 bg-zinc-950 hover:bg-zinc-900/50"
            }`}
          >
            <input
              ref={inputRef}
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={(e) => handleFile(e.target.files?.[0])}
            />
            <Upload className="w-10 h-10 mx-auto text-zinc-500 mb-4" />
            <div className="text-zinc-200 font-medium">
              {parsing ? "Parsing…" : "Drop a CSV here or click to choose a file"}
            </div>
            <div className="mt-2 text-sm text-zinc-500">Max ~10 MB, typical broker exports.</div>
          </label>

          {error && (
            <div className="mt-6 flex items-start gap-3 p-4 rounded-lg border border-rose-900/50 bg-rose-950/30 text-rose-200">
              <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
              <div className="text-sm">{error}</div>
            </div>
          )}

          <div className="mt-8 p-5 rounded-lg border border-zinc-900 bg-zinc-950/50">
            <div className="flex items-start gap-3">
              <FileText className="w-4 h-4 mt-0.5 text-zinc-500" />
              <div className="text-sm text-zinc-400 leading-relaxed">
                <div className="text-zinc-300 mb-2 font-medium">Expected columns (any naming):</div>
                <p>date / time, symbol, side (long/short), quantity, entry price, exit price, net P&L, fees.</p>
                <p className="mt-2">
                  Net P&L is used directly when present. If not, we estimate from entry/exit/side and clearly mark it as
                  approximate.
                </p>
              </div>
            </div>
          </div>

          <div className="mt-6 text-center">
            <button onClick={onTryDemo} className="text-sm text-zinc-400 hover:text-zinc-200 underline underline-offset-4">
              Or try with sample data
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
