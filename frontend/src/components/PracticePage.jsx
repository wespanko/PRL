import { useState, useMemo } from "react";
import {
  Check, X, Star, Flame, Trophy, ChevronLeft, Lock, Zap, ArrowRight,
  Heart, HeartCrack, RotateCcw,
} from "lucide-react";
import { LESSONS, TOTAL_XP_AVAILABLE } from "../data/lessons";
import {
  getProgress, isLessonCompleted, isLessonUnlocked, recordLessonComplete,
} from "../utils/practiceProgress";

const LESSON_ORDER = LESSONS.map((l) => l.id);

// ────────────────────────────────────────────────────────────────────
// PATH VIEW — winding circles like Duolingo
// ────────────────────────────────────────────────────────────────────
function PathView({ onPick, progress }) {
  const totalXp = progress.xp ?? 0;
  const streak = progress.streak ?? 0;

  return (
    <div className="px-6 py-10 md:px-10 max-w-2xl mx-auto">
      {/* Header */}
      <header className="mb-8">
        <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-slate-900 mb-2">
          Practice
        </h1>
        <p className="text-slate-500 text-base md:text-lg leading-relaxed">
          Learn the math behind your portfolio one bite-sized lesson at a time.
        </p>
      </header>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3 mb-10">
        <StatCard icon={Zap}    tone="blue"   label="Total XP"  value={`${totalXp}`}   sub={`/ ${TOTAL_XP_AVAILABLE}`} />
        <StatCard icon={Flame}  tone="orange" label="Streak"    value={streak}         sub={streak === 1 ? "day" : "days"} />
        <StatCard icon={Trophy} tone="amber"  label="Lessons"   value={`${Object.keys(progress.completedLessons ?? {}).length}`} sub={`/ ${LESSONS.length}`} />
      </div>

      {/* Winding lesson path */}
      <div className="relative">
        {LESSONS.map((lesson, i) => {
          const completed = isLessonCompleted(lesson.id);
          const unlocked = isLessonUnlocked(lesson.id, LESSON_ORDER);
          const Icon = lesson.icon;
          // Alternate left/center/right offset for the winding feel
          const offset = i % 4 === 0 ? "ml-0"
                        : i % 4 === 1 ? "ml-24"
                        : i % 4 === 2 ? "ml-32"
                        :               "ml-16";

          return (
            <div key={lesson.id} className={`flex items-center gap-4 mb-7 ${offset}`}>
              <button
                onClick={() => unlocked && onPick(lesson)}
                disabled={!unlocked}
                className={`relative shrink-0 flex h-20 w-20 items-center justify-center rounded-full transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] active:scale-95 disabled:active:scale-100
                  ${completed
                    ? "bg-blue-500 text-white shadow-lg shadow-blue-200"
                    : unlocked
                      ? "bg-white text-blue-500 border-4 border-blue-500 hover:scale-105"
                      : "bg-slate-100 text-slate-300 border-4 border-slate-200 cursor-not-allowed"}`}
              >
                {!unlocked ? (
                  <Lock className="h-7 w-7" strokeWidth={2.5} />
                ) : (
                  <Icon className="h-9 w-9" strokeWidth={2.25} />
                )}
                {completed && (
                  <div className="absolute -top-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full bg-amber-400 border-2 border-white shadow-sm">
                    <Star className="h-4 w-4 text-white fill-white" strokeWidth={2.5} />
                  </div>
                )}
              </button>

              <div className="flex-1 min-w-0">
                <h3 className={`font-extrabold text-base ${unlocked ? "text-slate-900" : "text-slate-400"}`}>
                  {lesson.title}
                </h3>
                <p className={`text-sm leading-snug ${unlocked ? "text-slate-500" : "text-slate-400"}`}>
                  {lesson.subtitle}
                </p>
                {unlocked && (
                  <div className="mt-1 text-[11px] font-bold uppercase tracking-wider text-blue-600">
                    {completed ? "Practiced · tap to retry" : "Tap to start"}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-10 rounded-3xl bg-blue-50 border border-blue-200 p-5 flex gap-3 items-start">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-500 text-white">
          <Zap className="h-4 w-4" strokeWidth={2.5} />
        </div>
        <div className="text-sm text-blue-950 leading-relaxed">
          <strong>How XP works:</strong> Each correct answer is 10 XP. Master a lesson with a perfect run to earn the gold star. Come back daily to keep your streak alive.
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, tone, label, value, sub }) {
  const tones = {
    blue:   { bg: "bg-blue-100",   color: "text-blue-600",   value: "text-blue-700"   },
    orange: { bg: "bg-orange-100", color: "text-orange-600", value: "text-orange-700" },
    amber:  { bg: "bg-amber-100",  color: "text-amber-600",  value: "text-amber-700"  },
  }[tone];
  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-3 flex items-center gap-2.5">
      <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${tones.bg} ${tones.color}`}>
        <Icon className="h-4 w-4" strokeWidth={2.5} />
      </div>
      <div className="min-w-0">
        <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{label}</div>
        <div className="flex items-baseline gap-1">
          <span className={`text-lg font-extrabold tabular-nums leading-none ${tones.value}`}>{value}</span>
          {sub && <span className="text-xs text-slate-400 font-semibold">{sub}</span>}
        </div>
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────
// LESSON PLAYER — one exercise at a time
// ────────────────────────────────────────────────────────────────────
const MAX_HEARTS = 5;

function LessonPlayer({ lesson, onExit, onComplete }) {
  const [idx, setIdx] = useState(0);
  const [selected, setSelected] = useState(null);
  const [numericInput, setNumericInput] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [correctCount, setCorrectCount] = useState(0);
  const [finished, setFinished] = useState(false);
  const [hearts, setHearts] = useState(MAX_HEARTS);
  const [failed, setFailed] = useState(false);

  const ex = lesson.exercises[idx];
  const total = lesson.exercises.length;
  const progressPct = ((idx + (submitted ? 1 : 0.5)) / total) * 100;

  const isCorrect = useMemo(() => {
    if (!submitted) return null;
    if (ex.type === "mc")      return selected === ex.correctIndex;
    if (ex.type === "tf")      return selected === ex.correct;
    if (ex.type === "numeric") {
      const num = parseFloat(numericInput);
      if (!Number.isFinite(num)) return false;
      return Math.abs(num - ex.answer) <= (ex.tolerance ?? 0.01);
    }
    return false;
  }, [submitted, selected, numericInput, ex]);

  const canSubmit = (() => {
    if (submitted) return false;
    if (ex.type === "mc")      return selected !== null;
    if (ex.type === "tf")      return selected !== null;
    if (ex.type === "numeric") return numericInput.trim() !== "";
    return false;
  })();

  function handleCheck() {
    if (!canSubmit) return;
    setSubmitted(true);
  }

  function handleContinue() {
    let nextCorrect = correctCount;
    let nextHearts = hearts;
    if (isCorrect) {
      nextCorrect = correctCount + 1;
      setCorrectCount(nextCorrect);
    } else {
      nextHearts = Math.max(0, hearts - 1);
      setHearts(nextHearts);
      // Out of hearts → fail the lesson, no XP recorded
      if (nextHearts === 0) {
        setFailed(true);
        return;
      }
    }
    if (idx < total - 1) {
      setIdx(idx + 1);
      setSelected(null);
      setNumericInput("");
      setSubmitted(false);
    } else {
      const xpEarned = nextCorrect * 10;
      recordLessonComplete(lesson.id, nextCorrect, total, xpEarned);
      setFinished(true);
      setTimeout(() => onComplete(nextCorrect, total, xpEarned), 0);
    }
  }

  function handleRetry() {
    setIdx(0);
    setSelected(null);
    setNumericInput("");
    setSubmitted(false);
    setCorrectCount(0);
    setHearts(MAX_HEARTS);
    setFailed(false);
    setFinished(false);
  }

  // Failed (out of hearts)
  if (failed) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center px-6 py-10 text-center">
        <div className="flex h-24 w-24 items-center justify-center rounded-full mb-6 bg-rose-500 text-white shadow-lg shadow-rose-200">
          <HeartCrack className="h-12 w-12" strokeWidth={2.25} />
        </div>
        <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight text-slate-900 mb-2">
          Out of hearts!
        </h2>
        <p className="text-slate-500 text-base md:text-lg mb-8 max-w-md leading-relaxed">
          No worries — review the explanations and try again. You got {correctCount} of {idx + 1} right before running out.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 w-full max-w-sm">
          <button
            onClick={handleRetry}
            className="flex-1 bg-blue-500 hover:bg-blue-600 text-white rounded-2xl font-bold text-base py-4 flex items-center justify-center gap-2 transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] active:scale-[0.99] shadow-md shadow-blue-200"
          >
            <RotateCcw className="h-4 w-4" strokeWidth={2.5} />
            Try again
          </button>
          <button
            onClick={onExit}
            className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl font-bold text-base py-4 transition-colors"
          >
            Back to path
          </button>
        </div>
      </div>
    );
  }

  if (finished) {
    const finalCorrect = correctCount + (isCorrect ? 1 : 0);
    const xpEarned = finalCorrect * 10;
    const perfect = finalCorrect === total;
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center px-6 py-10 text-center">
        <div className={`flex h-24 w-24 items-center justify-center rounded-full mb-6
          ${perfect ? "bg-amber-400" : "bg-blue-500"} text-white shadow-lg`}>
          {perfect ? <Trophy className="h-12 w-12" strokeWidth={2.25} /> : <Star className="h-12 w-12 fill-white" strokeWidth={2.25} />}
        </div>
        <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight text-slate-900 mb-2">
          {perfect ? "Perfect run!" : "Lesson complete!"}
        </h2>
        <p className="text-slate-500 text-base md:text-lg mb-8 max-w-md leading-relaxed">
          You answered {finalCorrect} of {total} correctly and earned <strong className="text-blue-600">{xpEarned} XP</strong>.
        </p>
        <button
          onClick={onExit}
          className="bg-blue-500 hover:bg-blue-600 text-white rounded-2xl font-bold text-base px-8 py-4 flex items-center gap-2 transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] active:scale-[0.99] shadow-md shadow-blue-200"
        >
          Back to path
          <ArrowRight className="h-4 w-4" strokeWidth={2.5} />
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Top bar: close + progress + hearts */}
      <div className="px-6 py-4 flex items-center gap-4 border-b border-slate-100">
        <button
          onClick={onExit}
          className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors shrink-0"
        >
          <X className="h-5 w-5" strokeWidth={2.5} />
        </button>
        <div className="flex-1 h-2.5 bg-slate-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-blue-500 rounded-full transition-all duration-500 ease-out"
            style={{ width: `${progressPct}%` }}
          />
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <Heart
            className={`h-5 w-5 transition-all duration-300 ${hearts > 0 ? "text-rose-500 fill-rose-500" : "text-slate-300"}`}
            strokeWidth={2.5}
          />
          <span className="text-sm font-extrabold tabular-nums text-slate-700">
            {hearts}
          </span>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 px-6 py-8 md:py-12 flex flex-col max-w-2xl w-full mx-auto">
        <div className="text-xs font-bold uppercase tracking-wider text-blue-600 mb-2">
          {ex.type === "mc" && "Pick the right answer"}
          {ex.type === "tf" && "True or false"}
          {ex.type === "numeric" && "Type the answer"}
        </div>
        <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight text-slate-900 mb-8 leading-tight">
          {ex.question}
        </h2>

        {/* Answer interface */}
        {ex.type === "mc" && (
          <div className="space-y-3 mb-auto">
            {ex.options.map((opt, i) => {
              const isPicked = selected === i;
              const isRight = submitted && i === ex.correctIndex;
              const isWrong = submitted && isPicked && i !== ex.correctIndex;
              return (
                <button
                  key={i}
                  onClick={() => !submitted && setSelected(i)}
                  disabled={submitted}
                  className={`w-full text-left flex items-center gap-3 p-4 rounded-2xl border-2 font-semibold transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)]
                    ${isRight
                      ? "bg-blue-50 border-blue-500 text-blue-900"
                      : isWrong
                        ? "bg-rose-50 border-rose-500 text-rose-900"
                        : isPicked
                          ? "bg-blue-50 border-blue-500 text-slate-900"
                          : "bg-white border-slate-200 hover:border-slate-300 text-slate-700"}
                    ${submitted ? "cursor-default" : "active:scale-[0.99]"}`}
                >
                  <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-sm font-extrabold
                    ${isRight ? "bg-blue-500 text-white"
                      : isWrong ? "bg-rose-500 text-white"
                      : isPicked ? "bg-blue-500 text-white"
                      : "bg-slate-100 text-slate-500"}`}>
                    {String.fromCharCode(65 + i)}
                  </span>
                  <span className="flex-1">{opt}</span>
                  {isRight && <Check className="h-5 w-5 text-blue-600 shrink-0" strokeWidth={3} />}
                  {isWrong && <X className="h-5 w-5 text-rose-600 shrink-0" strokeWidth={3} />}
                </button>
              );
            })}
          </div>
        )}

        {ex.type === "tf" && (
          <div className="grid grid-cols-2 gap-3 mb-auto">
            {[
              { val: true,  label: "True"  },
              { val: false, label: "False" },
            ].map(({ val, label }) => {
              const isPicked = selected === val;
              const isRight = submitted && val === ex.correct;
              const isWrong = submitted && isPicked && val !== ex.correct;
              return (
                <button
                  key={label}
                  onClick={() => !submitted && setSelected(val)}
                  disabled={submitted}
                  className={`p-8 rounded-2xl border-2 font-extrabold text-lg transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)]
                    ${isRight
                      ? "bg-blue-50 border-blue-500 text-blue-900"
                      : isWrong
                        ? "bg-rose-50 border-rose-500 text-rose-900"
                        : isPicked
                          ? "bg-blue-50 border-blue-500 text-slate-900"
                          : "bg-white border-slate-200 hover:border-slate-300 text-slate-700"}
                    ${submitted ? "cursor-default" : "active:scale-[0.99]"}`}
                >
                  {label}
                </button>
              );
            })}
          </div>
        )}

        {ex.type === "numeric" && (
          <div className="mb-auto">
            <div className="flex items-center gap-3">
              <input
                type="number"
                step="any"
                value={numericInput}
                onChange={(e) => setNumericInput(e.target.value)}
                disabled={submitted}
                autoFocus
                placeholder="Type your answer"
                className={`flex-1 bg-white border-2 rounded-2xl px-5 py-4 text-2xl font-extrabold tabular-nums text-slate-900 placeholder:text-slate-300 placeholder:font-medium outline-none transition-colors
                  ${submitted
                    ? isCorrect
                      ? "border-blue-500 bg-blue-50"
                      : "border-rose-500 bg-rose-50"
                    : "border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"}`}
                onKeyDown={(e) => { if (e.key === "Enter" && canSubmit) handleCheck(); }}
              />
              {ex.unit && (
                <span className="text-2xl font-extrabold text-slate-400 shrink-0">{ex.unit}</span>
              )}
            </div>
            {submitted && !isCorrect && (
              <p className="mt-3 text-sm font-semibold text-rose-700">
                Correct answer: <span className="tabular-nums">{ex.answer}{ex.unit ?? ""}</span>
              </p>
            )}
          </div>
        )}

        {/* Feedback panel + actions (footer-pinned) */}
        <div className="mt-8">
          {submitted && (
            <div className={`rounded-2xl p-5 mb-4 border
              ${isCorrect ? "bg-blue-50 border-blue-200" : "bg-rose-50 border-rose-200"}`}>
              <div className="flex items-center gap-2 mb-2">
                <div className={`flex h-7 w-7 items-center justify-center rounded-lg text-white
                  ${isCorrect ? "bg-blue-500" : "bg-rose-500"}`}>
                  {isCorrect ? <Check className="h-4 w-4" strokeWidth={3} /> : <X className="h-4 w-4" strokeWidth={3} />}
                </div>
                <h4 className={`font-extrabold text-sm uppercase tracking-wide
                  ${isCorrect ? "text-blue-900" : "text-rose-900"}`}>
                  {isCorrect ? "Nice work" : "Not quite"}
                </h4>
              </div>
              <p className={`text-sm leading-relaxed ${isCorrect ? "text-blue-950" : "text-rose-950"}`}>
                {ex.explanation}
              </p>
            </div>
          )}

          {!submitted ? (
            <button
              onClick={handleCheck}
              disabled={!canSubmit}
              className="w-full bg-blue-500 hover:bg-blue-600 disabled:bg-slate-200 disabled:text-slate-400 text-white rounded-2xl font-extrabold text-base py-4 transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] active:scale-[0.99] shadow-md shadow-blue-200 disabled:shadow-none uppercase tracking-wide"
            >
              Check
            </button>
          ) : (
            <button
              onClick={handleContinue}
              className={`w-full text-white rounded-2xl font-extrabold text-base py-4 transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] active:scale-[0.99] shadow-md uppercase tracking-wide flex items-center justify-center gap-2
                ${isCorrect ? "bg-blue-500 hover:bg-blue-600 shadow-blue-200" : "bg-rose-500 hover:bg-rose-600 shadow-rose-200"}`}
            >
              Continue
              <ArrowRight className="h-4 w-4" strokeWidth={3} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────
// ENTRY
// ────────────────────────────────────────────────────────────────────
export default function PracticePage() {
  const [activeLesson, setActiveLesson] = useState(null);
  const [progressTick, setProgressTick] = useState(0);
  const progress = useMemo(() => getProgress(), [progressTick, activeLesson]);

  if (activeLesson) {
    return (
      <LessonPlayer
        lesson={activeLesson}
        onExit={() => { setActiveLesson(null); setProgressTick((t) => t + 1); }}
        onComplete={() => { /* exit handled in onExit */ }}
      />
    );
  }

  return <PathView onPick={setActiveLesson} progress={progress} />;
}
