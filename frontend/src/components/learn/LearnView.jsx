import { useState } from "react";
import { ArrowLeft, BookOpen, Clock } from "lucide-react";
import Panel from "../layout/Panel";
import { LESSONS, getLesson } from "./lessons";

export default function LearnView() {
  const [activeId, setActiveId] = useState(null);
  const lesson = activeId ? getLesson(activeId) : null;

  if (lesson) {
    return (
      <div className="max-w-3xl">
        <button
          onClick={() => setActiveId(null)}
          className="inline-flex items-center gap-1.5 font-mono text-[11px] tracking-wider text-zinc-400 hover:text-amber-400 mb-4"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> ALL LESSONS
        </button>
        <Panel title={lesson.title.toUpperCase()} sub={lesson.summary}>
          <div className="font-mono text-[10px] tracking-widest text-zinc-500 mb-5 flex items-center gap-1.5">
            <Clock className="w-3 h-3" /> {lesson.minutes} MIN READ
          </div>
          <div className="space-y-5">
            {lesson.sections.map((s, i) => (
              <div key={i}>
                <div className="font-mono text-[11px] tracking-widest text-amber-400 mb-1.5">
                  {String(i + 1).padStart(2, "0")} · {s.h.toUpperCase()}
                </div>
                <p className="text-[13px] text-zinc-300 leading-relaxed">{s.body}</p>
              </div>
            ))}
          </div>
        </Panel>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Panel title="QUANT CONCEPTS" sub="Short, opinionated explainers on the metrics this app shows. Read before you trust a number.">
        <div className="grid sm:grid-cols-2 gap-2.5">
          {LESSONS.map((l) => (
            <button
              key={l.id}
              onClick={() => setActiveId(l.id)}
              className="text-left p-3.5 rounded border border-zinc-800 bg-zinc-950 hover:border-amber-500/40 hover:bg-zinc-900/40 transition-all"
            >
              <div className="flex items-center gap-2">
                <BookOpen className="w-3.5 h-3.5 text-amber-400" />
                <span className="font-mono text-[11px] tracking-wider text-zinc-100">{l.title}</span>
              </div>
              <p className="mt-2 text-[12px] text-zinc-400 leading-relaxed">{l.summary}</p>
              <div className="mt-2.5 font-mono text-[10px] tracking-widest text-zinc-500">
                {l.minutes} MIN
              </div>
            </button>
          ))}
        </div>
      </Panel>
    </div>
  );
}
