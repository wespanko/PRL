import { useState, useRef, useEffect } from "react";
import { profileInitials, profileFirstName } from "../utils/profile";

const NAV_ITEMS = [
  { id: "dashboard", label: "Dashboard", icon: "◎" },
  { id: "build",     label: "Build",     icon: "◆" },
  { id: "analyze",   label: "Analyze",   icon: "▲" },
  { id: "simulate",  label: "Simulate",  icon: "◇" },
  { id: "improve",   label: "Improve",   icon: "↕" },
  { id: "plan",      label: "Plan",      icon: "$" },
  { id: "monitor",   label: "Monitor",   icon: "↻" },
  { id: "learn",     label: "Learn",     icon: "?" },
];

export default function Sidebar({ activeTab, setActiveTab, hasResults, profile, onSignOut }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    function onClick(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false);
      }
    }
    if (menuOpen) {
      window.addEventListener("mousedown", onClick);
      return () => window.removeEventListener("mousedown", onClick);
    }
  }, [menuOpen]);

  return (
    <aside className="sidebar">
      <nav className="sidebar-nav">
        {NAV_ITEMS.map((item) => {
          const disabled = (item.id === "simulate" || item.id === "improve") && !hasResults;
          const active = activeTab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              className={`sidebar-link ${active ? "sidebar-link--active" : ""} ${disabled ? "sidebar-link--disabled" : ""}`}
              onClick={() => !disabled && setActiveTab(item.id)}
              title={disabled ? "Run an analysis first" : item.label}
            >
              <span className="sidebar-link-icon" aria-hidden="true">{item.icon}</span>
              <span className="sidebar-link-label">{item.label}</span>
            </button>
          );
        })}
      </nav>

      <div className="sidebar-spacer" />

      <div className="sidebar-profile-wrap" ref={menuRef}>
        {menuOpen && (
          <div className="sidebar-profile-menu">
            <div className="sidebar-profile-menu-name">{profile.name}</div>
            {profile.email && (
              <div className="sidebar-profile-menu-email">{profile.email}</div>
            )}
            <button
              className="sidebar-profile-menu-item sidebar-profile-menu-item--neutral"
              onClick={() => { setMenuOpen(false); setActiveTab("settings"); }}
            >
              Settings
            </button>
            <button
              className="sidebar-profile-menu-item"
              onClick={() => { setMenuOpen(false); onSignOut(); }}
            >
              Sign out
            </button>
          </div>
        )}
        <button
          className={`sidebar-profile ${menuOpen ? "sidebar-profile--open" : ""}`}
          onClick={() => setMenuOpen((v) => !v)}
        >
          <span className="sidebar-profile-avatar">{profileInitials(profile.name)}</span>
          <span className="sidebar-profile-text">
            <span className="sidebar-profile-name">{profileFirstName(profile.name)}</span>
            <span className="sidebar-profile-status">Local profile</span>
          </span>
          <span className="sidebar-profile-chevron">⌄</span>
        </button>
      </div>
    </aside>
  );
}
