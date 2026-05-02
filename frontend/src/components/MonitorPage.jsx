import { useState, useRef } from "react";
import {
  getSnapshots, deleteSnapshot, renameSnapshot, pinSnapshot, clearSnapshots,
} from "../utils/snapshots";
import { diffSnapshots } from "../utils/diff";
import { pct, num } from "../utils/formatters";
import MonitorTimeline from "./MonitorTimeline";

const SEV_COLOR = { critical: "#dc2626", warning: "#d97706", improved: "#16a34a", stable: "#9ca3af" };
const SEV_ICON  = { critical: "⚠", warning: "↑", improved: "↓", stable: "—" };

function sortSnapshots(snaps) {
  const byTime = (a, b) => new Date(b.timestamp) - new Date(a.timestamp);
  return [
    ...snaps.filter((s) => s.pinned).sort(byTime),
    ...snaps.filter((s) => !s.pinned).sort(byTime),
  ];
}

function isIdentical(a, b) {
  return a.detailedFingerprint && b.detailedFingerprint &&
    a.detailedFingerprint === b.detailedFingerprint;
}

function KeyMetrics({ results }) {
  const enp = results.concentration?.enp_risk;
  return (
    <div className="monitor-metrics">
      {[
        { label: "Sharpe",       value: num(results.sharpe_ratio, 2) },
        { label: "Volatility",   value: pct(results.annualized_volatility) },
        { label: "Max DD",       value: pct(results.max_drawdown), color: "#dc2626" },
        { label: "Real Pos.",    value: enp != null ? enp.toFixed(1) : "—" },
        { label: "Risk Score",   value: results.risk_score != null ? `${results.risk_score}/10` : "—" },
      ].map(({ label, value, color }) => (
        <div key={label} className="monitor-metric">
          <div className="monitor-metric-label">{label}</div>
          <div className="monitor-metric-value" style={color ? { color } : {}}>{value}</div>
        </div>
      ))}
    </div>
  );
}

