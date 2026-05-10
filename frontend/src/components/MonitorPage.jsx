// Monitor — DESIGN_BRIEF.md §7
//
// Strict empty state spec:
//   "Empty state must be elegant. display-lg headline 'No snapshots yet'
//    in --ink-300, body subtext, single secondary button 'Save your first
//    snapshot.' Center-aligned, 480px-wide block."
//
// Populated state isn't specified beyond the brief's general rules — we
// keep the existing snapshot-card structure but apply brief tokens.

import { useState, useRef } from "react";
import {
  getSnapshots, deleteSnapshot, renameSnapshot, pinSnapshot, clearSnapshots,
} from "../utils/snapshots";
import { diffSnapshots } from "../utils/diff";
import { pct, num } from "../utils/formatters";
import MonitorTimeline from "./MonitorTimeline";
import { Button, Card } from "./ui";

const SEV_COLOR = {
  critical: "var(--risk-red)",
  warning:  "var(--risk-amber)",
  improved: "var(--risk-green)",
  stable:   "var(--ink-400)",
};
// §6: no emoji icons. Plain typographic glyphs only.
const SEV_GLYPH = {
  critical: "!",
  warning:  "↑",
  improved: "↓",
  stable:   "—",
};

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
  const items = [
    { label: "Sharpe",     value: num(results.sharpe_ratio, 2) },
    { label: "Volatility", value: pct(results.annualized_volatility) },
    { label: "Max DD",     value: pct(results.max_drawdown), tone: "neg" },
    { label: "Real Pos.",  value: enp != null ? enp.toFixed(1) : "—" },
    { label: "Risk Score", value: results.risk_score != null ? `${results.risk_score}/10` : "—" },
  ];
  return (
    <div className="monitor-metrics">
      {items.map(({ label, value, tone }) => (
        <div key={label} className="monitor-metric">
          <div className="pk-text-caption pk-ink-400 monitor-metric-label">{label}</div>
          <div
            className={`pk-text-mono-lg monitor-metric-value ${
              tone === "neg" ? "monitor-metric-value--neg" : ""
            }`}
          >
            {value}
          </div>
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
    <Card className={`monitor-card ${snap.pinned ? "monitor-card--pinned" : ""}`}>
      <div className="monitor-card-header">
        <div className="monitor-card-meta">
          {snap.pinned && (
            <span className="pk-text-caption pk-blue-700 monitor-pin-badge">
              Baseline
            </span>
          )}
          {editMode ? (
            <div className="monitor-rename-row">
              <input
                ref={inputRef}
                className="pk-input monitor-rename-input"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") commitEdit();
                  if (e.key === "Escape") setEditMode(false);
                }}
                placeholder="Snapshot label…"
              />
              <Button variant="primary" size="sm" onClick={commitEdit}>Save</Button>
              <Button variant="secondary" size="sm" onClick={() => setEditMode(false)}>Cancel</Button>
            </div>
          ) : (
            <div
              className="monitor-date"
              onClick={startEdit}
              title="Click to rename"
              role="button"
              tabIndex={0}
              onKeyDown={(e) => { if (e.key === "Enter") startEdit(); }}
            >
              <span className="pk-text-heading-md pk-ink-900">
                {snap.name || date}
              </span>
              {snap.name && (
                <span className="pk-text-mono-sm pk-ink-400 monitor-date-sub">
                  · {date}
                </span>
              )}
            </div>
          )}
          <div className="pk-text-mono-sm pk-ink-500 monitor-tickers">
            {(snap.results.tickers ?? []).join(" · ")}
          </div>
          <div className="pk-text-caption pk-ink-400 monitor-dna">
            {snap.results.portfolio_dna?.type ?? "—"}
          </div>
        </div>

        <div className="monitor-card-actions">
          <span className="pk-text-mono-sm pk-ink-400 monitor-period">
            {snap.payload?.start_date} → {snap.payload?.end_date}
          </span>
          <button
            type="button"
            className="monitor-action"
            onClick={() => onPin(snap.id)}
            title={snap.pinned ? "Unpin baseline" : "Pin as baseline"}
          >
            {snap.pinned ? "Unpin" : "Pin"}
          </button>
          <button
            type="button"
            className="monitor-action"
            onClick={startEdit}
            title="Rename"
          >
            Rename
          </button>
          <button
            type="button"
            className="monitor-action monitor-action--danger"
            onClick={() => onDelete(snap.id)}
            title="Delete"
          >
            Delete
          </button>
        </div>
      </div>

      <KeyMetrics results={snap.results} />

      {compareTarget && isIdentical(snap, compareTarget) && (
        <div className="pk-text-body-sm pk-ink-400 monitor-identical">
          Identical to previous snapshot — no comparison shown.
        </div>
      )}

      {notable.length > 0 && (
        <div className="monitor-changes">
          <div className="pk-text-caption pk-ink-400 monitor-changes-label">
            vs. previous snapshot
          </div>
          {notable.map((m) => (
            <div key={m.key} className="monitor-change-row">
              <span
                className="monitor-change-glyph"
                style={{ color: SEV_COLOR[m.severity] }}
                aria-hidden="true"
              >
                {SEV_GLYPH[m.severity]}
              </span>
              <span className="pk-text-body-sm pk-ink-700 monitor-change-label">
                {m.label}
              </span>
              <span className="pk-text-mono-sm pk-ink-400">{m.fmt(m.prev)}</span>
              <span className="pk-text-mono-sm pk-ink-400 monitor-change-arrow">→</span>
              <span
                className="pk-text-mono"
                style={{ color: SEV_COLOR[m.severity], fontWeight: 600 }}
              >
                {m.fmt(m.curr)}
              </span>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

export default function MonitorPage({ setActiveTab }) {
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

  // §7 Monitor empty state — exact spec.
  if (snaps.length === 0) {
    return (
      <div className="container">
        <div className="monitor-empty">
          <h1 className="pk-text-display-lg pk-ink-300 monitor-empty-headline">
            No snapshots yet
          </h1>
          <p className="pk-text-body-lg pk-ink-500 monitor-empty-body">
            Run an analysis and save it to start tracking how your portfolio's
            risk profile changes over time.
          </p>
          <Button
            variant="secondary"
            onClick={() => setActiveTab && setActiveTab("analyze")}
          >
            Save your first snapshot
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      <header className="monitor-header">
        <div>
          <h1 className="pk-text-heading-lg pk-ink-900">Monitor</h1>
          <p className="pk-text-body pk-ink-500 monitor-header-sub">
            {snaps.length} snapshot{snaps.length !== 1 ? "s" : ""} · click a name
            to rename · pinned snapshots appear first
          </p>
        </div>
        <Button variant="tertiary" onClick={handleClearAll}>
          Clear all
        </Button>
      </header>

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
