import { useState, useRef, useEffect } from "react";
import {
  LayoutDashboard,
  Wand2,
  LineChart,
  FlaskConical,
  Sparkles,
  Wallet,
  Activity,
  BookOpen,
  GraduationCap,
  Eye,
  Settings,
  LogOut,
  ChevronUp,
  ChevronRight,
} from "lucide-react";
import { profileInitials, profileFirstName } from "../utils/profile";

// Tutor-first product: Live Tutor sits at the top, alone, with primary
// accent treatment. The legacy analytics tabs are grouped under "Tools"
// and the learning tabs under "Lessons". Both groups collapse; state
// persists per-browser so power users who expand them stay expanded.

const TOOLS = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "build",     label: "Build",     icon: Wand2           },
  { id: "analyze",   label: "Analyze",   icon: LineChart       },
  { id: "simulate",  label: "Simulate",  icon: FlaskConical    },
  { id: "improve",   label: "Improve",   icon: Sparkles        },
  { id: "plan",      label: "Plan",      icon: Wallet          },
  { id: "monitor",   label: "Monitor",   icon: Activity        },
];

const LESSONS = [
  { id: "learn",     label: "Learn",     icon: BookOpen      },
  { id: "practice",  label: "Practice",  icon: GraduationCap },
];

const SIDEBAR_PREFS_KEY = "panko_sidebar_v1";

function loadPrefs() {
  try {
    const raw = localStorage.getItem(SIDEBAR_PREFS_KEY);
    if (!raw) return { tools: false, lessons: false };
    const parsed = JSON.parse(raw);
    return {
      tools:   Boolean(parsed?.tools),
      lessons: Boolean(parsed?.lessons),
    };
  } catch {
    return { tools: false, lessons: false };
  }
}

function savePrefs(prefs) {
  try { localStorage.setItem(SIDEBAR_PREFS_KEY, JSON.stringify(prefs)); } catch {}
}

