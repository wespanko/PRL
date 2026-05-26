/**
 * Critical-path tests for useTutorStream. The hook owns the message-state
 * machine and SSE event dispatch shared by all three chat surfaces — when
 * this breaks, the entire tutor product breaks.
 *
 * We mock fetch with a synthesized SSE stream rather than hitting the real
 * backend. The stream is a ReadableStream that emits the same SSE wire
 * format /api/chat and /api/tutor produce.
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { useTutorStream } from "../useTutorStream";

function makeStream(chunks) {
  return new ReadableStream({
    start(controller) {
      const enc = new TextEncoder();
      for (const c of chunks) controller.enqueue(enc.encode(c));
      controller.close();
    },
  });
}

function mockFetchWithEvents(events) {
  // events is an array of strings: "data: {...}\n\n" or "data: [DONE]\n\n"
  return vi.fn().mockResolvedValue({
    ok: true,
    body: makeStream(events),
  });
}

describe("useTutorStream", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it("accumulates streamed text into the in-flight assistant message", async () => {
    global.fetch = mockFetchWithEvents([
      `data: ${JSON.stringify({ text: "Your " })}\n\n`,
      `data: ${JSON.stringify({ text: "portfolio " })}\n\n`,
      `data: ${JSON.stringify({ text: "is concentrated." })}\n\n`,
      "data: [DONE]\n\n",
    ]);

    const { result } = renderHook(() =>
      useTutorStream({ endpoint: "chat", lastResults: null, lastPayload: null })
    );

    await act(async () => {
      await result.current.send("Tell me about my portfolio");
    });

    expect(result.current.messages).toHaveLength(2);
    expect(result.current.messages[0]).toMatchObject({ role: "user", content: "Tell me about my portfolio" });
    expect(result.current.messages[1]).toMatchObject({
      role: "assistant",
      content: "Your portfolio is concentrated.",
    });
    expect(result.current.streaming).toBe(false);
  });

  it("attaches a lessonCard from a suggest_lesson tool_ui event to the last assistant message", async () => {
    const lessonPayload = {
      type: "lesson_card",
      topic: "diversification",
      lesson_id: "diversification",
      title: "Real Diversification",
      reason: "Your concentration is high.",
      deep_link_path: "/practice#diversification",
    };

    global.fetch = mockFetchWithEvents([
      `data: ${JSON.stringify({ type: "tool_use", tool: "suggest_lesson", status: "Finding a lesson…" })}\n\n`,
      `data: ${JSON.stringify({ type: "tool_ui", tool: "suggest_lesson", payload: lessonPayload })}\n\n`,
      `data: ${JSON.stringify({ text: "Take a look at this lesson." })}\n\n`,
      "data: [DONE]\n\n",
    ]);

    const { result } = renderHook(() =>
      useTutorStream({ endpoint: "chat", lastResults: null, lastPayload: null })
    );

    await act(async () => {
      await result.current.send("How do I diversify?");
    });

    const last = result.current.messages[result.current.messages.length - 1];
    expect(last.role).toBe("assistant");
    expect(last.content).toBe("Take a look at this lesson.");
    expect(last.lessonCard).toEqual(lessonPayload);
  });

  it("memory_write tool_ui persists to userProfile without polluting the chat", async () => {
    global.fetch = mockFetchWithEvents([
      `data: ${JSON.stringify({
        type: "tool_ui",
        tool: "remember_about_user",
        payload: { category: "risk_tolerance", value: "conservative" },
      })}\n\n`,
      `data: ${JSON.stringify({ text: "Got it." })}\n\n`,
      "data: [DONE]\n\n",
    ]);

    const { result } = renderHook(() =>
      useTutorStream({ endpoint: "chat", lastResults: null, lastPayload: null })
    );

    await act(async () => {
      await result.current.send("I'm risk averse");
    });

    // The chat transcript should not carry the memory write as a card.
    const last = result.current.messages[result.current.messages.length - 1];
    expect(last.lessonCard).toBeUndefined();
    expect(last.snapshotCard).toBeUndefined();

    // The fact should be in localStorage and visible on the next request.
    const stored = JSON.parse(localStorage.getItem("panko_profile_v1") || "{}");
    expect(stored.risk_tolerance).toBe("conservative");
  });
});
