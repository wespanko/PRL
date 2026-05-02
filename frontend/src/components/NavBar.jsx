export default function NavBar({ activeTab, setActiveTab, hasResults }) {
  const tabs = [
    { id: "analyze",  label: "Analyze" },
    { id: "simulate", label: "Simulate", disabled: !hasResults },
    { id: "improve",  label: "Improve",  disabled: !hasResults },
    { id: "monitor",  label: "Monitor" },
  ];

  return (
    <nav className="navbar">
      <span className="navbar-brand">Panko</span>
      <div className="navbar-tabs">
        {tabs.map((t) => (
          <button
            key={t.id}
            className={`nav-tab ${activeTab === t.id ? "nav-tab--active" : ""} ${t.disabled ? "nav-tab--disabled" : ""}`}
            onClick={() => !t.disabled && setActiveTab(t.id)}
            title={t.disabled ? "Run an analysis first" : undefined}
          >
            {t.label}
          </button>
        ))}
      </div>
    </nav>
  );
}