export default function Sidebar({ activeTab, setActiveTab, hasResults, profile, onSignOut }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  // Collapsible groups, persisted per-browser. If the active tab is inside
  // a collapsed group on mount, auto-expand that group so the user always
  // sees their current location highlighted.
  const [groups, setGroups] = useState(() => {
    const prefs = loadPrefs();
    if (TOOLS.some((t) => t.id === activeTab))   prefs.tools = true;
    if (LESSONS.some((t) => t.id === activeTab)) prefs.lessons = true;
    return prefs;
  });

  function toggleGroup(name) {
    setGroups((prev) => {
      const next = { ...prev, [name]: !prev[name] };
      savePrefs(next);
      return next;
    });
  }

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

  // ── Shared building blocks ─────────────────────────────────────────
  function NavItem({ item, active, disabled }) {
    const Icon = item.icon;
    return (
      <button
        key={item.id}
        type="button"
        onClick={() => !disabled && setActiveTab(item.id)}
        title={disabled ? "Run an analysis first" : item.label}
        className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors
          ${active
            ? "bg-indigo-50 text-indigo-700"
            : disabled
              ? "text-slate-400 cursor-not-allowed"
              : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"}`}
      >
        <Icon
          className={`h-4 w-4 shrink-0 ${active ? "text-indigo-600" : "text-slate-500"}`}
          strokeWidth={2}
        />
        <span className="flex-1 text-left">{item.label}</span>
      </button>
    );
  }

  function GroupHeader({ name, label, expanded, count }) {
    return (
      <button
        type="button"
        onClick={() => toggleGroup(name)}
        className="w-full flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-500 hover:text-slate-700 transition-colors group"
        aria-expanded={expanded}
      >
        <ChevronRight
          className={`h-3 w-3 transition-transform duration-150 ${expanded ? "rotate-90" : ""} text-slate-400 group-hover:text-slate-600`}
          strokeWidth={2.5}
        />
        <span>{label}</span>
        <span className="ml-auto text-[10px] font-medium text-slate-400 tabular-nums">{count}</span>
      </button>
    );
  }

  // ── Render ─────────────────────────────────────────────────────────
  const tutorActive = activeTab === "tutor";

  return (
    <aside className="fixed left-0 top-0 bottom-0 w-60 bg-white border-r border-slate-200 flex flex-col py-5 px-3 z-30">
      {/* Wordmark */}
      <div className="px-3 pb-5 mb-3 border-b border-slate-200">
        <img src="/logo.png" alt="Panko" className="h-7 w-auto" />
      </div>

      <nav className="flex-1 overflow-y-auto -mr-2 pr-2">
        {/* ── Live Tutor — pinned, primary ───────────────────────── */}
        <button
          type="button"
          onClick={() => setActiveTab("tutor")}
          className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-semibold transition-all
            ${tutorActive
              ? "bg-indigo-600 text-white shadow-sm"
              : "bg-indigo-50 text-indigo-700 hover:bg-indigo-100"}`}
        >
          <Eye
            className={`h-5 w-5 shrink-0 ${tutorActive ? "text-white" : "text-indigo-600"}`}
            strokeWidth={2}
          />
          <span className="flex-1 text-left">Panko</span>
        </button>

        {/* ── Tools group ───────────────────────────────────────── */}
        <div className="mt-5">
          <GroupHeader name="tools" label="Tools" expanded={groups.tools} count={TOOLS.length} />
          {groups.tools && (
            <div className="mt-1 space-y-0.5">
              {TOOLS.map((item) => {
                const disabled = (item.id === "simulate" || item.id === "improve") && !hasResults;
                return (
                  <NavItem
                    key={item.id}
                    item={item}
                    active={activeTab === item.id}
                    disabled={disabled}
                  />
                );
              })}
            </div>
          )}
        </div>

        {/* ── Lessons group ─────────────────────────────────────── */}
        <div className="mt-3">
          <GroupHeader name="lessons" label="Lessons" expanded={groups.lessons} count={LESSONS.length} />
          {groups.lessons && (
            <div className="mt-1 space-y-0.5">
              {LESSONS.map((item) => (
                <NavItem key={item.id} item={item} active={activeTab === item.id} />
              ))}
            </div>
          )}
        </div>

        {/* ── Settings + legal at bottom of scrollable area ─────── */}
        <div className="mt-6 pt-4 border-t border-slate-100 space-y-0.5">
          <NavItem
            item={{ id: "settings", label: "Settings", icon: Settings }}
            active={activeTab === "settings"}
          />
          <NavItem
            item={{ id: "terms", label: "Terms", icon: BookOpen }}
            active={activeTab === "terms"}
          />
          <NavItem
            item={{ id: "privacy", label: "Privacy", icon: BookOpen }}
            active={activeTab === "privacy"}
          />
        </div>
      </nav>

      {/* Profile dock */}
      <div className="relative pt-3 mt-3 border-t border-slate-200" ref={menuRef}>
        {menuOpen && (
          <div className="absolute bottom-full left-0 right-0 mb-2 bg-white border border-slate-200 rounded-lg shadow-lg p-2 z-10">
            <div className="px-3 py-2 border-b border-slate-200 mb-1">
              <div className="text-sm font-semibold text-slate-900 truncate">{profile.name}</div>
              {profile.email && (
                <div className="text-xs text-slate-500 truncate">{profile.email}</div>
              )}
            </div>
            <button
              className="w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium text-slate-700 hover:bg-slate-50"
              onClick={() => { setMenuOpen(false); setActiveTab("settings"); }}
            >
              <Settings className="h-4 w-4" strokeWidth={2} />
              Settings
            </button>
            <button
              className="w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium text-rose-600 hover:bg-rose-50"
              onClick={() => { setMenuOpen(false); onSignOut(); }}
            >
              <LogOut className="h-4 w-4" strokeWidth={2} />
              Sign out
            </button>
          </div>
        )}

        <button
          onClick={() => setMenuOpen((v) => !v)}
          className={`w-full flex items-center gap-3 px-2 py-2 rounded-lg transition-colors
            ${menuOpen ? "bg-slate-100" : "hover:bg-slate-50"}`}
        >
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-white text-sm font-semibold">
            {profileInitials(profile.name)}
          </span>
          <span className="flex-1 min-w-0 text-left">
            <span className="block text-sm font-semibold text-slate-900 truncate">
              {profileFirstName(profile.name)}
            </span>
            <span className="block text-[11px] text-slate-500 truncate">Local profile</span>
          </span>
          <ChevronUp
            className={`h-4 w-4 text-slate-400 shrink-0 transition-transform duration-200
              ${menuOpen ? "" : "rotate-180"}`}
            strokeWidth={2}
          />
        </button>
      </div>
    </aside>
  );
}
