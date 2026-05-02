import { useState } from "react";
import { pct } from "../utils/formatters";

function stressColor(value) {
  if (value < -0.25) return "#dc2626";
  if (value < -0.15) return "#ea580c";
  if (value < -0.05) return "#d97706";
  if (value > 0.02)  return "#16a34a";
  return "#6b7280";
}

export default function StressTable({ scenarios, breakdown }) {
  const [expanded, setExpanded] = useState(null);
  const entries = Object.entries(scenarios).sort((a, b) => a[1] - b[1]);

  return (
    <div className="card">
      <h2>Stress Scenarios</h2>
      <p className="chart-caption">Theme-aware shocks applied per holding. Click any row to see the methodology.</p>
      <table className="data-table">
        <thead>
          <tr>
            <th>Scenario</th>
            <th style={{ textAlign: "right" }}>Est. Return</th>
            <th style={{ width: 24 }}></th>
          </tr>
        </thead>
        <tbody>
          {entries.map(([name, value]) => {
            const isOpen = expanded === name;
            const rows = breakdown?.[name] ?? [];
            return (
              <>
                <tr
                  key={name}
                  className="stress-row"
                  onClick={() => setExpanded(isOpen ? null : name)}
                  style={{ cursor: breakdown ? "pointer" : "default" }}
                >
                  <td style={{ fontWeight: 500 }}>{name}</td>
                  <td style={{ textAlign: "right", fontWeight: 700, color: stressColor(value) }}>
                    {pct(value)}
                  </td>
                  <td style={{ textAlign: "center", color: "#9ca3af", fontSize: 11 }}>
                    {isOpen ? "▲" : "▼"}
                  </td>
                </tr>
                {isOpen && rows.length > 0 && (
                  <tr key={`${name}-detail`} className="stress-detail-row">
                    <td colSpan={3} style={{ padding: 0 }}>
                      <table className="breakdown-table">
                        <thead>
                          <tr>
                            <th>Ticker</th>
                            <th>Theme</th>
                            <th style={{ textAlign: "right" }}>Applied Shock</th>
                            <th style={{ textAlign: "right" }}>Weight</th>
                            <th style={{ textAlign: "right" }}>Contribution</th>
                          </tr>
                        </thead>
                        <tbody>
                          {rows.map((r) => (
                            <tr key={r.ticker}>
                              <td style={{ fontWeight: 600 }}>{r.ticker}</td>
                              <td style={{ color: "#6b7280" }}>{r.theme}</td>
                              <td style={{ textAlign: "right", color: stressColor(r.applied_shock) }}>
                                {pct(r.applied_shock)}
                              </td>
                              <td style={{ textAlign: "right", color: "#6b7280" }}>
                                {pct(r.weight)}
                              </td>
                              <td style={{ textAlign: "right", fontWeight: 600, color: stressColor(r.contribution) }}>
                                {pct(r.contribution)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </td>
                  </tr>
                )}
              </>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
