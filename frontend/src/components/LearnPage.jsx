import { useState, useMemo, useEffect, useRef } from "react";
import { METRICS, CATEGORIES, getMetricsByCategory } from "../data/metricsLibrary";

function MetricCard({ metric, expanded, onToggle, anchorRef }) {
  return (
    <div
      ref={anchorRef}
      className={`learn-card ${expanded ? "learn-card--open" : ""}`}
      id={`learn-${metric.id}`}
    >
      <button className="learn-card-header" onClick={onToggle}>
        <div className="learn-card-header-text">
          <div className="learn-card-title">{metric.label}</div>
          <div className="learn-card-tagline">{metric.oneLiner}</div>
        </div>
        <span className="learn-card-chevron">{expanded ? "−" : "+"}</span>
      </button>
      {expanded && (
        <div className="learn-card-body">
          <div className="learn-card-section">
            <div className="learn-card-section-label">What it actually measures</div>
            <p>{metric.meaning}</p>
          </div>
          <div className="learn-card-section">
            <div className="learn-card-section-label">Why it matters</div>
            <p>{metric.whyItMatters}</p>
          </div>
          <div className="learn-card-section">
            <div className="learn-card-section-label">How to improve it</div>
            <p>{metric.howToImprove}</p>
          </div>
          <div className="learn-card-section">
            <div className="learn-card-section-label">Common mistake</div>
            <p>{metric.mistake}</p>
          </div>
          <div className="learn-card-grid">
            {metric.range && (
              <div className="learn-card-pill">
                <div className="learn-card-pill-label">Typical range</div>
                <div className="learn-card-pill-value">{metric.range}</div>
              </div>
            )}
            {metric.formula && (
              <div className="learn-card-pill">
                <div className="learn-card-pill-label">Formula</div>
                <code className="learn-card-pill-formula">{metric.formula}</code>
              </div>
            )}
          </div>
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

  // If a deep-link target arrives, open it and scroll to it
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
    <div className="container">
      <div className="learn-hero">
        <h1 className="learn-hero-title">Risk metrics, in plain English</h1>
        <p className="learn-hero-subtitle">
          Every metric Panko computes — what it actually measures, why it matters,
          how to improve it, and what people get wrong about it.
        </p>
      </div>

      <div className="learn-toolbar">
        <input
          type="text"
          className="learn-search"
          placeholder="Search a metric or term…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      <div className="learn-categories">
        <button
          className={`learn-category ${activeCategory === "all" ? "learn-category--active" : ""}`}
          onClick={() => setActiveCategory("all")}
        >
          <span className="learn-category-icon">◍</span>
          All metrics
        </button>
        {CATEGORIES.map((c) => (
          <button
            key={c.id}
            className={`learn-category ${activeCategory === c.id ? "learn-category--active" : ""}`}
            onClick={() => setActiveCategory(c.id)}
          >
            <span className="learn-category-icon">{c.icon}</span>
            {c.label}
          </button>
        ))}
      </div>

      <div className="learn-list">
        {visibleMetrics.length === 0 ? (
          <div className="empty-state" style={{ padding: "32px 24px" }}>
            <div className="empty-state-title">No matches</div>
            <div className="empty-state-body">
              Try a different search term or pick a different category.
            </div>
          </div>
        ) : (
          visibleMetrics.map((m) => (
            <MetricCard
              key={m.id}
              metric={m}
              expanded={openId === m.id}
              onToggle={() => setOpenId(openId === m.id ? null : m.id)}
              anchorRef={(el) => { refs.current[m.id] = el; }}
            />
          ))
        )}
      </div>

      <div className="learn-footer">
        <strong>Reminder:</strong> these are educational descriptions, not financial advice.
        Numbers in the app come from real price data computed deterministically — no LLM
        is involved in the math itself.
      </div>
    </div>
  );
}
