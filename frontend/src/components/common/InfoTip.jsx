import { useState } from "react";
import { Info } from "lucide-react";

export default function InfoTip({ text, children, side = "top" }) {
  const [open, setOpen] = useState(false);
  return (
    <span className="relative inline-flex items-center gap-1">
      {children}
      <button
        type="button"
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        className="text-zinc-600 hover:text-amber-400 transition-colors"
        aria-label="More info"
      >
        <Info className="w-3 h-3" />
      </button>
      {open && (
        <span
          className={`absolute z-30 w-64 rounded border border-zinc-700 bg-zinc-900 px-2.5 py-2 text-[11px] text-zinc-200 leading-relaxed shadow-xl ${
            side === "top" ? "bottom-full mb-1" : "top-full mt-1"
          } left-1/2 -translate-x-1/2 pointer-events-none`}
        >
          {text}
        </span>
      )}
    </span>
  );
}
