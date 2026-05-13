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
  CircleDollarSign, Crosshair,
} from "lucide-react";
import AnnotationOverlay from "./AnnotationOverlay";
import { parseBoxes } from "../utils/parseBoxes";

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
async function* streamTutor(messages, screenshotBase64, mode) {
  const BASE = import.meta.env.VITE_API_URL ?? "";
  // Strip UI-only fields before sending; backend only wants role + content.
  const wireMessages = messages.map((m) => ({ role: m.role, content: m.content }));
  const res = await fetch(`${BASE}/api/tutor`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      messages: wireMessages,
      screenshot_base64: screenshotBase64,
      screenshot_media_type: "image/jpeg",
      mode,
    }),
  });
  if (!res.ok) { yield "Error connecting to tutor."; return; }
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
      try { yield JSON.parse(data).text ?? ""; } catch { /* ignore */ }
    }
  }
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
export default function LiveTutorPage({ setActiveTab }) {
  const [sharing, setSharing] = useState(false);
  const [streamRef, setStreamRef] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [lastSnapshot, setLastSnapshot] = useState(null);
  const [shareError, setShareError] = useState(null);
  const [questionsAsked, setQuestionsAsked] = useState(0);

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
    setQuestionsAsked((n) => n + 1);

    let accumulated = "";
    try {
      for await (const chunk of streamTutor(history, frame.base64, mode)) {
        accumulated += chunk;
        setMessages((prev) => {
          const updated = [...prev];
          updated[updated.length - 1] = {
            ...updated[updated.length - 1],
            content: accumulated,
          };
          return updated;
        });
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
                Live Tutor
              </h1>
              <p className="text-slate-500 text-sm md:text-base">
                I look at your screen. You ask. I explain. I can point.
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

        {/* Pre-share gate */}
        {!sharing && (
          <div className="rounded-xl border-2 border-dashed border-slate-200 p-8 md:p-12 text-center">
            <div className="flex justify-center mb-5">
              <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                <MonitorUp className="h-8 w-8" strokeWidth={2.25} />
              </div>
            </div>
            <h2 className="text-xl md:text-2xl font-extrabold tracking-tight text-slate-900 mb-2">
              Share your screen to get started
            </h2>
            <p className="text-slate-500 max-w-lg mx-auto leading-relaxed mb-6">
              Open your brokerage (Robinhood, Fidelity, Schwab…), then click below. Your browser will ask which window to share. I'll only look when you ask a question.
            </p>
            <button
              onClick={startSharing}
              className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-extrabold text-base px-8 py-4 inline-flex items-center justify-center gap-2 transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] active:scale-[0.99] shadow-md shadow-indigo-200"
            >
              <MonitorUp className="h-5 w-5" strokeWidth={2.5} />
              Share my screen
            </button>
            {shareError && (
              <div className="mt-5 mx-auto max-w-md rounded-lg bg-rose-50 border border-rose-200 px-4 py-3 text-sm font-medium text-rose-700 flex gap-2 items-start text-left">
                <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" strokeWidth={2.5} />
                <span>{shareError}</span>
              </div>
            )}
            <p className="text-xs text-slate-500 mt-6">
              Works best on Chrome, Edge, or Firefox on a desktop. Screen-share isn't available on most mobile browsers.
            </p>
          </div>
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

                      {/* Related practice lesson — QA mode only */}
                      {lesson && m.content && !isStreamingMe && (
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
                      )}
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
