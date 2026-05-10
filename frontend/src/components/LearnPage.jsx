// Learn — DESIGN_BRIEF.md §7
//
// Strict spec:
//   "Glossary. Category chips horizontal scroll, sticky under header.
//    Collapsed: heading-md term + body-sm one-liner.
//    Expanded: body explanation, 'Why it matters' in --ink-50 panel,
//    'Common misconceptions' in italic --ink-500."
//
// Pill chips are explicitly allowed by §6 ("No pill buttons (except
// tag chips)").

import { useState, useMemo, useEffect, useRef } from "react";
import { METRICS, CATEGORIES } from "../data/metricsLibrary";
import { Input } from "./ui";

function MetricCard({ metric, expanded, onToggle, anchorRef }) {
  return (
    <div
      ref={anchorRef}
      className={`learn-card ${expanded ? "is-open" : ""}`}
      id={`learn-${metric.id}`}
    >
      <button
        type="button"
        className="learn-card-header"
        onClick={onToggle}
        aria-expanded={expanded}
      >
        <div className="learn-card-header-text">
          <div className="pk-text-heading-md pk-ink-900 learn-card-title">
            {metric.label}
          </div>
          <div className="pk-text-body-sm pk-ink-500 learn-card-tagline">
            {metric.oneLiner}
          </div>
        </div>
        <span className="learn-card-chevron" aria-hidden="true">
          {expanded ? "−" : "+"}
        </span>
      </button>

      {expanded && (
        <div className="learn-card-body">
          {/* Body explanation — no eyebrow per §7. */}
          <p className="pk-text-body pk-ink-700 learn-card-explanation">
            {metric.meaning}
          </p>

          {/* Why it matters — in --ink-50 panel per §7. */}
          <div className="learn-card-why">
            <div className="pk-text-caption pk-ink-400 learn-card-eyebrow">
              Why it matters
            </div>
            <p className="pk-text-body pk-ink-700">{metric.whyItMatters}</p>
          </div>

          {/* Common misconceptions — italic --ink-500 per §7. */}
          {metric.mistake && (
            <p className="learn-card-misconception">
              <span className="learn-card-misconception-label">Common misconception:</span>{" "}
              {metric.mistake}
            </p>
          )}

          {/* Supplementary — preserved from existing functionality. */}
          {metric.howToImprove && (
            <div className="learn-card-section">
              <div className="pk-text-caption pk-ink-400 learn-card-eyebrow">
                How to improve it
              </div>
              <p className="pk-text-body-sm pk-ink-500">{metric.howToImprove}</p>
            </div>
          )}

          {(metric.range || metric.formula) && (
            <div className="learn-card-pills">
              {metric.range && (
                <div className="learn-card-pill">
                  <div className="pk-text-caption pk-ink-400">Typical range</div>
                  <div className="pk-text-mono pk-ink-900">{metric.range}</div>
                </div>
              )}
              {metric.formula && (
                <div className="learn-card-pill">
                  <div className="pk-text-caption pk-ink-400">Formula</div>
                  <code className="pk-text-mono pk-ink-900 learn-card-formula">
                    {metric.formula}
                  </code>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function LearnPage({ initialMetricId }) {
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("all");
  const [openId, setOpenId] = useState(initialMetricId ?? null);
  const refs = useRef({});

  // Deep-link: when a metric ID arrives, open it and scroll into view.
  useEffect(() => {
    if (!initialMetricId) return;
    setOpenId(initialMetricId);
    setActiveCategory("all");
    const el = refs.current[initialMetricId];
    if (el) {
      setTimeout(() => el.scrollIntoView({ behavior: "smooth", block: "center" }), 60);
    }
  }, [initialMetricId]);

  const visibleMetrics = useMemo(() => {
    const all = Object.values(METRICS);
    const q = query.trim().toLowerCase();
    return all.filter((m) => {
      if (activeCategory !== "all" && m.category !== activeCategory) return false;
      if (!q) return true;
      return (
        m.label.toLowerCase().includes(q) ||
        m.oneLiner.toLowerCase().includes(q) ||
        m.meaning.toLowerCase().includes(q)
      );
    });
  }, [query, activeCategory]);

  return (
    <div className="container learn-page">
      <header className="learn-header">
        <h1 className="pk-text-heading-lg pk-ink-900">Risk metrics, in plain English</h1>
        <p className="pk-text-body-lg pk-ink-500 learn-header-sub">
          Every metric Panko computes — what it actually measures, why it matters, how to
          improve it, and what people get wrong about it.
        </p>
      </header>

      <div className="learn-search-row">
        <Input
          type="search"
          placeholder="Search a metric or term…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Search metrics"
        />
      </div>

      {/* §7: horizontal-scroll chips, sticky under header. */}
      <div className="learn-categories" role="tablist" aria-label="Metric categories">
        <button
          type="button"
          role="tab"
          aria-selected={activeCategory === "all"}
          className={`learn-chip ${activeCategory === "all" ? "is-active" : ""}`}
          onClick={() => setActiveCategory("all")}
        >
          <span className="learn-chip-icon" aria-hidden="true">◍</span>
          All metrics
        </button>
        {CATEGORIES.map((c) => (
          <button
            key={c.id}
            type="button"
            role="tab"
            aria-selected={activeCategory === c.id}
            className={`learn-chip ${activeCategory === c.id ? "is-active" : ""}`}
            onClick={() => setActiveCategory(c.id)}
          >
            <span className="learn-chip-icon" aria-hidden="true">{c.icon}</span>
            {c.label}
          </button>
        ))}
      </div>

      <div className="learn-list">
        {visibleMetrics.length === 0 ? (
          <div className="learn-empty">
            <div className="pk-text-heading-md pk-ink-700 learn-empty-title">
              No matches
            </div>
            <p className="pk-text-body pk-ink-500 learn-empty-body">
              Try a different search term or pick a different category.
            </p>
          </div>
        ) : (
          visibleMetrics.map((m) => (
            <MetricCard
              key={m.id}
              metric={m}
              expanded={openId === m.id}
              onToggle={() => setOpenId(openId === m.id ? null : m.id)}
              anchorRef={(el) => {
                refs.current[m.id] = el;
              }}
            />
          ))
        )}
      </div>

      <p className="pk-text-body-sm pk-ink-400 learn-footer">
        <strong className="pk-ink-700">Reminder:</strong> these are educational
        descriptions, not financial advice. Numbers in the app come from real price data
        computed deterministically — no LLM is involved in the math itself.
      </p>
    </div>
  );
}
