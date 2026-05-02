function daysDiff(dateStrA, dateStrB) {
  return Math.abs(
    (new Date(dateStrA) - new Date(dateStrB)) / (1000 * 60 * 60 * 24)
  );
}

export default function PeriodWarning({ results, payload }) {
  const actual = results.actual_period;
  const limited = results.limited_history_tickers ?? [];
  if (!actual) return null;

  const requestedStart = payload?.start_date;
  const startShift = requestedStart ? daysDiff(actual.start, requestedStart) : 0;
  const endShift = payload?.end_date ? daysDiff(actual.end, payload.end_date) : 0;

  // Nothing to show if dates are identical
  if (startShift === 0 && endShift === 0 && limited.length === 0) return null;

  const isMaterial = limited.length > 0 || startShift > 7;

  if (!isMaterial) {
    // Level 1 — minor calendar alignment only
    return (
      <div className="period-info">
        ℹ Adjusted to nearest valid market trading dates
        {requestedStart && (
          <span className="period-info-detail">
            {" "}({requestedStart} → {payload.end_date} became {actual.start} → {actual.end})
          </span>
        )}
      </div>
    );
  }

  // Level 2 — material history limitation
  return (
    <div className="period-warning">
      <div className="period-warning-title">⚠ Limited ticker history</div>
      {limited.length > 0 && (
        <div className="period-warning-row">
          <strong>{limited.join(", ")}</strong>{" "}
          {limited.length === 1 ? "does" : "do"} not have full history for the requested range —
          analysis begins <strong>{actual.start}</strong> instead of {requestedStart}.
        </div>
      )}
      {limited.length === 0 && startShift > 7 && (
        <div className="period-warning-row">
          Data availability shifted the start by {Math.round(startShift)} days
          ({requestedStart} → <strong>{actual.start}</strong>).
        </div>
      )}
      <div className="period-warning-note">
        All metrics are computed from {actual.start} → {actual.end} only and should not
        be compared directly to analyses using the full requested range.
      </div>
    </div>
  );
}
