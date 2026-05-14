// Live Tutor — Day 1 of the extended roadmap (LIVE_TUTOR_PLAN.md).
//
// Phase 1: screen share + chat + Claude vision
// Phase 2: voice input, related-lesson cards, cost meter
// Day 1  : visual annotations — "Point" mode emits bounding boxes for UI
//          elements, rendered as an SVG overlay on the captured frame.
//
// Composer has TWO submit actions now:
//   • Send (Send icon)        → mode="qa", standard prose response
//   • Point (Crosshair icon)  → mode="point", AI returns prose + bboxes,
//                               UI draws them on the screenshot below the
//                               assistant message.

import { useState, useRef, useEffect } from "react";
import {
  Eye, MonitorUp, MonitorOff, Send, Loader2, AlertTriangle,
  Sparkles, Shield, Camera, Mic, MicOff, GraduationCap, ArrowRight,
  CircleDollarSign, Crosshair, ClipboardList, MessageSquare,
} from "lucide-react";
import AnnotationOverlay from "./AnnotationOverlay";
import { parseBoxes } from "../utils/parseBoxes";
import { normalizeWeights } from "../utils/normalizeWeights";
import { buildPortfolioContext } from "../utils/portfolioContext";
import { streamTutorEvents, getCompletedLessonIds } from "../utils/streamTutorEvents";
import { saveSnapshot } from "../utils/snapshots";
import { ToolStatusPill, LessonCard, SnapshotCard } from "./AgentTools";

// Parse a pasted block of "TICKER WEIGHT" lines. Supports comma/colon
// separators and trailing % signs. Returns [{ticker, weight}, ...] with
// raw values (not yet normalized to 1.0).
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

// While streaming in point mode, the AI's response will eventually contain
// a ```json [...] ``` block. Strip everything from that marker onward for
// display purposes so the user doesn't see raw JSON flash by. Once the
// stream completes, parseBoxes() does the real extraction.
function previewProse(content) {
  if (!content) return "";
  const i = content.indexOf("```json");
  if (i === -1) return content;
  return content.slice(0, i).trim();
}

// ── streaming wire ───────────────────────────────────────────────────
// Wraps the unified streamTutorEvents() helper so callers can iterate over
// event objects of kind "text" | "tool_use" | "tool_ui".
async function* streamTutor(messages, screenshotBase64, mode, portfolioContext, savedPayload) {
  const BASE = import.meta.env.VITE_API_URL ?? "";
  const wireMessages = messages.map((m) => ({ role: m.role, content: m.content }));
  yield* streamTutorEvents(`${BASE}/api/tutor`, {
    messages: wireMessages,
    screenshot_base64: screenshotBase64,
    screenshot_media_type: "image/jpeg",
    mode,
    portfolio_context: portfolioContext,
    saved_payload: savedPayload,
    lessons_completed: getCompletedLessonIds(),
  });
}