function SnapshotCard({ snap, compareTarget, onDelete, onRename, onPin }) {
  const [editMode, setEditMode] = useState(false);
  const [editName, setEditName] = useState(snap.name || "");
  const inputRef = useRef(null);

  const date = new Date(snap.timestamp).toLocaleDateString("en-US", {
    month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit",
  });

  function startEdit() {
    setEditName(snap.name || "");
    setEditMode(true);
    setTimeout(() => inputRef.current?.focus(), 0);
  }

  function commitEdit() {
    onRename(snap.id, editName.trim() || null);
    setEditMode(false);
  }

  const diff = compareTarget && !isIdentical(snap, compareTarget)
    ? diffSnapshots(compareTarget, snap.results)
    : null;
  const notable = diff ? diff.metric_changes.filter((m) => m.severity !== "stable") : [];

  return (
    <div className={`card monitor-card ${snap.pinned ? "monitor-card--pinned" : ""}`}>
      <div className="monitor-card-header">
        <div style={{ flex: 1, minWidth: 0 }}>
          {snap.pinned && <span className="monitor-pin-badge">📌 Baseline</span>}
          {editMode ? (
            <div style={{ display: "flex", gap: 6, alignItems: "center", marginBottom: 4 }}>
              <input
                ref={inputRef}
                className="monitor-rename-input"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") commitEdit(); if (e.key === "Escape") setEditMode(false); }}
                placeholder="Snapshot label…"
              />
              <button className="btn btn-primary btn-sm" onClick={commitEdit}>Save</button>
              <button className="btn btn-secondary btn-sm" onClick={() => setEditMode(false)}>Cancel</button>
            </div>
          ) : (
            <div className="monitor-date" onClick={startEdit} title="Click to rename" style={{ cursor: "text" }}>
              {snap.name || date}
              {snap.name && <span className="monitor-date-sub"> · {date}</span>}
            </div>
          )}
          <div className="monitor-tickers">{(snap.results.tickers ?? []).join(" · ")}</div>
          <div className="monitor-dna">{snap.results.portfolio_dna?.type ?? "—"}</div>
        </div>

        <div className="monitor-card-actions">
          <span style={{ fontSize: 11, color: "#9ca3af" }}>
            {snap.payload?.start_date} → {snap.payload?.end_date}
          </span>
          <button
            className="monitor-action-btn"
            onClick={() => onPin(snap.id)}
            title={snap.pinned ? "Unpin baseline" : "Pin as baseline"}
          >
            {snap.pinned ? "Unpin" : "Pin"}
          </button>
          <button className="monitor-action-btn" onClick={startEdit} title="Rename">Rename</button>
          <button
            className="monitor-action-btn monitor-action-btn--danger"
            onClick={() => onDelete(snap.id)}
            title="Delete"
          >
            Delete
          </button>
        </div>
      </div>

      <KeyMetrics results={snap.results} />

      {compareTarget && isIdentical(snap, compareTarget) && (
        <div style={{ fontSize: 11, color: "#9ca3af", fontStyle: "italic", marginTop: 8 }}>
          Identical to previous snapshot — no comparison shown.
        </div>
      )}

      {notable.length > 0 && (
        <div className="monitor-changes">
          <div className="monitor-changes-label">vs. previous snapshot</div>
          {notable.map((m) => (
            <div key={m.key} className="monitor-change-row">
              <span style={{ color: SEV_COLOR[m.severity], width: 14, textAlign: "center", display: "inline-block" }}>
                {SEV_ICON[m.severity]}
              </span>
              <span style={{ flex: 1, fontSize: 12, color: "#374151" }}>{m.label}</span>
              <span style={{ fontSize: 12, color: "#9ca3af" }}>{m.fmt(m.prev)}</span>
              <span style={{ fontSize: 12, color: "#9ca3af", margin: "0 4px" }}>→</span>
              <span style={{ fontSize: 12, fontWeight: 700, color: SEV_COLOR[m.severity] }}>{m.fmt(m.curr)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function MonitorPage() {
  const [rawSnaps, setRawSnaps] = useState(() => getSnapshots());

  const snaps = sortSnapshots(rawSnaps);

  function refresh() { setRawSnaps(getSnapshots()); }

  function handleDelete(id) {
    if (!window.confirm("Delete this snapshot?")) return;
    deleteSnapshot(id);
    refresh();
  }

  function handleRename(id, name) {
    renameSnapshot(id, name);
    refresh();
  }

  function handlePin(id) {
    pinSnapshot(id);
    refresh();
  }

  function handleClearAll() {
    if (!window.confirm("Delete all snapshots? This cannot be undone.")) return;
    clearSnapshots();
    setRawSnaps([]);
  }

  if (snaps.length === 0) {
    return (
      <div className="container">
        <div className="empty-state">
          <div className="empty-state-icon">📊</div>
          <div className="empty-state-title">No snapshots yet</div>
          <div className="empty-state-body">
            Run an analysis and click <strong>Save Snapshot</strong> to start tracking your portfolio over time.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      <div className="page-header">
        <h1 style={{ margin: 0 }}>Monitor</h1>
        <button className="monitor-clear-btn" onClick={handleClearAll}>Clear all</button>
      </div>
      <p className="page-subtitle">
        {snaps.length} snapshot{snaps.length !== 1 ? "s" : ""} · click a name to rename · pinned snapshots appear first
      </p>

      <MonitorTimeline snapshots={snaps} />

      {snaps.map((snap, i) => {
        const compareTarget = snaps[i + 1] ?? null;
        return (
          <SnapshotCard
            key={snap.id}
            snap={snap}
            compareTarget={compareTarget}
            onDelete={handleDelete}
            onRename={handleRename}
            onPin={handlePin}
          />
        );
      })}
    </div>
  );
}
