import { useState } from "react";
import { updateProfile } from "../utils/profile";

const RISK_LEVELS = [
  { id: "conservative", label: "Conservative", body: "Capital preservation first" },
  { id: "balanced",     label: "Balanced",     body: "Growth with risk control" },
  { id: "aggressive",   label: "Aggressive",   body: "Growth-tilted, higher tolerance" },
];

const EXPERIENCE_LEVELS = [
  { id: "beginner",  label: "New to investing",   body: "Plain-English explanations + guided onboarding" },
  { id: "some",      label: "I know the basics",  body: "Standard app, with metric explainers" },
  { id: "confident", label: "I know what I'm doing", body: "Skip the tour, drop me into the full app" },
];

export default function SettingsPage({ profile, onProfileUpdated, setActiveTab }) {
  const [name, setName] = useState(profile.name);
  const [email, setEmail] = useState(profile.email || "");
  const [riskTolerance, setRiskTolerance] = useState(profile.riskTolerance);
  const [experience, setExperience] = useState(profile.experience);
  const [savedFlash, setSavedFlash] = useState(false);
  const [error, setError] = useState(null);

  function handleSave() {
    if (!name.trim()) {
      setError("Name can't be empty.");
      return;
    }
    if (email && !/^\S+@\S+\.\S+$/.test(email)) {
      setError("That email doesn't look valid.");
      return;
    }
    setError(null);
    const updated = updateProfile({
      name: name.trim(),
      email: email.trim(),
      riskTolerance,
      experience,
    });
    onProfileUpdated?.(updated);
    setSavedFlash(true);
    setTimeout(() => setSavedFlash(false), 1800);
  }

  function handleRestartOnboarding() {
    const updated = updateProfile({ onboarded: false });
    onProfileUpdated?.(updated);
    setActiveTab("beginner");
  }

  return (
    <div className="container">
      <div className="settings-hero">
        <h1 className="settings-hero-title">Settings</h1>
        <p className="settings-hero-sub">
          All settings are stored only in your browser. Changing them here doesn't sync anywhere.
        </p>
      </div>

      <div className="card">
        <div className="settings-section-label">Profile</div>
        <div className="settings-field">
          <label className="settings-label">Display name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => { setName(e.target.value); setError(null); }}
            maxLength={60}
          />
        </div>
        <div className="settings-field">
          <label className="settings-label">
            Email <span className="settings-label-optional">(optional)</span>
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => { setEmail(e.target.value); setError(null); }}
            placeholder="you@example.com"
            maxLength={120}
          />
        </div>
      </div>

      <div className="card">
        <div className="settings-section-label">Risk style</div>
        <p className="settings-section-help">
          Used by the Improve optimizer (sets how much Sharpe you'll allow giving up to lower risk)
          and the Thesis tab (tilts suggestions toward your stated tolerance).
        </p>
        <div className="settings-radio-list">
          {RISK_LEVELS.map((r) => (
            <button
              key={r.id}
              type="button"
              className={`settings-radio ${riskTolerance === r.id ? "settings-radio--active" : ""}`}
              onClick={() => setRiskTolerance(r.id)}
            >
              <span className="settings-radio-dot" />
              <span className="settings-radio-text">
                <span className="settings-radio-label">{r.label}</span>
                <span className="settings-radio-body">{r.body}</span>
              </span>
            </button>
          ))}
        </div>
      </div>

      <div className="card">
        <div className="settings-section-label">Experience level</div>
        <p className="settings-section-help">
          Affects what you see when you first open the app. Beginners get a guided onboarding;
          others skip straight to the dashboard.
        </p>
        <div className="settings-radio-list">
          {EXPERIENCE_LEVELS.map((e) => (
            <button
              key={e.id}
              type="button"
              className={`settings-radio ${experience === e.id ? "settings-radio--active" : ""}`}
              onClick={() => setExperience(e.id)}
            >
              <span className="settings-radio-dot" />
              <span className="settings-radio-text">
                <span className="settings-radio-label">{e.label}</span>
                <span className="settings-radio-body">{e.body}</span>
              </span>
            </button>
          ))}
        </div>

        {experience === "beginner" && (
          <button
            type="button"
            className="btn btn-secondary btn-sm settings-restart-btn"
            onClick={handleRestartOnboarding}
          >
            Restart guided onboarding →
          </button>
        )}
      </div>

      {error && <div className="error">{error}</div>}

      <div className="settings-actions">
        <button className="btn btn-primary" onClick={handleSave}>
          Save changes
        </button>
        {savedFlash && <span className="settings-saved">✓ Saved</span>}
      </div>

      <div className="settings-meta">
        Profile created {new Date(profile.createdAt).toLocaleDateString("en-US", {
          year: "numeric", month: "short", day: "numeric",
        })}
      </div>
    </div>
  );
}