// ── voice input hook (Web Speech API) ────────────────────────────────
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
  const [sharing, setSharing] = useState(false);
  const [streamRef, setStreamRef] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [lastSnapshot, setLastSnapshot] = useState(null);
  const [shareError, setShareError] = useState(null);
  const [questionsAsked, setQuestionsAsked] = useState(0);
  const [toolStatus, setToolStatus] = useState(null);

  // Phase-1 empty-state UI: which sub-view is showing when not sharing.
  // "default" → returning-user 'Welcome back' card OR new-user 3 cards
  // "paste"   → inline paste-holdings form
  // "chat"    → in-page abstract-Q&A chat (Option C). Calls /api/chat
  //             directly so the user stays inside Live Tutor (NOT a
  //             redirect to the floating AssistantPanel).
  const [emptyView, setEmptyView] = useState("default");
  const [pasteText, setPasteText] = useState("");
  const [pasteError, setPasteError] = useState(null);
  // Pre-fill text for the in-page chat (e.g. when a returning-user chip
  // sends them in with a specific question). Cleared on back.
  const [chatSeed, setChatSeed] = useState("");

  const hasPortfolio = !!(lastResults && lastPayload);

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const inputRef = useRef(null);
  const bottomRef = useRef(null);

  const voice = useVoiceInput((text) => setInput(text));

  useEffect(() => {
    return () => { if (streamRef) streamRef.getTracks().forEach((t) => t.stop()); };
  }, [streamRef]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  async function startSharing() {
    setShareError(null);
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: { frameRate: 5 },
        audio: false,
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => {});
      }
      setStreamRef(stream);
      setSharing(true);
      stream.getVideoTracks()[0].addEventListener("ended", () => {
        setSharing(false);
        setStreamRef(null);
      });
    } catch (e) {
      if (e.name !== "NotAllowedError") {
        setShareError(e.message || "Couldn't access screen share.");
      }
    }
  }

  function stopSharing() {
    if (streamRef) streamRef.getTracks().forEach((t) => t.stop());
    setStreamRef(null);
    setSharing(false);
    setLastSnapshot(null);
  }

  // Returns { base64, dataUrl } — both useful: base64 for the API,
  // dataUrl for rendering in the UI alongside the assistant's response.
  function captureFrame() {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return null;
    if (!video.videoWidth) return null;
    const MAX = 1280;
    const scale = Math.min(1, MAX / Math.max(video.videoWidth, video.videoHeight));
    canvas.width  = Math.round(video.videoWidth  * scale);
    canvas.height = Math.round(video.videoHeight * scale);
    const ctx = canvas.getContext("2d");
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.7);
    setLastSnapshot(dataUrl);
    return { dataUrl, base64: dataUrl.split(",")[1] };
  }

  function handleOpenLesson() {
    setActiveTab?.("practice");
  }

  async function send(text, mode = "qa") {
    if (!text.trim() || streaming) return;
    if (!sharing) {
      setShareError("Share your screen first so I can see what you're looking at.");
      return;
    }
    setShareError(null);
    if (voice.listening) voice.stop();

    const frame = captureFrame();
    if (!frame) {
      setShareError("Couldn't grab a screenshot — make sure your shared window is visible.");
      return;
    }

    const userMsg = {
      role: "user",
      content: text,
      mode,
      screenshot: frame.dataUrl, // kept for the overlay render under the AI reply
    };
    const history = [...messages, userMsg];
    setMessages([...history, { role: "assistant", content: "", mode }]);
    setInput("");
    setStreaming(true);
    setToolStatus(null);
    setQuestionsAsked((n) => n + 1);

    const portfolioContext = buildPortfolioContext(lastResults, lastPayload);
    const hasPortfolio = !!portfolioContext;

    let accumulated = "";
    try {
      for await (const ev of streamTutor(history, frame.base64, mode, portfolioContext, hasPortfolio ? lastPayload : null)) {
        if (ev.kind === "tool_use") {
          setToolStatus(ev.status);
        } else if (ev.kind === "tool_ui") {
          setToolStatus(null);
          if (ev.tool === "save_snapshot" && hasPortfolio) {
            try { saveSnapshot(lastPayload, lastResults, ev.payload?.label, ev.payload?.note); } catch {}
          }
          setMessages((prev) => {
            const updated = [...prev];
            const last = { ...updated[updated.length - 1] };
            if (ev.tool === "suggest_lesson")  last.lessonCard   = ev.payload;
            if (ev.tool === "save_snapshot")   last.snapshotCard = ev.payload;
            updated[updated.length - 1] = last;
            return updated;
          });
        } else if (ev.kind === "text") {
          setToolStatus(null);
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
      // Stream finished. Parse boxes if we were in point mode.
      if (mode === "point") {
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
      }
      setStreaming(false);
      setToolStatus(null);
    }
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

  // ── paste-holdings flow ──────────────────────────────────────────
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
    // Result will arrive via lastResults prop; the empty-state will then
    // flip to the returning-user view automatically.
  }

  const estimatedCost = (questionsAsked * COST_PER_QUESTION_USD).toFixed(2);

  return (
    <div className="min-h-screen text-slate-900 px-6 py-10 md:px-10">
      <div className="max-w-5xl mx-auto">

        {/* Header */}
        <header className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
              <Eye className="h-5 w-5" strokeWidth={2} />
            </div>
            <div>
              <h1 className="text-3xl md:text-4xl font-semibold tracking-tight text-slate-900 leading-tight">
                Panko
              </h1>
              <p className="text-slate-500 text-sm md:text-base">
                Your personal assistant to make markets less confusing.
              </p>
            </div>
          </div>
        </header>

        {/* Privacy callout */}
        <div className="mb-6 rounded-lg bg-indigo-50 border border-indigo-200 p-4 flex gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-white">
            <Shield className="h-4 w-4" strokeWidth={2.5} />
          </div>
          <div className="text-sm leading-relaxed text-indigo-900/90">
            <strong className="text-indigo-900">Your screen, your control.</strong> A snapshot is sent only when you ask a question. You pick which window to share, and you can stop anytime. Nothing is stored on Panko's servers; the image is forwarded to Anthropic Claude for analysis and discarded.
          </div>
        </div>

        {/* ── Empty state — paste-holdings sub-view ───────────────── */}
        {!sharing && emptyView === "paste" && (
          <div className="rounded-xl border border-slate-200 bg-white p-6 md:p-8">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
                <ClipboardList className="h-5 w-5" strokeWidth={2} />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-slate-900">Paste your holdings</h2>
                <p className="text-sm text-slate-500">One per line: ticker and weight (or dollars).</p>
              </div>
            </div>
            <form onSubmit={handlePasteSubmit}>
              <textarea
                value={pasteText}
                onChange={(e) => { setPasteText(e.target.value); setPasteError(null); }}
                placeholder={"AAPL 30\nMSFT 25\nSPY 45"}
                rows={8}
                disabled={analyzeLoading}
                className="w-full rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-mono text-slate-900 placeholder:text-slate-400 outline-none focus:bg-white focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 transition-colors disabled:opacity-50"
              />
              {(pasteError || analyzeError) && (
                <div className="mt-3 rounded-lg bg-rose-50 border border-rose-200 px-4 py-3 text-sm text-rose-700 flex gap-2 items-start">
                  <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" strokeWidth={2.5} />
                  <span>{pasteError || analyzeError}</span>
                </div>
              )}
              <div className="mt-4 flex items-center gap-3">
                <button
                  type="submit"
                  disabled={!pasteText.trim() || analyzeLoading}
                  className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-200 disabled:text-slate-400 text-white rounded-lg font-semibold text-sm px-5 py-2.5 inline-flex items-center gap-2 transition-colors active:scale-[0.99]"
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
                  className="text-sm font-medium text-slate-500 hover:text-slate-900 transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
              </div>
            </form>
            <p className="mt-4 text-xs text-slate-400 leading-relaxed">
              Educational tool. Not financial advice.
            </p>
          </div>
        )}

        {/* ── Empty state — returning user (has saved portfolio) ──── */}
        {!sharing && emptyView === "default" && hasPortfolio && (
          <ReturningUserState
            lastResults={lastResults}
            lastPayload={lastPayload}
            onStartShare={startSharing}
            onAskInPage={(seed) => { setChatSeed(seed); setEmptyView("chat"); }}
            onStartFresh={() => setEmptyView("paste")}
          />
        )}

        {/* ── Empty state — new user (no portfolio) ───────────────── */}
        {!sharing && emptyView === "default" && !hasPortfolio && (
          <NewUserState
            onStartShare={startSharing}
            onChoosePaste={() => setEmptyView("paste")}
            onJustAsk={() => { setChatSeed(""); setEmptyView("chat"); }}
            shareError={shareError}
          />
        )}

        {/* ── Empty state — in-page chat (Option C) ──────────────── */}
        {!sharing && emptyView === "chat" && (
          <JustAskChat
            lastResults={lastResults}
            lastPayload={lastPayload}
            initialPrompt={chatSeed}
            onBack={() => { setChatSeed(""); setEmptyView("default"); }}
            onOpenLesson={handleOpenLesson}
          />
        )}

        {/* Active share + chat */}
        {sharing && (
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">

            {/* Left: live preview */}
            <div className="lg:col-span-3 bg-white rounded-xl border border-slate-200 overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200">
                <div className="flex items-center gap-2">
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="absolute inline-flex h-full w-full rounded-full bg-rose-500 opacity-75 animate-ping" />
                    <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-rose-500" />
                  </span>
                  <span className="text-sm font-bold text-slate-900">Sharing live</span>
                </div>
                <button
                  onClick={stopSharing}
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-rose-600 transition-colors"
                >
                  <MonitorOff className="h-4 w-4" strokeWidth={2.5} />
                  Stop sharing
                </button>
              </div>
              <div className="aspect-video bg-slate-900 relative">
                <video
                  ref={videoRef}
                  className="absolute inset-0 w-full h-full object-contain"
                  autoPlay
                  muted
                  playsInline
                />
              </div>
              {lastSnapshot && (
                <div className="px-4 py-3 border-t border-slate-200 flex items-center gap-3">
                  <Camera className="h-4 w-4 text-slate-500 shrink-0" strokeWidth={2.25} />
                  <span className="text-xs text-slate-500">Last frame sent to AI</span>
                  <img
                    src={lastSnapshot}
                    alt="Last snapshot"
                    className="h-10 w-auto rounded-lg border border-slate-200 ml-auto"
                  />
                </div>
              )}
            </div>

            {/* Right: chat */}
            <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 flex flex-col min-h-[420px] max-h-[80vh]">
              <div className="flex items-center gap-2.5 px-4 py-3 border-b border-slate-200">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-600 text-white">
                  <Sparkles className="h-4 w-4" strokeWidth={2.5} />
                </div>
                <span className="font-extrabold text-slate-900 text-sm">Ask the tutor</span>
                {questionsAsked > 0 && (
                  <span
                    className="ml-auto inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 text-[10px] font-bold tabular-nums"
                    title={`${questionsAsked} question${questionsAsked > 1 ? "s" : ""} this session at ~$${COST_PER_QUESTION_USD.toFixed(3)} per question`}
                  >
                    <CircleDollarSign className="h-3 w-3" strokeWidth={2.5} />
                    ~${estimatedCost}
                  </span>
                )}
              </div>

              <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
                {messages.length === 0 && (
                  <div>
                    <p className="text-sm text-slate-500 mb-3">Try one of these:</p>
                    <div className="space-y-2">
                      {SUGGESTED_QUESTIONS.map((q) => (
                        <button
                          key={q}
                          onClick={() => send(q, "qa")}
                          disabled={streaming}
                          className="w-full text-left px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-sm font-medium text-slate-500 hover:border-indigo-300 hover:bg-indigo-50/50 hover:text-slate-900 transition-colors disabled:opacity-50"
                        >
                          {q}
                        </button>
                      ))}
                    </div>
                    <p className="text-[11px] text-slate-500 mt-3 leading-relaxed">
                      Tip: ask <strong className="text-slate-500">where</strong> something is, then hit the <Crosshair className="h-3 w-3 inline-block -mt-0.5 mx-0.5" strokeWidth={3} /> button to make me point at it.
                    </p>
                  </div>
                )}

                {messages.map((m, i) => {
                  const isStreamingMe = streaming && i === messages.length - 1;
                  const isPointMode   = m.mode === "point";
                  const displayText   = isStreamingMe ? previewProse(m.content) : (m.content || "");
                  const lesson        = (m.role === "assistant" && !isPointMode) ? detectRelatedLesson(m.content) : null;
                  const showOverlay   = m.role === "assistant" && isPointMode && !isStreamingMe && m.boxes && m.boxes.length > 0;
                  const overlaySrc    = showOverlay ? messages[i - 1]?.screenshot : null;
                  const emptyBoxes    = m.role === "assistant" && isPointMode && !isStreamingMe && Array.isArray(m.boxes) && m.boxes.length === 0;

                  return (
                    <div key={i}>
                      <div className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                        <div
                          className={`max-w-[88%] rounded-lg px-3.5 py-2.5 text-sm leading-relaxed whitespace-pre-wrap
                            ${m.role === "user"
                              ? "bg-indigo-600 text-white"
                              : "bg-slate-100 text-slate-900"}`}
                        >
                          {/* Point mode badge on user messages */}
                          {m.role === "user" && isPointMode && (
                            <span className="inline-flex items-center gap-1 mb-1 px-2 py-0.5 rounded-full bg-white/20 text-[10px] font-bold uppercase tracking-wider">
                              <Crosshair className="h-2.5 w-2.5" strokeWidth={3} />
                              Point
                            </span>
                          )}
                          <div>
                            {displayText || (isStreamingMe ? (
                              <span className="inline-flex gap-1">
                                <span className="h-2 w-2 rounded-full bg-slate-400 animate-pulse" />
                                <span className="h-2 w-2 rounded-full bg-slate-400 animate-pulse" style={{ animationDelay: "150ms" }} />
                                <span className="h-2 w-2 rounded-full bg-slate-400 animate-pulse" style={{ animationDelay: "300ms" }} />
                              </span>
                            ) : "")}
                          </div>
                        </div>
                      </div>

                      {/* Annotation overlay — assistant messages in point mode with parsed boxes */}
                      {showOverlay && overlaySrc && (
                        <div className="mt-2">
                          <AnnotationOverlay src={overlaySrc} boxes={m.boxes} />
                          <p className="text-[10px] text-slate-500 mt-1.5 px-1">
                            {m.boxes.length === 1 ? "1 region highlighted" : `${m.boxes.length} regions highlighted`} · approximate
                          </p>
                        </div>
                      )}

                      {/* No-boxes-found notice in point mode */}
                      {emptyBoxes && (
                        <div className="mt-2 px-3 py-2 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-700 flex items-start gap-2">
                          <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" strokeWidth={2.5} />
                          <span>I couldn't locate that on the screen. Try rephrasing or zooming in.</span>
                        </div>
                      )}

                      {/* Lesson card — prefer the model's explicit suggest_lesson
                          tool call; fall back to regex-detected related lesson
                          when the model just mentions a concept without calling
                          the tool. */}
                      {m.lessonCard ? (
                        <LessonCard payload={m.lessonCard} onOpenLesson={handleOpenLesson} />
                      ) : (lesson && m.content && !isStreamingMe && (
                        <button
                          onClick={() => setActiveTab?.("practice")}
                          className="mt-2 w-full text-left rounded-lg border border-indigo-200 bg-indigo-50 hover:bg-indigo-50 px-3 py-2.5 flex items-center gap-3 transition-colors group"
                        >
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-white">
                            <GraduationCap className="h-4 w-4" strokeWidth={2.5} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-[10px] font-bold uppercase tracking-wider text-indigo-600">
                              Related Practice lesson
                            </div>
                            <div className="text-sm font-bold text-indigo-900 truncate">
                              {lesson.title}
                            </div>
                          </div>
                          <ArrowRight className="h-4 w-4 text-indigo-600 group-hover:translate-x-0.5 transition-transform shrink-0" strokeWidth={2.5} />
                        </button>
                      ))}
                      {m.snapshotCard && <SnapshotCard payload={m.snapshotCard} />}
                    </div>
                  );
                })}
                <div ref={bottomRef} />
              </div>

              {shareError && (
                <div className="mx-4 mb-2 rounded-xl bg-rose-50 border border-rose-200 px-3 py-2 text-xs font-medium text-rose-700">
                  {shareError}
                </div>
              )}

              <ToolStatusPill status={toolStatus} />

              {/* Composer */}
              <form onSubmit={handleAsk} className="p-3 border-t border-slate-200 flex gap-2">
                {voice.supported && (
                  <button
                    type="button"
                    onClick={handleMicToggle}
                    disabled={streaming}
                    title={voice.listening ? "Stop listening" : "Speak your question"}
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg transition-colors active:scale-95
                      ${voice.listening
                        ? "bg-rose-500 hover:bg-rose-600 text-white animate-pulse"
                        : "bg-slate-100 hover:bg-slate-200 text-slate-500"}
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
                  placeholder={voice.listening ? "Listening…" : "Ask or 'where is the …?'"}
                  disabled={streaming}
                  className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 text-sm font-medium text-slate-900 placeholder:text-slate-500 outline-none focus:bg-white focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 transition-colors disabled:opacity-50"
                />
                {/* Point button — sends with mode="point" */}
                <button
                  type="button"
                  onClick={handlePoint}
                  disabled={!input.trim() || streaming}
                  title="Point — ask the AI to draw boxes around the answer on your screen"
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-100 hover:bg-indigo-50 hover:text-indigo-600 disabled:bg-slate-100 disabled:text-slate-500 text-slate-500 transition-colors active:scale-95"
                >
                  <Crosshair className="h-4 w-4" strokeWidth={2.5} />
                </button>
                {/* Send button — mode="qa" */}
                <button
                  type="submit"
                  disabled={!input.trim() || streaming}
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-200 disabled:text-slate-500 text-white transition-colors active:scale-95"
                >
                  {streaming ? <Loader2 className="h-4 w-4 animate-spin" strokeWidth={2.5} /> : <Send className="h-4 w-4" strokeWidth={2.5} />}
                </button>
              </form>
              {!voice.supported && messages.length === 0 && (
                <div className="px-4 pb-3 text-[11px] text-slate-500">
                  Voice input isn't supported in this browser — use Chrome or Edge to enable the mic.
                </div>
              )}
            </div>
          </div>
        )}

        {/* Hidden canvas for frame capture */}
        <canvas ref={canvasRef} className="hidden" />

        {/* Footer disclaimer */}
        <p className="mt-8 text-xs text-slate-500 text-center max-w-2xl mx-auto leading-relaxed">
          Educational tool. Not financial advice. The AI is reading pixels — it may misinterpret what it sees. Always verify before acting.
        </p>

      </div>
    </div>
  );
}

// ── Empty state — new user, no portfolio loaded ────────────────────────
function NewUserState({ onStartShare, onChoosePaste, onJustAsk, shareError }) {
  return (
    <div>
      <h2 className="text-2xl md:text-3xl font-semibold tracking-tight text-slate-900 mb-1.5">
        Let's look at your portfolio together.
      </h2>
      <p className="text-slate-500 mb-8">
        Three ways to start. Pick whichever is easiest.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <EntryCard
          icon={MonitorUp}
          title="Share your brokerage"
          body="Show me your account in Robinhood, Schwab, Fidelity — anywhere. I'll explain what I see and answer questions as you point at things."
          cta="Share my screen"
          onClick={onStartShare}
        />
        <EntryCard
          icon={ClipboardList}
          title="Paste your holdings"
          body="Drop in tickers and weights (or dollar amounts). I'll run a full diagnostic and walk you through what it means."
          cta="Paste holdings"
          onClick={onChoosePaste}
        />
        <EntryCard
          icon={MessageSquare}
          title="Just ask me anything"
          body="No portfolio yet? Ask me what a Sharpe ratio is, how to think about risk, or what to look for in a brokerage account. We can start abstract."
          cta="Open the chat"
          onClick={onJustAsk}
        />
      </div>

      {shareError && (
        <div className="mt-5 max-w-md rounded-lg bg-rose-50 border border-rose-200 px-4 py-3 text-sm text-rose-700 flex gap-2 items-start">
          <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" strokeWidth={2.5} />
          <span>{shareError}</span>
        </div>
      )}

      <p className="mt-8 text-xs text-slate-500">Educational tool. Not financial advice.</p>
    </div>
  );
}

function EntryCard({ icon: Icon, title, body, cta, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="text-left rounded-xl border border-slate-200 bg-white hover:border-indigo-300 hover:shadow-sm p-5 transition-all group flex flex-col"
    >
      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 mb-4 group-hover:bg-indigo-100 transition-colors">
        <Icon className="h-5 w-5" strokeWidth={2} />
      </div>
      <h3 className="font-semibold text-slate-900 mb-1.5">{title}</h3>
      <p className="text-sm text-slate-500 leading-relaxed flex-1 mb-4">{body}</p>
      <span className="inline-flex items-center gap-1 text-sm font-semibold text-indigo-600 group-hover:gap-1.5 transition-all">
        {cta}
        <ArrowRight className="h-3.5 w-3.5" strokeWidth={2.5} />
      </span>
    </button>
  );
}

// ── In-page chat (Option C — abstract Q&A without screen share) ──────
// Talks to /api/chat (same endpoint as the floating AssistantPanel) so the
// user can ask questions without screen-sharing OR pasting holdings. The
// user stays inside Live Tutor — this is the chat surface, not a redirect
// to a different component.
function JustAskChat({ lastResults, lastPayload, initialPrompt, onBack, onOpenLesson }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState(initialPrompt ?? "");
  const [streaming, setStreaming] = useState(false);
  const [toolStatus, setToolStatus] = useState(null);
  const inputRef = useRef(null);
  const bottomRef = useRef(null);

  const context = buildPortfolioContext(lastResults, lastPayload);
  const hasPortfolio = !!context;

  useEffect(() => { inputRef.current?.focus(); }, []);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  async function send(text) {
    if (!text.trim() || streaming) return;
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
          setToolStatus(null);
          if (ev.tool === "save_snapshot" && hasPortfolio) {
            try { saveSnapshot(lastPayload, lastResults, ev.payload?.label, ev.payload?.note); } catch {}
          }
          setMessages((prev) => {
            const updated = [...prev];
            const last = { ...updated[updated.length - 1] };
            if (ev.tool === "suggest_lesson")  last.lessonCard   = ev.payload;
            if (ev.tool === "save_snapshot")   last.snapshotCard = ev.payload;
            updated[updated.length - 1] = last;
            return updated;
          });
        } else if (ev.kind === "text") {
          setToolStatus(null);
          accumulated += ev.text;
          setMessages((prev) => {
            const updated = [...prev];
            updated[updated.length - 1] = { ...updated[updated.length - 1], content: accumulated };
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
    send(input.trim());
  }

  const SUGGESTED = hasPortfolio
    ? ["What's my biggest risk right now?", "Walk me through my Sharpe ratio", "Why does my downside capture matter?"]
    : ["What's a Sharpe ratio in plain English?", "How should I think about diversification?", "What does 'beta' actually mean for my returns?"];

  return (
    <div className="rounded-xl border border-slate-200 bg-white flex flex-col min-h-[480px] max-h-[78vh]">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200">
        <div className="flex items-center gap-2.5">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-indigo-50 text-indigo-600">
            <MessageSquare className="h-4 w-4" strokeWidth={2} />
          </div>
          <div>
            <div className="text-sm font-semibold text-slate-900">
              {hasPortfolio ? "Ask about your portfolio" : "Ask anything"}
            </div>
            <div className="text-[11px] text-slate-500">
              {hasPortfolio ? "Loaded portfolio is available as context." : "No portfolio yet — we can start abstract."}
            </div>
          </div>
        </div>
        <button
          onClick={onBack}
          className="text-xs font-medium text-slate-500 hover:text-slate-900 transition-colors"
        >
          ← Back
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {messages.length === 0 && (
          <div>
            <p className="text-sm text-slate-500 mb-3">Try one of these:</p>
            <div className="space-y-2">
              {SUGGESTED.map((q) => (
                <button
                  key={q}
                  onClick={() => send(q)}
                  disabled={streaming}
                  className="w-full text-left px-3 py-2.5 rounded-md bg-slate-50 border border-slate-200 text-sm font-medium text-slate-700 hover:border-indigo-300 hover:bg-indigo-50 hover:text-slate-900 transition-colors disabled:opacity-50"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((m, i) => (
          <div key={i}>
            <div className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[85%] rounded-lg px-3.5 py-2.5 text-sm leading-relaxed whitespace-pre-wrap
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
                  <LessonCard payload={m.lessonCard} onOpenLesson={onOpenLesson} />
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
        <div ref={bottomRef} />
      </div>

      <ToolStatusPill status={toolStatus} />

      {/* Composer */}
      <form onSubmit={handleSubmit} className="p-3 border-t border-slate-200 flex gap-2">
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="What do you want to know?"
          disabled={streaming}
          className="flex-1 bg-slate-50 border border-slate-200 rounded-md px-4 py-2.5 text-sm font-medium text-slate-900 placeholder:text-slate-400 outline-none focus:bg-white focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 transition-colors disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={!input.trim() || streaming}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-200 disabled:text-slate-400 text-white transition-colors active:scale-95"
        >
          {streaming ? <Loader2 className="h-4 w-4 animate-spin" strokeWidth={2.5} /> : <Send className="h-4 w-4" strokeWidth={2.5} />}
        </button>
      </form>
    </div>
  );
}

// ── Empty state — returning user with saved portfolio ──────────────────
function ReturningUserState({ lastResults, lastPayload, onStartShare, onAskInPage, onStartFresh }) {
  const tickers = lastResults?.tickers ?? [];
  const head = tickers.slice(0, 3);
  const extra = Math.max(0, tickers.length - 3);
  const score = lastResults?.panko_score?.total ?? null;
  const savedAt = (() => {
    try {
      const raw = localStorage.getItem("panko_last_session");
      if (!raw) return null;
      const { savedAt } = JSON.parse(raw);
      return savedAt ? new Date(savedAt) : null;
    } catch { return null; }
  })();
  const savedAtLabel = savedAt ? savedAt.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : null;

  const suggestions = [
    "Walk me through my current risk profile",
    "What's changed since last time I checked?",
    "Share my screen — I want to look at something specific",
  ];

  function handleSuggestion(s) {
    if (s.startsWith("Share my screen")) onStartShare();
    else onAskInPage(s);
  }

  return (
    <div>
      <h2 className="text-2xl md:text-3xl font-semibold tracking-tight text-slate-900 mb-6">
        Welcome back.
      </h2>

      {/* Compact portfolio summary */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 mb-6 flex flex-wrap items-center gap-x-8 gap-y-3">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-1">Portfolio</div>
          <div className="font-mono text-sm font-medium text-slate-900">
            {head.join(" · ")}{extra > 0 && <span className="text-slate-400"> · +{extra} more</span>}
          </div>
        </div>
        {score != null && (
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-1">Panko Score</div>
            <div className="font-mono text-sm font-medium text-slate-900 tabular-nums">{Math.round(score)} / 100</div>
          </div>
        )}
        {savedAtLabel && (
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-1">Last snapshot</div>
            <div className="font-mono text-sm font-medium text-slate-900">{savedAtLabel}</div>
          </div>
        )}
      </div>

      {/* Suggested prompts */}
      <div className="flex flex-wrap gap-2 mb-5">
        {suggestions.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => handleSuggestion(s)}
            className="rounded-full border border-slate-200 bg-white hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700 px-4 py-2 text-sm font-medium text-slate-700 transition-colors"
          >
            {s}
          </button>
        ))}
      </div>

      <button
        type="button"
        onClick={onStartFresh}
        className="text-sm font-medium text-slate-500 hover:text-slate-900 transition-colors"
      >
        Start fresh with a different portfolio →
      </button>
    </div>
  );
}
