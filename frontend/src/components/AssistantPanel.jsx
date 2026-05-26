import { useState, useRef, useEffect } from "react";
import { X, Send, Sparkles, Loader2 } from "lucide-react";
import { useTutorStream } from "../hooks/useTutorStream";
import { ToolStatusPill, LessonCard, SnapshotCard } from "./AgentTools";

const SUGGESTED = [
  "Why is my downside capture so high?",
  "What's my biggest risk right now?",
  "What happens if I cut my top holding by 50%?",
  "Am I beating the market or just riding beta?",
];

export default function AssistantPanel({ isOpen, onClose, lastResults, lastPayload, prefillInput, setActiveTab }) {
  const stream = useTutorStream({ endpoint: "chat", lastResults, lastPayload });
  const [input, setInput] = useState("");
  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  const hasPortfolio = !!(lastResults && lastPayload);

  useEffect(() => { if (isOpen) inputRef.current?.focus(); }, [isOpen]);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [stream.messages]);

  // When LiveTutor (or any caller) opens the panel with a suggested prompt,
  // drop that text into the input. Fires on every change so repeated clicks
  // of the same chip still re-prefill.
  useEffect(() => {
    if (isOpen && prefillInput) {
      setInput(prefillInput);
      requestAnimationFrame(() => inputRef.current?.focus());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, prefillInput]);

  function handleOpenLesson() {
    if (!setActiveTab) return;
    onClose?.();
    setActiveTab("practice");
  }

  function send(text) {
    if (!text.trim() || stream.streaming) return;
    setInput("");
    stream.send(text);
  }

  function handleSubmit(e) {
    e.preventDefault();
    send(input.trim());
  }

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-neutral-900/30 backdrop-blur-sm z-40 transition-opacity duration-300"
        style={{
          opacity: isOpen ? 1 : 0,
          pointerEvents: isOpen ? "auto" : "none",
        }}
      />

      {/* Drawer — transform via inline style so we don't depend on
          Tailwind's purge picking up dynamic `translate-x-full` correctly. */}
      <div
        className="fixed top-0 right-0 bottom-0 w-full sm:w-[440px] bg-white border-l border-neutral-200 z-50 flex flex-col transition-transform duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] shadow-2xl"
        style={{
          transform: isOpen ? "translateX(0)" : "translateX(100%)",
        }}
      >
        {/* Header */}
        <header className="flex items-center justify-between px-5 py-4 border-b border-neutral-200">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-neutral-900 text-white">
              <Sparkles className="h-4 w-4" strokeWidth={2.5} />
            </div>
            <div className="min-w-0">
              <div className="font-semibold text-neutral-900 tracking-tight">Assistant</div>
              {hasPortfolio && (
                <div className="text-xs text-neutral-500 truncate font-mono">
                  Loaded: {lastResults.tickers.join(", ")}
                </div>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-md text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900 transition-colors"
          >
            <X className="h-5 w-5" strokeWidth={2.5} />
          </button>
        </header>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {stream.messages.length === 0 && (
            <div className="py-6">
              {hasPortfolio ? (
                <>
                  <p className="text-base font-semibold text-neutral-900 mb-1 tracking-tight">Ask anything about your portfolio.</p>
                  <p className="text-sm text-neutral-500 mb-4">Try one of these:</p>
                  <div className="space-y-2">
                    {SUGGESTED.map((s) => (
                      <button
                        key={s}
                        onClick={() => send(s)}
                        className="w-full text-left px-4 py-3 rounded-md bg-white border border-neutral-200 text-sm font-medium text-neutral-700 hover:border-neutral-900 hover:bg-neutral-900 hover:text-white transition-colors"
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </>
              ) : (
                <>
                  <p className="text-base font-semibold text-neutral-900 mb-1 tracking-tight">Ask anything.</p>
                  <p className="text-sm text-neutral-500 mb-4">No portfolio loaded yet — we can still talk through concepts. Try:</p>
                  <div className="space-y-2">
                    {[
                      "What's a Sharpe ratio in plain English?",
                      "How should I think about diversification?",
                      "What does beta actually mean for my returns?",
                    ].map((s) => (
                      <button
                        key={s}
                        onClick={() => send(s)}
                        className="w-full text-left px-4 py-3 rounded-md bg-white border border-neutral-200 text-sm font-medium text-neutral-700 hover:border-neutral-900 hover:bg-neutral-900 hover:text-white transition-colors"
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
            {stream.messages.map((m, i) => (
              <div key={i}>
                <div className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div
                    className={`max-w-[85%] rounded-md px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap
                      ${m.role === "user"
                        ? "bg-neutral-900 text-white"
                        : "bg-neutral-100 text-neutral-900"}`}
                  >
                    {m.content || (stream.streaming && i === stream.messages.length - 1 ? (
                      <span className="inline-flex gap-1">
                        <span className="h-1.5 w-1.5 rounded-full bg-neutral-400 animate-pulse" />
                        <span className="h-1.5 w-1.5 rounded-full bg-neutral-400 animate-pulse" style={{ animationDelay: "150ms" }} />
                        <span className="h-1.5 w-1.5 rounded-full bg-neutral-400 animate-pulse" style={{ animationDelay: "300ms" }} />
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

        <ToolStatusPill status={stream.toolStatus} />

        {/* Input */}
        <form onSubmit={handleSubmit} className="px-5 py-4 border-t border-neutral-200 flex gap-2">
          <input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={hasPortfolio ? "Ask about your portfolio…" : "Ask anything about investing…"}
            disabled={stream.streaming}
            className="flex-1 bg-neutral-50 border border-neutral-200 rounded-md px-4 py-3 text-sm font-medium text-neutral-900 placeholder:text-neutral-500 outline-none focus:bg-white focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900 transition-colors disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={!input.trim() || stream.streaming}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-neutral-900 hover:bg-neutral-800 disabled:bg-neutral-200 disabled:text-neutral-500 text-white transition-colors active:scale-[0.95]"
          >
            {stream.streaming ? <Loader2 className="h-4 w-4 animate-spin" strokeWidth={2.5} /> : <Send className="h-4 w-4" strokeWidth={2.5} />}
          </button>
        </form>
      </div>
    </>
  );
}
