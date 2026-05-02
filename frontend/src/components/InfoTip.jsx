import { useState, useRef, useEffect } from "react";
import { getMetric } from "../data/metricsLibrary";

/**
 * Small "?" icon that opens a popover with a metric's one-liner.
 * Click ↗ takes the user to the Learn tab anchored at this metric.
 *
 * Props:
 *   metric    — id from metricsLibrary (e.g. "sharpe_ratio")
 *   onLearnMore — optional callback (id) => void; if provided, shown as "Learn more →"
 */
export default function InfoTip({ metric, onLearnMore, side = "top" }) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);
  const data = getMetric(metric);

  useEffect(() => {
    if (!open) return;
    function onClick(e) {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    }
    function onKey(e) { if (e.key === "Escape") setOpen(false); }
    window.addEventListener("mousedown", onClick);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("mousedown", onClick);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  if (!data) return null;

  return (
    <span className="infotip-wrap" ref={wrapRef}>
      <button
        type="button"
        className={`infotip-trigger ${open ? "infotip-trigger--open" : ""}`}
        onClick={(e) => { e.stopPropagation(); setOpen((v) => !v); }}
        aria-label={`What is ${data.label}?`}
      >
        ?
      </button>
      {open && (
        <div className={`infotip-popover infotip-popover--${side}`} role="dialog">
          <div className="infotip-title">{data.label}</div>
          <div className="infotip-body">{data.oneLiner}</div>
          {data.range && (
            <div className="infotip-range">
              <span className="infotip-range-label">Typical:</span> {data.range}
            </div>
          )}
          {onLearnMore && (
            <button
              type="button"
              className="infotip-learn-more"
              onClick={() => { onLearnMore(metric); setOpen(false); }}
            >
              Learn more →
            </button>
          )}
        </div>
      )}
    </span>
  );
}
