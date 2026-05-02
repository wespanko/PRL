import { pct } from "../utils/formatters";

function PeriodTable({ periods, colorClass }) {
  return (
    <table className="data-table">
      <thead>
        <tr>
          <th>Period</th>
          <th style={{ textAlign: "right" }}>21-Day Return</th>
        </tr>
      </thead>
      <tbody>
        {periods.map((p, i) => (
          <tr key={i}>
            <td>
              <div style={{ fontWeight: 500, fontSize: 13 }}>{p.label}</div>
              <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 1 }}>
                {p.start} → {p.end}
              </div>
            </td>
            <td style={{ textAlign: "right", fontWeight: 700 }} className={colorClass}>
              {pct(p["return"])}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export default function WorstPeriodsTable({ worstPeriods, bestPeriods }) {
  if (!worstPeriods || worstPeriods.length === 0) return null;

  return (
    <div className="card">
      <h2>Historical Best &amp; Worst Periods</h2>
      <div className="periods-grid">
        <div>
          <div className="periods-header periods-header--bad">Worst 3 Periods</div>
          <PeriodTable periods={worstPeriods} colorClass="text-red" />
        </div>
        <div>
          <div className="periods-header periods-header--good">Best 3 Periods</div>
          <PeriodTable periods={bestPeriods} colorClass="text-green" />
        </div>
      </div>
    </div>
  );
}
