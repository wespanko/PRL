/**
 * Shared chat-surface UI for the tutor agent loop:
 *   • ToolStatusPill — appears above the composer while a tool is running
 *   • LessonCard     — rendered in the transcript when suggest_lesson fires
 *   • SnapshotCard   — rendered in the transcript when save_snapshot fires
 *
 * All three chat surfaces (AssistantPanel, JustAskChat, LiveTutor screen-share
 * chat) import these so the visual language stays identical regardless of
 * which surface initiated the call.
 */

import { GraduationCap, ArrowRight, Check, BookmarkCheck } from "lucide-react";

export function ToolStatusPill({ status }) {
  if (!status) return null;
  return (
    <div className="px-3 pb-2 -mb-1 flex justify-center pointer-events-none">
      <div
        className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-50 text-indigo-700 text-xs font-semibold border border-indigo-200 shadow-sm animate-pulse-soft"
        role="status"
        aria-live="polite"
      >
        <span className="relative flex h-1.5 w-1.5">
          <span className="absolute inline-flex h-full w-full rounded-full bg-indigo-500 opacity-75 animate-ping" />
          <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-indigo-600" />
        </span>
        {status}
      </div>
    </div>
  );
}

export function LessonCard({ payload, onOpenLesson }) {
  if (!payload) return null;
  const { title, reason, lesson_id } = payload;
  return (
    <button
      type="button"
      onClick={() => onOpenLesson?.(lesson_id)}
      className="mt-2 w-full text-left rounded-xl border border-indigo-200 bg-white hover:bg-indigo-50 px-3.5 py-3 flex items-center gap-3 transition-colors group"
    >
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 group-hover:bg-indigo-100 transition-colors">
        <GraduationCap className="h-4 w-4" strokeWidth={2.5} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-[10px] font-bold uppercase tracking-wider text-indigo-600">
          Practice lesson
        </div>
        <div className="text-sm font-semibold text-slate-900 truncate">
          {title}
        </div>
        {reason && (
          <div className="text-xs text-slate-500 leading-snug mt-0.5 line-clamp-2">
            {reason}
          </div>
        )}
      </div>
      <span className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 shrink-0">
        Start lesson
        <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform" strokeWidth={2.5} />
      </span>
    </button>
  );
}

export function SnapshotCard({ payload }) {
  if (!payload) return null;
  const { label, note } = payload;
  return (
    <div className="mt-2 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 flex items-start gap-2.5">
      <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
        <Check className="h-3.5 w-3.5" strokeWidth={3} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-xs font-semibold text-slate-900 truncate">
          <BookmarkCheck className="h-3.5 w-3.5 inline-block -mt-0.5 mr-1 text-slate-500" strokeWidth={2.5} />
          Snapshot saved: <span className="font-bold">{label}</span>
        </div>
        {note && (
          <div className="text-[11px] text-slate-500 leading-snug mt-0.5">
            {note}
          </div>
        )}
      </div>
    </div>
  );
}
