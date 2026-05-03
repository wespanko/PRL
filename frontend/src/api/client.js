const BASE = import.meta.env.VITE_API_URL ?? "";

export async function analyzePortfolio(payload) {
  const res = await fetch(`${BASE}/api/analyze`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    const detail = err.detail;
    throw new Error(
      typeof detail === "string" ? detail :
      Array.isArray(detail) ? detail.map((d) => d.msg).join("; ") :
      "Analysis failed"
    );
  }
  return res.json();
}

export async function improvePortfolio(payload) {
  const res = await fetch(`${BASE}/api/improve`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    const detail = err.detail;
    throw new Error(
      typeof detail === "string" ? detail :
      Array.isArray(detail) ? detail.map((d) => d.msg).join("; ") :
      "Improvement analysis failed"
    );
  }
  return res.json();
}

export async function fetchLatestPrices(tickers) {
  const list = (tickers || []).map((t) => t.trim().toUpperCase()).filter(Boolean);
  if (list.length === 0) return { prices: {}, missing: [], asof: null };
  const q = encodeURIComponent(list.join(","));
  const res = await fetch(`${BASE}/api/prices?tickers=${q}`);
  if (!res.ok) throw new Error("Could not fetch prices");
  return res.json();
}

export async function generateThesis(payload) {
  const res = await fetch(`${BASE}/api/thesis`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || "Thesis generation failed");
  }
  return res.json();
}

export async function downloadPdf(payload) {
  const res = await fetch(`${BASE}/api/report/pdf`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error("PDF generation not yet implemented (coming in Step 6)");
  return res.blob();
}
