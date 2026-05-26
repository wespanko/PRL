// Live Tutor — marquee surface, rebuilt against Public/Robinhood-style
// consumer-fintech aesthetic. Warm cream background, soft rounded cards,
// emerald accent on primary actions, pill CTAs, generous whitespace.
//
// Three empty-state sub-views (no active screen share):
//   "default" → returning-user 'Welcome back' OR new-user 3 entry cards
//   "paste"   → inline paste-holdings form
//   "chat"    → in-page Q&A chat using /api/chat
//
// During an active share, the right pane talks to /api/tutor with screen
// snapshots. Two composer actions:
//   Send  → mode="qa"    standard prose response
//   Point → mode="point" prose + JSON bboxes drawn as an SVG overlay
//
// State + SSE wire live in hooks/useScreenShare and hooks/useTutorStream.

import { useState, useRef, useEffect } from "react";
import {
  MonitorUp, MonitorOff, Send, Loader2, AlertTriangle,
  Sparkles, Shield, Camera, Mic, MicOff, GraduationCap, ArrowRight,
  CircleDollarSign, Crosshair, ClipboardList, MessageSquare,
} from "lucide-react";
import AnnotationOverlay from "./AnnotationOverlay";
import { parseBoxes } from "../utils/parseBoxes";
import { normalizeWeights } from "../utils/normalizeWeights";
import { ToolStatusPill, LessonCard, SnapshotCard } from "./AgentTools";
import { useScreenShare } from "../hooks/useScreenShare";
import { useTutorStream } from "../hooks/useTutorStream";

// ── helpers (unchanged from previous build) ───────────────────────────

function parsePastedHoldings(text) {
  if (!text) return [];
  const out = [];
  for (const raw of text.split(/\n+/)) {
    const line = raw.trim();
    if (!line) continue;
    const m = line.match(/^([A-Z][A-Z0-9.\-]*)\s*[,:]?\s*\$?([0-9]+\.?[0-9]*)\s*%?$/i);
    if (!m) continue;
    const ticker = m[1].toUpperCase();
    const value = parseFloat(m[2]);
    if (!Number.isFinite(value) || value <= 0) continue;
    out.push({ ticker, weight: value });
  }
  return out;
}

const SUGGESTED_QUESTIONS = [
  "What am I looking at on this screen?",
  "Explain this chart to me",
  "Is this a buy button? What does it actually do?",
  "What's the risk of this holding?",
];

const COST_PER_QUESTION_USD = 0.025;

const LESSON_PATTERNS = [
  { match: ["upside capture", "downside capture", "capture ratio"], title: "Capture Ratios",        practiceId: "capture" },
  { match: ["value at risk", "var ", "var,", "var.", "cvar"],       title: "Value at Risk",         practiceId: "var" },
  { match: ["correlation"],                                          title: "Correlation",           practiceId: "correlation" },
  { match: ["sharpe ratio", "sharpe"],                               title: "The Sharpe Ratio",     practiceId: "sharpe" },
  { match: ["max drawdown", "drawdown"],                             title: "Drawdowns",             practiceId: "drawdowns" },
  { match: ["beta"],                                                  title: "Beta & Market Risk",   practiceId: "beta" },
  { match: ["diversif", "enp", "concentration"],                     title: "Real Diversification", practiceId: "diversification" },
  { match: ["volatility", "standard deviation"],                     title: "Volatility & Returns", practiceId: "vol_basics" },
];

function detectRelatedLesson(text) {
  if (!text) return null;
  const lower = text.toLowerCase();
  for (const p of LESSON_PATTERNS) {
    if (p.match.some((kw) => lower.includes(kw))) return p;
  }
  return null;
}

function previewProse(content) {
  if (!content) return "";
  const i = content.indexOf("```json");
  if (i === -1) return content;
  return content.slice(0, i).trim();
}

function useVoiceInput(onText) {
  const [listening, setListening] = useState(false);
  const [supported, setSupported] = useState(false);
  const recognitionRef = useRef(null);

  useEffect(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { setSupported(false); return; }
    setSupported(true);
    const r = new SR();
    r.continuous = false;
    r.interimResults = true;
    r.lang = "en-US";
    r.onresult = (event) => {
      let text = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        text += event.results[i][0].transcript;
      }
      onText(text);
    };
    r.onend = () => setListening(false);
    r.onerror = () => setListening(false);
    recognitionRef.current = r;
    return () => { try { r.stop(); } catch {} };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function start() {
    if (!recognitionRef.current) return;
    try { recognitionRef.current.start(); setListening(true); } catch { /* already running */ }
  }
  function stop() {
    try { recognitionRef.current?.stop(); } catch {}
    setListening(false);
  }

  return { listening, supported, start, stop };
}

