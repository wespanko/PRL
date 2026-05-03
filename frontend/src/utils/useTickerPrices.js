import { useEffect, useRef, useState } from "react";
import { fetchLatestPrices } from "../api/client";

/**
 * Keeps a `{ticker: price}` map for any tickers in the input list. Fetches
 * missing ones from /api/prices in a debounced batch so rapid keystrokes
 * don't flood the backend. Caches forever within a session — prices don't
 * move enough during a form fill-out to matter.
 *
 * Returns:
 *   prices  — current map (incomplete entries are absent)
 *   loading — set of tickers currently being fetched
 *   missing — set of tickers the backend reported as not found
 *   asof    — most recent close date the backend returned
 */
export function useTickerPrices(tickers, { enabled = true, debounceMs = 350 } = {}) {
  const [prices, setPrices] = useState({});
  const [missing, setMissing] = useState(new Set());
  const [loading, setLoading] = useState(new Set());
  const [asof, setAsof] = useState(null);
  const debounceRef = useRef(null);

  useEffect(() => {
    if (!enabled) return;
    const wanted = (tickers || [])
      .map((t) => (t || "").trim().toUpperCase())
      .filter(Boolean);
    const need = wanted.filter((t) => !(t in prices) && !missing.has(t) && !loading.has(t));
    if (need.length === 0) return;

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setLoading((prev) => {
        const next = new Set(prev);
        need.forEach((t) => next.add(t));
        return next;
      });
      try {
        const data = await fetchLatestPrices(need);
        setPrices((prev) => ({ ...prev, ...(data.prices || {}) }));
        if (data.missing && data.missing.length > 0) {
          setMissing((prev) => {
            const next = new Set(prev);
            data.missing.forEach((t) => next.add(t));
            return next;
          });
        }
        if (data.asof) setAsof(data.asof);
      } catch {
        // mark all as missing so we don't keep retrying forever
        setMissing((prev) => {
          const next = new Set(prev);
          need.forEach((t) => next.add(t));
          return next;
        });
      } finally {
        setLoading((prev) => {
          const next = new Set(prev);
          need.forEach((t) => next.delete(t));
          return next;
        });
      }
    }, debounceMs);

    return () => clearTimeout(debounceRef.current);
  }, [tickers.join("|"), enabled]); // eslint-disable-line react-hooks/exhaustive-deps

  return { prices, loading, missing, asof };
}
