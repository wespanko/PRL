/**
 * Unified SSE parser for the tutor agent stream. Used by all three chat
 * surfaces (AssistantPanel, JustAskChat in LiveTutorPage, screen-share chat
 * in LiveTutorPage).
 *
 * Backend emits three SSE event shapes (plus terminal [DONE]):
 *   {text: "..."}                              ← stream a text chunk
 *   {type:"tool_use", tool, status}            ← show status pill
 *   {type:"tool_ui", tool, payload}            ← render card / run side effect
 *
 * This generator yields normalized events of shape:
 *   {kind:"text", text}
 *   {kind:"tool_use", tool, status}
 *   {kind:"tool_ui", tool, payload}
 *
 * Components handle dispatching. Tool-call side effects (e.g. writing a
 * snapshot to localStorage) belong in the component, not here — the
 * component has the user's current payload/results and we don't want this
 * helper depending on storage state.
 */

export async function* streamTutorEvents(url, body) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    yield { kind: "text", text: "Error connecting to tutor." };
    return;
  }
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
      let parsed;
      try { parsed = JSON.parse(data); } catch { continue; }
      if (parsed.type === "tool_use") {
        yield { kind: "tool_use", tool: parsed.tool, status: parsed.status };
      } else if (parsed.type === "tool_ui") {
        yield { kind: "tool_ui", tool: parsed.tool, payload: parsed.payload };
      } else if (typeof parsed.text === "string") {
        yield { kind: "text", text: parsed.text };
      }
    }
  }
}

/** Read the set of completed Practice lessons. Returns lesson-id strings
 *  that the backend's build_context_block can include in the per-turn header.
 *  Empty if the user hasn't completed any lessons yet. */
export function getCompletedLessonIds() {
  try {
    const raw = localStorage.getItem("panko_practice_v1");
    if (!raw) return [];
    const state = JSON.parse(raw);
    const m = state?.completedLessons;
    if (!m || typeof m !== "object") return [];
    return Object.keys(m);
  } catch {
    return [];
  }
}
