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
  Settings,
  LogOut,
  ChevronUp,
} from "lucide-react";
import { profileInitials, profileFirstName } from "../utils/profile";

const NAV_ITEMS = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "build",     label: "Build",     icon: Wand2           },
  { id: "analyze",   label: "Analyze",   icon: LineChart       },
  { id: "simulate",  label: "Simulate",  icon: FlaskConical    },
  { id: "improve",   label: "Improve",   icon: Sparkles        },
  { id: "plan",      label: "Plan",      icon: Wallet          },
  { id: "monitor",   label: "Monitor",   icon: Activity        },
  { id: "learn",     label: "Learn",     icon: BookOpen        },
  { id: "practice",  label: "Practice",  icon: GraduationCap   },
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
    <aside className="fixed left-0 top-0 bottom-0 w-60 bg-white border-r border-slate-200 flex flex-col py-5 px-3 z-30">
      {/* Wordmark */}
      <div className="px-3 pb-5 mb-3 border-b border-slate-100">
        <img src="/logo.png" alt="Panko" className="h-7 w-auto" />
      </div>

      {/* Nav */}
      <nav className="flex-1 space-y-1">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const disabled = (item.id === "simulate" || item.id === "improve") && !hasResults;
          const active = activeTab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => !disabled && setActiveTab(item.id)}
              title={disabled ? "Run an analysis first" : item.label}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-2xl text-sm font-semibold transition-colors
                ${active
                  ? "bg-blue-50 text-blue-700"
                  : disabled
                    ? "text-slate-300 cursor-not-allowed"
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"}`}
            >
              <Icon
                className={`h-5 w-5 shrink-0 ${active ? "text-blue-600" : ""}`}
                strokeWidth={2.25}
              />
              <span className="flex-1 text-left">{item.label}</span>
              {active && (
                <span className="h-2 w-2 rounded-full bg-blue-500" />
              )}
            </button>
          );
        })}
      </nav>

      {/* Profile dock */}
      <div className="relative pt-3 border-t border-slate-100" ref={menuRef}>
        {menuOpen && (
          <div className="absolute bottom-full left-0 right-0 mb-2 bg-white border border-slate-200 rounded-2xl shadow-lg p-2 z-10">
            <div className="px-3 py-2 border-b border-slate-100 mb-1">
              <div className="text-sm font-bold text-slate-900 truncate">{profile.name}</div>
              {profile.email && (
                <div className="text-xs text-slate-500 truncate">{profile.email}</div>
              )}
            </div>
            <button
              className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium text-slate-700 hover:bg-slate-50"
              onClick={() => { setMenuOpen(false); setActiveTab("settings"); }}
            >
              <Settings className="h-4 w-4" strokeWidth={2.25} />
              Settings
            </button>
            <button
              className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium text-rose-600 hover:bg-rose-50"
              onClick={() => { setMenuOpen(false); onSignOut(); }}
            >
              <LogOut className="h-4 w-4" strokeWidth={2.25} />
              Sign out
            </button>
          </div>
        )}

        <button
          onClick={() => setMenuOpen((v) => !v)}
          className={`w-full flex items-center gap-3 px-2 py-2 rounded-2xl transition-colors
            ${menuOpen ? "bg-slate-100" : "hover:bg-slate-50"}`}
        >
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-500 text-white text-sm font-bold">
            {profileInitials(profile.name)}
          </span>
          <span className="flex-1 min-w-0 text-left">
            <span className="block text-sm font-bold text-slate-900 truncate">
              {profileFirstName(profile.name)}
            </span>
            <span className="block text-[11px] text-slate-500 truncate">Local profile</span>
          </span>
          <ChevronUp
            className={`h-4 w-4 text-slate-400 shrink-0 transition-transform duration-200
              ${menuOpen ? "" : "rotate-180"}`}
            strokeWidth={2.5}
          />
        </button>
      </div>
    </aside>
  );
}
