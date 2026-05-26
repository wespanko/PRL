/**
 * useTutorStream — owns the tutor message-state machine and the SSE event
 * loop. Shared by all three chat surfaces (AssistantPanel, JustAskChat,
 * the screen-share chat inside LiveTutorPage) so the wire-handling logic
 * lives in exactly one place.
 *
 * The hook does NOT know about screenshots. Callers that need vision
 * (LiveTutor share mode) capture a frame themselves and pass it via
 * `send(text, { screenshot, mode, attachToUserMessage })`.
 *
 * Side effects handled here:
 *   - save_snapshot         → utils/snapshots.saveSnapshot
 *   - memory_write          → utils/userProfile.applyMemoryWrite
 *   - suggest_lesson + save_snapshot → attached to the in-flight assistant
 *     message so the component can render the right card
 *
 * Side effects NOT handled (caller renders these):
 *   - lesson card / snapshot card UI — caller pulls m.lessonCard / m.snapshotCard
 *   - parseBoxes for point-mode — caller does this in its own onComplete
 */

import { useState } from "react";
import { streamTutorEvents, getCompletedLessonIds } from "../utils/streamTutorEvents";
import { saveSnapshot } from "../utils/snapshots";
import { getUserProfileForRequest, applyMemoryWrite } from "../utils/userProfile";
import { buildPortfolioContext } from "../utils/portfolioContext";

const BASE = import.meta.env.VITE_API_URL ?? "";

/**
 * @param {object} opts
 * @param {"tutor" | "chat"} opts.endpoint  — which backend route
 * @param {*} [opts.lastResults]            — for buildPortfolioContext
 * @param {*} [opts.lastPayload]            — for saved_payload + snapshots
 */
export function useTutorStream({ endpoint, lastResults, lastPayload }) {
  const [messages, setMessages] = useState([]);
  const [streaming, setStreaming] = useState(false);
  const [toolStatus, setToolStatus] = useState(null);

  const url = `${BASE}/api/${endpoint}`;

  /**
   * Send a user message. Caller supplies the screenshot for vision turns.
   *
   * @param {string} text                — user input
   * @param {object} [opts]
   * @param {string} [opts.screenshot]   — data URL of last captured frame, for overlay
   * @param {string} [opts.screenshotBase64] — base64 sent on the wire
   * @param {"qa"|"point"} [opts.mode]   — vision sub-mode (tutor endpoint only)
   * @param {(accumulated:string)=>void} [opts.onComplete] — called after the stream finishes
   */
  async function send(text, opts = {}) {
    if (!text || streaming) return;

    const userMsg = {
      role: "user",
      content: text,
      ...(opts.mode ? { mode: opts.mode } : {}),
      ...(opts.screenshot ? { screenshot: opts.screenshot } : {}),
    };
    const history = [...messages, userMsg];
    setMessages([...history, { role: "assistant", content: "", ...(opts.mode ? { mode: opts.mode } : {}) }]);
    setStreaming(true);
    setToolStatus(null);

    const portfolio_context = buildPortfolioContext(lastResults, lastPayload);
    const hasPortfolio = !!portfolio_context;

    const wireMessages = history.map((m) => ({ role: m.role, content: m.content }));
    const body = {
      messages: wireMessages,
      portfolio_context,
      saved_payload: hasPortfolio ? lastPayload : null,
      lessons_completed: getCompletedLessonIds(),
      user_profile: getUserProfileForRequest(),
    };
    if (endpoint === "tutor") {
      body.mode = opts.mode || "qa";
      if (opts.screenshotBase64) {
        body.screenshot_base64 = opts.screenshotBase64;
        body.screenshot_media_type = "image/jpeg";
      }
    }

    let accumulated = "";
    try {
      for await (const ev of streamTutorEvents(url, body)) {
        if (ev.kind === "tool_use") {
          // Empty status copy = silent tool (e.g. remember_about_user) — keep pill hidden.
          if (ev.status) setToolStatus(ev.status);
        } else if (ev.kind === "tool_ui") {
          setToolStatus(null);
          if (ev.tool === "save_snapshot" && hasPortfolio) {
            try { saveSnapshot(lastPayload, lastResults, ev.payload?.label, ev.payload?.note); } catch { /* ignore */ }
          }
          if (ev.tool === "remember_about_user") {
            applyMemoryWrite(ev.payload);
            // Don't attach to message — silent.
            continue;
          }
          setMessages((prev) => {
            const updated = [...prev];
            const last = { ...updated[updated.length - 1] };
            if (ev.tool === "suggest_lesson") last.lessonCard   = ev.payload;
            if (ev.tool === "save_snapshot")  last.snapshotCard = ev.payload;
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
      setStreaming(false);
      setToolStatus(null);
      if (opts.onComplete) {
        try { opts.onComplete(accumulated, setMessages); } catch { /* caller bug — don't crash */ }
      }
    }
  }

  return { messages, setMessages, streaming, toolStatus, send };
}
