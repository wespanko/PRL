import { useState, useRef, useEffect } from "react";
import { X, Send, Sparkles, Loader2 } from "lucide-react";
import { buildPortfolioContext } from "../utils/portfolioContext";
import { streamTutorEvents, getCompletedLessonIds } from "../utils/streamTutorEvents";
import { saveSnapshot } from "../utils/snapshots";
import { ToolStatusPill, LessonCard, SnapshotCard } from "./AgentTools";

const SUGGESTED = [
  "Why is my downside capture so high?",
  "What's my biggest risk right now?",
  "What happens if I cut my top holding by 50%?",
  "Am I beating the market or just riding beta?",
];

export default function AssistantPanel({ isOpen, onClose, lastResults, lastPayload, prefillInput, setActiveTab }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [toolStatus, setToolStatus] = useState(null);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => { if (isOpen) inputRef.current?.focus(); }, [isOpen]);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  // When LiveTutor (or any caller) opens the panel with a suggested
  // prompt, drop that text into the input. We fire on every change so
  // repeated clicks of the same chip still re-prefill.
  useEffect(() => {
    if (isOpen && prefillInput) {
      setInput(prefillInput);
      // Focus + select so user can edit or hit Enter immediately
      requestAnimationFrame(() => inputRef.current?.focus());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, prefillInput]);

  const context = buildPortfolioContext(lastResults, lastPayload);
  const hasPortfolio = !!context;

  function handleOpenLesson(lessonId) {
    if (!setActiveTab) return;
    onClose?.();
    setActiveTab("practice");
  }

  async function send(text) {
    const userMsg = { role: "user", content: text };
    const history = [...messages, userMsg];
    setMessages([...history, { role: "assistant", content: "" }]);
    setInput("");
    setStreaming(true);
    setToolStatus(null);

    const BASE = import.meta.env.VITE_API_URL ?? "";
    const body = {
      messages: history,
      portfolio_context: context,
      saved_payload: hasPortfolio ? lastPayload : null,
      lessons_completed: getCompletedLessonIds(),
    };

    let accumulated = "";
    try {
      for await (const ev of streamTutorEvents(`${BASE}/api/chat`, body)) {
        if (ev.kind === "tool_use") {
          setToolStatus(ev.status);
        } else if (ev.kind === "tool_ui") {
          // Hide the pill the moment the tool result comes back.
          setToolStatus(null);
          if (ev.tool === "save_snapshot" && hasPortfolio) {
            try {
              saveSnapshot(lastPayload, lastResults, ev.payload?.label, ev.payload?.note);
            } catch { /* localStorage full — ignore */ }
          }
          // Attach the card payload to the in-flight assistant message.
          setMessages((prev) => {
            const updated = [...prev];
            const last = { ...updated[updated.length - 1] };
            if (ev.tool === "suggest_lesson")  last.lessonCard   = ev.payload;
            if (ev.tool === "save_snapshot")   last.snapshotCard = ev.payload;
            updated[updated.length - 1] = last;
            return updated;
          });
        } else if (ev.kind === "text") {
          // First text chunk after a tool means the model is narrating —
          // pill should already be gone, but make sure.
          if (toolStatus) setToolStatus(null);
          accumulated += ev.text;
          setMessages((prev) => {
            const updated = [...prev];
            updated[updated.length - 1] = {
              ...updated[updated.length - 1],
              content: accumulated,
            };
            return updated;
          });
        }
      }
    } finally {
      setStreaming(false);
      setToolStatus(null);
    }
  }

  function handleSubmit(e) {
    e.preventDefault();
    if (input.trim() && !streaming) send(input.trim());
  }

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-slate-900/30 backdrop-blur-sm z-40 transition-opacity duration-300"
        style={{
          opacity: isOpen ? 1 : 0,
          pointerEvents: isOpen ? "auto" : "none",
        }}
      />

      {/* Drawer — transform via inline style so we don't depend on
          Tailwind's purge picking up dynamic `translate-x-full` correctly. */}
      <div
        className="fixed top-0 right-0 bottom-0 w-full sm:w-[440px] bg-white border-l border-slate-200 z-50 flex flex-col transition-transform duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] shadow-2xl"
        style={{
          transform: isOpen ? "translateX(0)" : "translateX(100%)",
        }}
      >
        {/* Header */}
        <header className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
              <Sparkles className="h-4 w-4" strokeWidth={2.5} />
            </div>
            <div className="min-w-0">
              <div className="font-extrabold text-slate-900">Assistant</div>
              {hasPortfolio && (
                <div className="text-xs text-slate-500 truncate font-mono">
                  Loaded: {lastResults.tickers.join(", ")}
                </div>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100 hover:text-slate-900 transition-colors"
          >
            <X className="h-5 w-5" strokeWidth={2.5} />
          </button>
        </header>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {messages.length === 0 && (
            <div className="py-6">
              {hasPortfolio ? (
                <>
                  <p className="text-base font-bold text-slate-900 mb-1">Ask anything about your portfolio.</p>
                  <p className="text-sm text-slate-500 mb-4">Try one of these:</p>
                  <div className="space-y-2">
                    {SUGGESTED.map((s) => (
                      <button
                        key={s}
                        onClick={() => send(s)}
                        className="w-full text-left px-4 py-3 rounded-lg bg-slate-50 border border-slate-200 text-sm font-medium text-slate-500 hover:border-indigo-300 hover:bg-indigo-50/50 hover:text-slate-900 transition-colors"
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </>
              ) : (
                <>
                  <p className="text-base font-bold text-slate-900 mb-1">Ask anything.</p>
                  <p className="text-sm text-slate-500 mb-4">No portfolio loaded yet — we can still talk through concepts. Try:</p>
                  <div className="space-y-2">
                    {[
                      "What's a Sharpe ratio in plain English?",
                      "How should I think about diversification?",
                      "What does beta actually mean for my returns?",
                    ].map((s) => (
                      <button
                        key={s}
                        onClick={() => send(s)}
                        className="w-full text-left px-4 py-3 rounded-lg bg-slate-50 border border-slate-200 text-sm font-medium text-slate-500 hover:border-indigo-300 hover:bg-indigo-50/50 hover:text-slate-900 transition-colors"
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}

          <div className="space-y-3">
            {messages.map((m, i) => (
              <div key={i}>
                <div className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div
                    className={`max-w-[85%] rounded-lg px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap
                      ${m.role === "user"
                        ? "bg-indigo-600 text-white"
                        : "bg-slate-100 text-slate-900"}`}
                  >
                    {m.content || (streaming && i === messages.length - 1 ? (
                      <span className="inline-flex gap-1">
                        <span className="h-2 w-2 rounded-full bg-slate-400 animate-pulse" />
                        <span className="h-2 w-2 rounded-full bg-slate-400 animate-pulse" style={{ animationDelay: "150ms" }} />
                        <span className="h-2 w-2 rounded-full bg-slate-400 animate-pulse" style={{ animationDelay: "300ms" }} />
                      </span>
                    ) : "")}
                  </div>
                </div>
                {m.lessonCard && (
                  <div className="flex justify-start mt-1">
                    <div className="max-w-[85%] w-full">
                      <LessonCard payload={m.lessonCard} onOpenLesson={handleOpenLesson} />
                    </div>
                  </div>
                )}
                {m.snapshotCard && (
                  <div className="flex justify-start mt-1">
                    <div className="max-w-[85%] w-full">
                      <SnapshotCard payload={m.snapshotCard} />
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
          <div ref={bottomRef} />
        </div>

        <ToolStatusPill status={toolStatus} />

        {/* Input */}
        <form onSubmit={handleSubmit} className="px-5 py-4 border-t border-slate-200 flex gap-2">
          <input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={hasPortfolio ? "Ask about your portfolio…" : "Ask anything about investing…"}
            disabled={streaming}
            className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 text-sm font-medium text-slate-900 placeholder:text-slate-500 outline-none focus:bg-white focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 transition-colors disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={!input.trim() || streaming}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-200 disabled:text-slate-500 text-white transition-colors active:scale-[0.95]"
          >
            {streaming ? <Loader2 className="h-4 w-4 animate-spin" strokeWidth={2.5} /> : <Send className="h-4 w-4" strokeWidth={2.5} />}
          </button>
        </form>
      </div>
    </>
  );
}