// ── main page ────────────────────────────────────────────────────────
export default function LiveTutorPage({
  setActiveTab,
  lastResults,
  lastPayload,
  onPasteHoldings,
  analyzeLoading,
  analyzeError,
  onOpenAssistant,
}) {
  const share  = useScreenShare();
  const stream = useTutorStream({ endpoint: "tutor", lastResults, lastPayload });

  const [input, setInput] = useState("");
  const [questionsAsked, setQuestionsAsked] = useState(0);

  const [emptyView, setEmptyView] = useState("default");
  const [pasteText, setPasteText] = useState("");
  const [pasteError, setPasteError] = useState(null);
  const [chatSeed, setChatSeed] = useState("");

  const hasPortfolio = !!(lastResults && lastPayload);

  const inputRef = useRef(null);
  const bottomRef = useRef(null);

  const voice = useVoiceInput((text) => setInput(text));

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [stream.messages]);

  function handleOpenLesson() {
    setActiveTab?.("practice");
  }

  async function send(text, mode = "qa") {
    if (!text.trim() || stream.streaming) return;
    if (!share.sharing) {
      share.setShareError("Share your screen first so I can see what you're looking at.");
      return;
    }
    share.setShareError(null);
    if (voice.listening) voice.stop();

    const frame = share.captureFrame();
    if (!frame) {
      share.setShareError("Couldn't grab a screenshot — make sure your shared window is visible.");
      return;
    }

    setInput("");
    setQuestionsAsked((n) => n + 1);

    await stream.send(text, {
      mode,
      screenshot: frame.dataUrl,
      screenshotBase64: frame.base64,
      onComplete: (accumulated, setMessages) => {
        if (mode !== "point") return;
        const parsed = parseBoxes(accumulated);
        setMessages((prev) => {
          const updated = [...prev];
          const last = updated[updated.length - 1];
          updated[updated.length - 1] = {
            ...last,
            content: parsed.prose || last.content,
            boxes: parsed.boxes,
            parseError: parsed.parseError,
          };
          return updated;
        });
      },
    });
  }

  function handleAsk(e) {
    e?.preventDefault?.();
    send(input.trim(), "qa");
  }

  function handlePoint(e) {
    e?.preventDefault?.();
    send(input.trim(), "point");
  }

  function handleMicToggle() {
    if (voice.listening) voice.stop();
    else { setInput(""); voice.start(); }
  }

  function handlePasteSubmit(e) {
    e?.preventDefault?.();
    if (analyzeLoading) return;
    setPasteError(null);
    const parsed = parsePastedHoldings(pasteText);
    if (parsed.length === 0) {
      setPasteError("I couldn't read any tickers. Use one row per holding: TICKER WEIGHT");
      return;
    }
    const normalized = normalizeWeights(parsed);
    if (normalized.length === 0) {
      setPasteError("Need at least one positive-weight holding.");
      return;
    }
    onPasteHoldings({
      holdings: normalized,
      start_date: "2022-01-01",
      end_date: "2025-01-01",
      benchmark: "SPY",
      risk_free_rate: 0.045,
    });
  }

  const estimatedCost = (questionsAsked * COST_PER_QUESTION_USD).toFixed(2);

  return (
    // Warm cream background — sets the whole product apart from white-on-white
    // generic SaaS. Page never goes edge-to-edge; content stays inside a
    // comfortable max-w container.
    <div className="min-h-screen text-neutral-900 px-6 py-12 md:px-10 md:py-16" style={{ backgroundColor: "#FAF8F2" }}>
      <div className="max-w-4xl mx-auto">

        {/* Hero — a friendly avatar plus a real greeting. Reads as a person,
            not a wordmark. Avatar uses the brand accent (emerald) so the
            accent registers immediately. */}
        {!share.sharing && (
          <header className="mb-12">
            <div className="flex items-center gap-4 mb-6">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500 text-white shadow-[0_8px_24px_rgba(16,185,129,0.25)]">
                <Sparkles className="h-6 w-6" strokeWidth={2.25} />
              </div>
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-wider text-emerald-700">Panko · Live Tutor</div>
                <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-neutral-900 leading-tight">
                  {hasPortfolio ? "Welcome back." : "Hi — I'm Panko."}
                </h1>
              </div>
            </div>
            <p className="text-base md:text-lg text-neutral-600 leading-relaxed max-w-xl">
              I'll explain what's actually going on with your portfolio. Share your screen, paste your holdings, or just ask me anything.
            </p>
          </header>
        )}

        {/* ── Empty state — paste-holdings sub-view ───────────────── */}
        {!share.sharing && emptyView === "paste" && (
          <div className="bg-white rounded-3xl p-6 md:p-8 shadow-[0_4px_24px_rgba(0,0,0,0.04)]">
            <div className="flex items-center gap-3 mb-5">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-100 text-amber-700">
                <ClipboardList className="h-5 w-5" strokeWidth={2} />
              </div>
              <div>
                <h2 className="text-xl font-bold text-neutral-900 tracking-tight">Paste your holdings</h2>
                <p className="text-sm text-neutral-500">One per line: ticker and weight (or dollars).</p>
              </div>
            </div>
            <form onSubmit={handlePasteSubmit}>
              <textarea
                value={pasteText}
                onChange={(e) => { setPasteText(e.target.value); setPasteError(null); }}
                placeholder={"AAPL 30\nMSFT 25\nSPY 45"}
                rows={8}
                disabled={analyzeLoading}
                className="w-full rounded-2xl bg-stone-50 border border-stone-200 px-4 py-3 text-sm font-mono text-neutral-900 placeholder:text-neutral-400 outline-none focus:bg-white focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100 transition-all disabled:opacity-50"
              />
              {(pasteError || analyzeError) && (
                <div className="mt-3 rounded-2xl bg-rose-50 border border-rose-100 px-4 py-3 text-sm text-rose-700 flex gap-2 items-start">
                  <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" strokeWidth={2.5} />
                  <span>{pasteError || analyzeError}</span>
                </div>
              )}
              <div className="mt-5 flex items-center gap-3">
                <button
                  type="submit"
                  disabled={!pasteText.trim() || analyzeLoading}
                  className="bg-emerald-500 hover:bg-emerald-600 disabled:bg-neutral-200 disabled:text-neutral-400 text-white rounded-full font-semibold text-sm px-6 py-3 inline-flex items-center gap-2 transition-all active:scale-[0.98] shadow-[0_4px_12px_rgba(16,185,129,0.25)] disabled:shadow-none"
                >
                  {analyzeLoading ? (
                    <><Loader2 className="h-4 w-4 animate-spin" strokeWidth={2.5} />Running analysis…</>
                  ) : (
                    <>Run analysis <ArrowRight className="h-4 w-4" strokeWidth={2.5} /></>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => { setEmptyView("default"); setPasteError(null); }}
                  disabled={analyzeLoading}
                  className="text-sm font-semibold text-neutral-500 hover:text-neutral-900 transition-colors disabled:opacity-50 px-4 py-3"
                >
                  Cancel
                </button>
              </div>
            </form>
            <p className="mt-5 text-xs text-neutral-400 leading-relaxed">
              Educational tool. Not financial advice.
            </p>
          </div>
        )}

        {/* ── Empty state — returning user (has saved portfolio) ──── */}
        {!share.sharing && emptyView === "default" && hasPortfolio && (
          <ReturningUserState
            lastResults={lastResults}
            lastPayload={lastPayload}
            onStartShare={share.startSharing}
            onAskInPage={(seed) => { setChatSeed(seed); setEmptyView("chat"); }}
            onStartFresh={() => setEmptyView("paste")}
          />
        )}

        {/* ── Empty state — new user (no portfolio) ───────────────── */}
        {!share.sharing && emptyView === "default" && !hasPortfolio && (
          <NewUserState
            onStartShare={share.startSharing}
            onChoosePaste={() => setEmptyView("paste")}
            onJustAsk={() => { setChatSeed(""); setEmptyView("chat"); }}
            shareError={share.shareError}
          />
        )}

        {/* ── Empty state — in-page chat (Option C) ──────────────── */}
        {!share.sharing && emptyView === "chat" && (
          <JustAskChat
            lastResults={lastResults}
            lastPayload={lastPayload}
            initialPrompt={chatSeed}
            onBack={() => { setChatSeed(""); setEmptyView("default"); }}
            onOpenLesson={handleOpenLesson}
          />
        )}

        {/* ── Active share + chat ──────────────────────────────── */}
        {share.sharing && (
          <div>
            {/* Privacy hint — only relevant during an active share. */}
            <div className="mb-4 flex items-start gap-2 text-xs text-neutral-600 bg-emerald-50 rounded-2xl px-4 py-3 border border-emerald-100">
              <Shield className="h-3.5 w-3.5 mt-0.5 shrink-0 text-emerald-600" strokeWidth={2.25} />
              <span>
                <strong className="text-emerald-800 font-semibold">Your screen, your control.</strong>{" "}
                A snapshot is sent only when you ask a question. Stop anytime. Nothing is stored on Panko's servers; images go to Claude for analysis and are discarded.
              </span>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">

              {/* Left: live preview */}
              <div className="lg:col-span-3 bg-white rounded-3xl overflow-hidden shadow-[0_4px_24px_rgba(0,0,0,0.04)]">
                <div className="flex items-center justify-between px-5 py-4">
                  <div className="flex items-center gap-2.5">
                    <span className="relative flex h-2.5 w-2.5">
                      <span className="absolute inline-flex h-full w-full rounded-full bg-rose-500 opacity-75 animate-ping" />
                      <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-rose-500" />
                    </span>
                    <span className="text-sm font-semibold text-neutral-900">Sharing live</span>
                  </div>
                  <button
                    onClick={share.stopSharing}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-neutral-500 hover:text-rose-600 transition-colors px-3 py-1.5 rounded-full hover:bg-rose-50"
                  >
                    <MonitorOff className="h-3.5 w-3.5" strokeWidth={2.5} />
                    Stop
                  </button>
                </div>
                <div className="aspect-video bg-neutral-900 relative mx-5 rounded-2xl overflow-hidden">
                  <video
                    ref={share.videoRef}
                    className="absolute inset-0 w-full h-full object-contain"
                    autoPlay
                    muted
                    playsInline
                  />
                </div>
                {share.lastSnapshot && (
                  <div className="px-5 py-4 flex items-center gap-3">
                    <Camera className="h-4 w-4 text-neutral-500 shrink-0" strokeWidth={2.25} />
                    <span className="text-xs text-neutral-500">Last frame sent to AI</span>
                    <img
                      src={share.lastSnapshot}
                      alt="Last snapshot"
                      className="h-10 w-auto rounded-lg border border-stone-200 ml-auto"
                    />
                  </div>
                )}
              </div>

              {/* Right: chat */}
              <div className="lg:col-span-2 bg-white rounded-3xl flex flex-col min-h-[460px] max-h-[80vh] shadow-[0_4px_24px_rgba(0,0,0,0.04)]">
                <div className="flex items-center gap-3 px-5 py-4">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500 text-white">
                    <Sparkles className="h-4 w-4" strokeWidth={2.5} />
                  </div>
                  <span className="font-bold text-neutral-900 tracking-tight">Panko</span>
                  {questionsAsked > 0 && (
                    <span
                      className="ml-auto inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-stone-100 text-neutral-600 text-[11px] font-mono font-semibold tabular-nums"
                      title={`${questionsAsked} question${questionsAsked > 1 ? "s" : ""} this session at ~$${COST_PER_QUESTION_USD.toFixed(3)} per question`}
                    >
                      <CircleDollarSign className="h-3 w-3" strokeWidth={2.5} />
                      ~${estimatedCost}
                    </span>
                  )}
                </div>

                <div className="flex-1 overflow-y-auto px-5 py-3 space-y-3">
                  {stream.messages.length === 0 && (
                    <div>
                      <p className="text-sm text-neutral-500 mb-3">Try one of these:</p>
                      <div className="space-y-2">
                        {SUGGESTED_QUESTIONS.map((q) => (
                          <button
                            key={q}
                            onClick={() => send(q, "qa")}
                            disabled={stream.streaming}
                            className="w-full text-left px-4 py-3 rounded-2xl bg-stone-50 hover:bg-emerald-50 text-sm font-medium text-neutral-700 hover:text-emerald-800 transition-colors disabled:opacity-50"
                          >
                            {q}
                          </button>
                        ))}
                      </div>
                      <p className="text-[11px] text-neutral-500 mt-4 leading-relaxed px-1">
                        Tip: ask <strong className="text-neutral-700">where</strong> something is, then hit <Crosshair className="h-3 w-3 inline-block -mt-0.5 mx-0.5" strokeWidth={3} /> to make me point at it.
                      </p>
                    </div>
                  )}

                  {stream.messages.map((m, i) => {
                    const isStreamingMe = stream.streaming && i === stream.messages.length - 1;
                    const isPointMode   = m.mode === "point";
                    const displayText   = isStreamingMe ? previewProse(m.content) : (m.content || "");
                    const lesson        = (m.role === "assistant" && !isPointMode) ? detectRelatedLesson(m.content) : null;
                    const showOverlay   = m.role === "assistant" && isPointMode && !isStreamingMe && m.boxes && m.boxes.length > 0;
                    const overlaySrc    = showOverlay ? stream.messages[i - 1]?.screenshot : null;
                    const emptyBoxes    = m.role === "assistant" && isPointMode && !isStreamingMe && Array.isArray(m.boxes) && m.boxes.length === 0;

                    return (
                      <div key={i}>
                        <div className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                          <div
                            className={`max-w-[88%] rounded-2xl px-4 py-3 text-[15px] leading-relaxed whitespace-pre-wrap
                              ${m.role === "user"
                                ? "bg-emerald-500 text-white"
                                : "bg-stone-100 text-neutral-900"}`}
                          >
                            {m.role === "user" && isPointMode && (
                              <span className="inline-flex items-center gap-1 mb-1 px-2 py-0.5 rounded-full bg-white/25 text-[10px] font-bold uppercase tracking-wider">
                                <Crosshair className="h-2.5 w-2.5" strokeWidth={3} />
                                Point
                              </span>
                            )}
                            <div>
                              {displayText || (isStreamingMe ? (
                                <span className="inline-flex gap-1">
                                  <span className="h-1.5 w-1.5 rounded-full bg-neutral-400 animate-pulse" />
                                  <span className="h-1.5 w-1.5 rounded-full bg-neutral-400 animate-pulse" style={{ animationDelay: "150ms" }} />
                                  <span className="h-1.5 w-1.5 rounded-full bg-neutral-400 animate-pulse" style={{ animationDelay: "300ms" }} />
                                </span>
                              ) : "")}
                            </div>
                          </div>
                        </div>

                        {showOverlay && overlaySrc && (
                          <div className="mt-2">
                            <AnnotationOverlay src={overlaySrc} boxes={m.boxes} />
                            <p className="text-[10px] text-neutral-500 mt-1.5 px-1">
                              {m.boxes.length === 1 ? "1 region highlighted" : `${m.boxes.length} regions highlighted`} · approximate
                            </p>
                          </div>
                        )}

                        {emptyBoxes && (
                          <div className="mt-2 px-4 py-3 rounded-2xl bg-amber-50 border border-amber-100 text-xs text-amber-800 flex items-start gap-2">
                            <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" strokeWidth={2.5} />
                            <span>I couldn't locate that on the screen. Try rephrasing or zooming in.</span>
                          </div>
                        )}

                        {m.lessonCard ? (
                          <LessonCard payload={m.lessonCard} onOpenLesson={handleOpenLesson} />
                        ) : (lesson && m.content && !isStreamingMe && (
                          <button
                            onClick={() => setActiveTab?.("practice")}
                            className="mt-2 w-full text-left rounded-2xl bg-stone-50 hover:bg-emerald-50 px-4 py-3 flex items-center gap-3 transition-colors group"
                          >
                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-700">
                              <GraduationCap className="h-4 w-4" strokeWidth={2.5} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">
                                Practice lesson
                              </div>
                              <div className="text-sm font-semibold text-neutral-900 truncate">
                                {lesson.title}
                              </div>
                            </div>
                            <ArrowRight className="h-4 w-4 text-neutral-700 group-hover:translate-x-0.5 transition-transform shrink-0" strokeWidth={2.5} />
                          </button>
                        ))}
                        {m.snapshotCard && <SnapshotCard payload={m.snapshotCard} />}
                      </div>
                    );
                  })}
                  <div ref={bottomRef} />
                </div>

                {share.shareError && (
                  <div className="mx-5 mb-2 rounded-2xl bg-rose-50 border border-rose-100 px-4 py-3 text-xs font-medium text-rose-700">
                    {share.shareError}
                  </div>
                )}

                <ToolStatusPill status={stream.toolStatus} />

                {/* Composer — pill-shaped, generous padding, big primary Send */}
                <form onSubmit={handleAsk} className="p-4 flex gap-2 items-center">
                  {voice.supported && (
                    <button
                      type="button"
                      onClick={handleMicToggle}
                      disabled={stream.streaming}
                      title={voice.listening ? "Stop listening" : "Speak your question"}
                      className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full transition-colors active:scale-95
                        ${voice.listening
                          ? "bg-rose-500 hover:bg-rose-600 text-white animate-pulse"
                          : "bg-stone-100 hover:bg-stone-200 text-neutral-700"}
                        disabled:opacity-50`}
                    >
                      {voice.listening
                        ? <MicOff className="h-4 w-4" strokeWidth={2.5} />
                        : <Mic    className="h-4 w-4" strokeWidth={2.5} />}
                    </button>
                  )}
                  <input
                    ref={inputRef}
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder={voice.listening ? "Listening…" : "Ask anything…"}
                    disabled={stream.streaming}
                    className="flex-1 bg-stone-50 rounded-full px-5 py-3 text-[15px] text-neutral-900 placeholder:text-neutral-400 outline-none focus:bg-white focus:ring-4 focus:ring-emerald-100 border border-transparent focus:border-emerald-300 transition-all disabled:opacity-50"
                  />
                  <button
                    type="button"
                    onClick={handlePoint}
                    disabled={!input.trim() || stream.streaming}
                    title="Point — draw boxes on the screen"
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-stone-100 hover:bg-stone-200 disabled:bg-stone-50 disabled:text-neutral-300 text-neutral-700 transition-colors active:scale-95"
                  >
                    <Crosshair className="h-4 w-4" strokeWidth={2.5} />
                  </button>
                  <button
                    type="submit"
                    disabled={!input.trim() || stream.streaming}
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-emerald-500 hover:bg-emerald-600 disabled:bg-stone-200 disabled:text-neutral-400 text-white transition-colors active:scale-95 shadow-[0_4px_12px_rgba(16,185,129,0.25)] disabled:shadow-none"
                  >
                    {stream.streaming ? <Loader2 className="h-4 w-4 animate-spin" strokeWidth={2.5} /> : <Send className="h-4 w-4" strokeWidth={2.5} />}
                  </button>
                </form>
                {!voice.supported && stream.messages.length === 0 && (
                  <div className="px-5 pb-3 text-[11px] text-neutral-500">
                    Voice input isn't supported in this browser — use Chrome or Edge to enable the mic.
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Hidden canvas for frame capture */}
        <canvas ref={share.canvasRef} className="hidden" />

        {/* Footer — soft and friendly, not legalese-aggressive */}
        <p className="mt-16 text-xs text-neutral-400 text-center max-w-2xl mx-auto leading-relaxed">
          Educational tool. Not financial advice. I'm reading pixels — I may misinterpret what I see. Always verify before acting.
        </p>

      </div>
    </div>
  );
}

// ── Empty state — new user, no portfolio loaded ────────────────────────
function NewUserState({ onStartShare, onChoosePaste, onJustAsk, shareError }) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <EntryCard
          accent="emerald"
          icon={MonitorUp}
          title="Share your screen"
          body="Show me your Robinhood, Schwab, Fidelity — anywhere. I'll explain what I see and point at things as you ask."
          hint="A snapshot is only sent when you ask a question."
          cta="Start sharing"
          onClick={onStartShare}
        />
        <EntryCard
          accent="amber"
          icon={ClipboardList}
          title="Paste your holdings"
          body="Drop in tickers and weights. I'll run a full diagnostic and walk you through what it means."
          hint="No account login required."
          cta="Paste holdings"
          onClick={onChoosePaste}
        />
        <EntryCard
          accent="sky"
          icon={MessageSquare}
          title="Just ask anything"
          body="Sharpe ratio? Diversification? How to read a brokerage screen? Ask away — no portfolio needed."
          hint="We can start abstract."
          cta="Open chat"
          onClick={onJustAsk}
        />
      </div>

      {shareError && (
        <div className="max-w-md rounded-2xl bg-rose-50 border border-rose-100 px-4 py-3 text-sm text-rose-700 flex gap-2 items-start">
          <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" strokeWidth={2.5} />
          <span>{shareError}</span>
        </div>
      )}
    </div>
  );
}

const ACCENT = {
  emerald: { bg: "bg-emerald-100", text: "text-emerald-700", hoverBg: "group-hover:bg-emerald-500", hoverText: "group-hover:text-white" },
  amber:   { bg: "bg-amber-100",   text: "text-amber-700",   hoverBg: "group-hover:bg-amber-500",   hoverText: "group-hover:text-white" },
  sky:     { bg: "bg-sky-100",     text: "text-sky-700",     hoverBg: "group-hover:bg-sky-500",     hoverText: "group-hover:text-white" },
};

function EntryCard({ accent = "emerald", icon: Icon, title, body, hint, cta, onClick }) {
  const a = ACCENT[accent];
  return (
    <button
      type="button"
      onClick={onClick}
      className="text-left bg-white rounded-3xl p-6 transition-all group flex flex-col shadow-[0_4px_24px_rgba(0,0,0,0.04)] hover:shadow-[0_8px_32px_rgba(0,0,0,0.08)] hover:-translate-y-1 duration-200"
    >
      <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${a.bg} ${a.text} ${a.hoverBg} ${a.hoverText} mb-5 transition-colors`}>
        <Icon className="h-5 w-5" strokeWidth={2.25} />
      </div>
      <h3 className="font-bold text-neutral-900 mb-2 tracking-tight text-lg">{title}</h3>
      <p className="text-sm text-neutral-500 leading-relaxed mb-3 flex-1">{body}</p>
      {hint && (
        <p className="text-[11px] text-neutral-400 leading-snug mb-5">{hint}</p>
      )}
      <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-neutral-900 group-hover:gap-2 transition-all">
        {cta}
        <ArrowRight className="h-3.5 w-3.5" strokeWidth={2.5} />
      </span>
    </button>
  );
}

// ── In-page chat (no screen share, just Q&A) ────────────────────────────
function JustAskChat({ lastResults, lastPayload, initialPrompt, onBack, onOpenLesson }) {
  const stream = useTutorStream({ endpoint: "chat", lastResults, lastPayload });
  const [input, setInput] = useState(initialPrompt ?? "");
  const inputRef = useRef(null);
  const bottomRef = useRef(null);

  const hasPortfolio = !!(lastResults && lastPayload);

  useEffect(() => { inputRef.current?.focus(); }, []);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [stream.messages]);

  function send(text) {
    if (!text.trim() || stream.streaming) return;
    setInput("");
    stream.send(text);
  }

  function handleSubmit(e) {
    e.preventDefault();
    send(input.trim());
  }

  const SUGGESTED = hasPortfolio
    ? ["What's my biggest risk right now?", "Walk me through my Sharpe ratio", "Why does my downside capture matter?"]
    : ["What's a Sharpe ratio in plain English?", "How should I think about diversification?", "What does 'beta' actually mean for my returns?"];

  return (
    <div className="bg-white rounded-3xl flex flex-col min-h-[520px] max-h-[78vh] shadow-[0_4px_24px_rgba(0,0,0,0.04)]">
      <div className="flex items-center justify-between px-5 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500 text-white">
            <MessageSquare className="h-4 w-4" strokeWidth={2.25} />
          </div>
          <div>
            <div className="text-base font-bold text-neutral-900 tracking-tight">
              {hasPortfolio ? "Ask about your portfolio" : "Ask anything"}
            </div>
            <div className="text-xs text-neutral-500">
              {hasPortfolio ? "Your loaded portfolio is available as context." : "No portfolio needed — we can start abstract."}
            </div>
          </div>
        </div>
        <button
          onClick={onBack}
          className="text-sm font-semibold text-neutral-500 hover:text-neutral-900 transition-colors px-3 py-1.5 rounded-full hover:bg-stone-100"
        >
          ← Back
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
        {stream.messages.length === 0 && (
          <div>
            <p className="text-sm text-neutral-500 mb-3">Try one of these:</p>
            <div className="space-y-2">
              {SUGGESTED.map((q) => (
                <button
                  key={q}
                  onClick={() => send(q)}
                  disabled={stream.streaming}
                  className="w-full text-left px-4 py-3 rounded-2xl bg-stone-50 hover:bg-emerald-50 text-sm font-medium text-neutral-700 hover:text-emerald-800 transition-colors disabled:opacity-50"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {stream.messages.map((m, i) => (
          <div key={i}>
            <div className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[85%] rounded-2xl px-4 py-3 text-[15px] leading-relaxed whitespace-pre-wrap
                  ${m.role === "user"
                    ? "bg-emerald-500 text-white"
                    : "bg-stone-100 text-neutral-900"}`}
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
              <div className="flex justify-start mt-2">
                <div className="max-w-[85%] w-full">
                  <LessonCard payload={m.lessonCard} onOpenLesson={onOpenLesson} />
                </div>
              </div>
            )}
            {m.snapshotCard && (
              <div className="flex justify-start mt-2">
                <div className="max-w-[85%] w-full">
                  <SnapshotCard payload={m.snapshotCard} />
                </div>
              </div>
            )}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      <ToolStatusPill status={stream.toolStatus} />

      <form onSubmit={handleSubmit} className="p-4 flex gap-2 items-center">
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="What do you want to know?"
          disabled={stream.streaming}
          className="flex-1 bg-stone-50 rounded-full px-5 py-3 text-[15px] text-neutral-900 placeholder:text-neutral-400 outline-none focus:bg-white focus:ring-4 focus:ring-emerald-100 border border-transparent focus:border-emerald-300 transition-all disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={!input.trim() || stream.streaming}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-emerald-500 hover:bg-emerald-600 disabled:bg-stone-200 disabled:text-neutral-400 text-white transition-colors active:scale-95 shadow-[0_4px_12px_rgba(16,185,129,0.25)] disabled:shadow-none"
        >
          {stream.streaming ? <Loader2 className="h-4 w-4 animate-spin" strokeWidth={2.5} /> : <Send className="h-4 w-4" strokeWidth={2.5} />}
        </button>
      </form>
    </div>
  );
}

// ── Returning user — has a saved portfolio ──────────────────────────────
function ReturningUserState({ lastResults, lastPayload, onStartShare, onAskInPage, onStartFresh }) {
  const tickers = lastResults?.tickers ?? [];
  const head = tickers.slice(0, 5);
  const extra = Math.max(0, tickers.length - 5);
  const score = lastResults?.panko_score?.total ?? null;
  const savedAt = (() => {
    try {
      const raw = localStorage.getItem("panko_last_session");
      if (!raw) return null;
      const { savedAt } = JSON.parse(raw);
      return savedAt ? new Date(savedAt) : null;
    } catch { return null; }
  })();
  const savedAtLabel = savedAt
    ? savedAt.toLocaleDateString("en-US", { month: "short", day: "numeric" })
    : null;

  const suggestions = [
    "Walk me through my risk profile",
    "What's changed since last check?",
    "Share my screen — I want to look at something",
  ];

  function handleSuggestion(s) {
    if (s.startsWith("Share my screen")) onStartShare();
    else onAskInPage(s);
  }

  // Color the score band based on how the portfolio is doing.
  const scoreColor = score == null
    ? "bg-stone-100 text-neutral-700"
    : score >= 75
      ? "bg-emerald-100 text-emerald-800"
      : score >= 50
        ? "bg-amber-100 text-amber-800"
        : "bg-rose-100 text-rose-800";

  return (
    <div className="space-y-6">
      {/* Portfolio summary — a real card, not a row of labels. Big readable
          numbers, ticker chips, friendly color band on the score. */}
      <div className="bg-white rounded-3xl p-6 md:p-7 shadow-[0_4px_24px_rgba(0,0,0,0.04)]">
        <div className="flex items-start justify-between gap-4 mb-5">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-wider text-emerald-700 mb-1">Your portfolio</div>
            <div className="text-sm text-neutral-500">
              {savedAtLabel ? `Last looked at ${savedAtLabel}` : "Loaded from your last session"}
            </div>
          </div>
          {score != null && (
            <div className={`px-4 py-3 rounded-2xl ${scoreColor}`}>
              <div className="text-[10px] font-bold uppercase tracking-wider opacity-70">Panko Score</div>
              <div className="font-mono text-2xl font-bold tabular-nums leading-none mt-0.5">
                {Math.round(score)}<span className="text-base opacity-50"> / 100</span>
              </div>
            </div>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          {head.map((t) => (
            <span key={t} className="font-mono text-xs font-semibold tabular-nums px-3 py-1.5 rounded-full bg-stone-100 text-neutral-700">
              {t}
            </span>
          ))}
          {extra > 0 && (
            <span className="font-mono text-xs font-medium px-3 py-1.5 rounded-full bg-stone-50 text-neutral-500">
              +{extra} more
            </span>
          )}
        </div>
      </div>

      {/* Suggested actions — soft pill buttons */}
      <div className="space-y-2">
        <div className="text-[11px] font-semibold uppercase tracking-wider text-neutral-500 px-1">Or pick up where you left off</div>
        {suggestions.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => handleSuggestion(s)}
            className="w-full text-left bg-white hover:bg-emerald-50 rounded-2xl px-5 py-4 text-sm font-medium text-neutral-700 hover:text-emerald-800 transition-colors shadow-[0_2px_8px_rgba(0,0,0,0.03)] flex items-center justify-between gap-3 group"
          >
            <span>{s}</span>
            <ArrowRight className="h-4 w-4 text-neutral-400 group-hover:text-emerald-700 group-hover:translate-x-0.5 transition-all" strokeWidth={2.5} />
          </button>
        ))}
      </div>

      <button
        type="button"
        onClick={onStartFresh}
        className="text-sm font-semibold text-neutral-500 hover:text-neutral-900 transition-colors"
      >
        Start fresh with a different portfolio →
      </button>
    </div>
  );
}
