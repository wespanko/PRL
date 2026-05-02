import { useState, useRef, useEffect } from "react";
import { buildPortfolioContext } from "../utils/portfolioContext";

const SUGGESTED = [
  "Why is my downside capture so high?",
  "What's my biggest risk right now?",
  "What happens if I cut my top holding by 50%?",
  "Am I beating the market or just riding beta?",
];

async function* streamChat(messages, context) {
  const BASE = import.meta.env.VITE_API_URL ?? "";
  const res = await fetch(`${BASE}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ messages, portfolio_context: context }),
  });
  if (!res.ok) { yield "Error connecting to assistant."; return; }
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buf = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });
    const parts = buf.split("\n\n");
    buf = parts.pop();
    for (const part of parts) {
      const line = part.trim();
      if (!line.startsWith("data: ")) continue;
      const data = line.slice(6);
      if (data === "[DONE]") return;
      try { yield JSON.parse(data).text ?? ""; } catch { /* ignore malformed */ }
    }
  }
}

export default function AssistantPanel({ isOpen, onClose, lastResults, lastPayload }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (isOpen) inputRef.current?.focus();
  }, [isOpen]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const context = buildPortfolioContext(lastResults, lastPayload);
  const hasPortfolio = !!context;

  async function send(text) {
    const userMsg = { role: "user", content: text };
    const history = [...messages, userMsg];
    setMessages([...history, { role: "assistant", content: "" }]);
    setInput("");
    setStreaming(true);

    let accumulated = "";
    try {
      for await (const chunk of streamChat(history, context)) {
        accumulated += chunk;
        setMessages((prev) => {
          const updated = [...prev];
          updated[updated.length - 1] = { role: "assistant", content: accumulated };
          return updated;
        });
      }
    } finally {
      setStreaming(false);
    }
  }

  function handleSubmit(e) {
    e.preventDefault();
    if (input.trim() && !streaming) send(input.trim());
  }

  return (
    <>
      <div className={`assistant-overlay ${isOpen ? "assistant-overlay--open" : ""}`} onClick={onClose} />
      <div className={`assistant-drawer ${isOpen ? "assistant-drawer--open" : ""}`}>
        <div className="assistant-header">
          <div>
            <div className="assistant-title">Assistant</div>
            {hasPortfolio && (
              <div className="assistant-context-note">
                Loaded: {lastResults.tickers.join(", ")}
              </div>
            )}
          </div>
          <button className="assistant-close" onClick={onClose}>✕</button>
        </div>

        <div className="assistant-messages">
          {messages.length === 0 && (
            <div className="assistant-empty">
              {hasPortfolio ? (
                <>
                  <p className="assistant-empty-title">Ask anything about your portfolio.</p>
                  <div className="assistant-suggested">
                    {SUGGESTED.map((s) => (
                      <button key={s} className="assistant-suggestion" onClick={() => send(s)}>
                        {s}
                      </button>
                    ))}
                  </div>
                </>
              ) : (
                <p className="assistant-empty-title" style={{ color: "#9ca3af" }}>
                  Run an analysis first, then come back to ask questions about your portfolio.
                </p>
              )}
            </div>
          )}

          {messages.map((m, i) => (
            <div key={i} className={`assistant-message assistant-message--${m.role}`}>
              <div className="assistant-bubble">
                {m.content || (streaming && i === messages.length - 1 ? <span className="assistant-typing">▋</span> : "")}
              </div>
            </div>
          ))}
          <div ref={bottomRef} />
        </div>

        <form className="assistant-input-row" onSubmit={handleSubmit}>
          <input
            ref={inputRef}
            className="assistant-input"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={hasPortfolio ? "Ask about your portfolio…" : "Load a portfolio first…"}
            disabled={streaming || !hasPortfolio}
          />
          <button className="btn btn-primary btn-sm" type="submit" disabled={!input.trim() || streaming || !hasPortfolio}>
            {streaming ? <span className="spinner" /> : "→"}
          </button>
        </form>
      </div>
    </>
  );
}
