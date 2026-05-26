"""
Tutor agent loop — shared by /api/chat and /api/tutor.

Streaming + tool use: each turn streams text deltas to the client. After the
stream ends we inspect the final message for tool_use blocks; if any are
present we run them, emit an SSE event with the structured ui_payload (so
the frontend can render lesson cards, snapshot confirmations, etc.), append
a tool_result block, and re-enter the loop. We exit once the model produces
a turn with no tool_use blocks.

Why the agent loop lives here and not in main.py: the loop is the most
load-bearing piece of behavior in the product and main.py should be a thin
router, not a 500-line file mixing routing, schemas, LLM orchestration, and
business logic.
"""

from __future__ import annotations

import json
import os
from typing import Any, Iterator

from prompts.tutor_prompt import TUTOR_SYSTEM_PROMPT, build_context_block
from tools.dispatcher import execute_tool
from tools.tutor_tools import TOOLS, TOOL_STATUS_COPY


MAX_TOOL_TURNS = 6


# Spatial-mode addendum to the system prompt. Only appended for vision
# requests where mode == "point". The bbox JSON spec is what the frontend's
# parseBoxes.js expects.
TUTOR_POINT_SUFFIX = """

────────────────────────────────────────
SPATIAL MODE — POINTING TASK

The user is asking you to LOCATE one or more elements on the screen. The UI
will draw rectangles directly on the screenshot at the coordinates you give.

Format your response EXACTLY like this:

1. ONE short sentence of prose describing what you found (one sentence, no more).
2. Then a fenced JSON code block listing every element to highlight:

```json
[
  {"label": "Buy button", "bbox": [72, 14, 18, 6]}
]
```

bbox = [x, y, width, height] as PERCENTAGES of the image dimensions (0-100).
- (0, 0) is the top-left corner of the image.
- (100, 100) is the bottom-right corner.
- Be tight: hug the element with minimal padding (~2-3% margin max).
- Multiple elements is fine — list them all.

If you genuinely cannot find the requested element, prose explains why,
followed by an empty JSON block: ```json []```

DO NOT include any text after the closing ``` of the JSON block.
DO NOT use lesson references in this mode — keep the prose minimal.
"""


def _sse(event: dict) -> str:
    return f"data: {json.dumps(event)}\n\n"


def _serialize_assistant_content(content_blocks) -> list[dict]:
    """Convert the SDK's content-block objects back into dicts suitable for
    the next API call's `messages` argument. We hand-pick fields instead of
    calling .model_dump() because the SDK emits client-side fields (like
    `parsed_output` on TextBlock) that the API rejects when echoed back."""
    out: list[dict] = []
    for b in content_blocks:
        if isinstance(b, dict):
            out.append(b)
            continue
        t = getattr(b, "type", None)
        if t == "text":
            out.append({"type": "text", "text": getattr(b, "text", "")})
        elif t == "tool_use":
            out.append({
                "type": "tool_use",
                "id": getattr(b, "id", ""),
                "name": getattr(b, "name", ""),
                "input": getattr(b, "input", {}) or {},
            })
        elif t == "thinking":
            out.append({
                "type": "thinking",
                "thinking": getattr(b, "thinking", ""),
                "signature": getattr(b, "signature", ""),
            })
        elif t == "redacted_thinking":
            out.append({"type": "redacted_thinking", "data": getattr(b, "data", "")})
        # Unknown block types are dropped — the API will reject anything novel.
    return out


def run_agent_stream(
    *,
    surface: str,
    initial_messages: list[dict],
    saved_payload: dict | None,
    portfolio_context: dict | None,
    lessons_completed: list[str] | None,
    user_profile: dict | None,
    has_image: bool,
    mode: str | None,
    extra_system_suffix: str = "",
) -> Iterator[str]:
    """Generator yielding SSE-formatted strings. Runs the multi-turn tool
    loop and streams text deltas as they arrive."""
    api_key = os.environ.get("ANTHROPIC_API_KEY")
    if not api_key:
        yield _sse({"text": "ANTHROPIC_API_KEY is not set on the server."})
        yield "data: [DONE]\n\n"
        return

    from anthropic import Anthropic
    client = Anthropic(api_key=api_key)

    # Prepend the per-turn context block to the first user message. Lives in
    # the user message (not the system prompt) so it stays per-turn rather
    # than being cached as a static prompt.
    messages = [dict(m) for m in initial_messages]
    context_line = build_context_block(
        surface=surface,
        portfolio=portfolio_context,
        has_image=has_image,
        lessons_completed=lessons_completed,
        mode=mode,
        user_profile=user_profile,
    )
    if context_line and messages:
        for m in messages:
            if m["role"] != "user":
                continue
            content = m["content"]
            if isinstance(content, str):
                m["content"] = f"{context_line}\n{content}"
            elif isinstance(content, list):
                injected = False
                for cb in content:
                    if isinstance(cb, dict) and cb.get("type") == "text":
                        cb["text"] = f"{context_line}\n{cb.get('text', '')}"
                        injected = True
                        break
                if not injected:
                    content.append({"type": "text", "text": context_line})
            break

    system_prompt = TUTOR_SYSTEM_PROMPT + extra_system_suffix

    try:
        for _ in range(MAX_TOOL_TURNS):
            with client.messages.stream(
                model="claude-opus-4-7",
                max_tokens=2048,
                system=system_prompt,
                messages=messages,
                tools=TOOLS,
            ) as s:
                for text in s.text_stream:
                    yield _sse({"text": text})
                final = s.get_final_message()

            tool_uses = [b for b in final.content if getattr(b, "type", None) == "tool_use"]
            if not tool_uses:
                break

            messages.append({
                "role": "assistant",
                "content": _serialize_assistant_content(final.content),
            })

            tool_result_blocks = []
            for tu in tool_uses:
                yield _sse({
                    "type": "tool_use",
                    "tool": tu.name,
                    "status": TOOL_STATUS_COPY.get(tu.name, "Thinking…"),
                })
                # remember_about_user is a frontend-only side effect (writes
                # localStorage). The backend confirms intent and ships the
                # payload via SSE; nothing else.
                result = execute_tool(tu.name, dict(tu.input or {}), saved_payload)
                if result.ui_payload:
                    yield _sse({
                        "type": "tool_ui",
                        "tool": tu.name,
                        "payload": result.ui_payload,
                    })
                tool_result_blocks.append({
                    "type": "tool_result",
                    "tool_use_id": tu.id,
                    "content": result.summary_for_model,
                    "is_error": result.is_error,
                })

            messages.append({"role": "user", "content": tool_result_blocks})
        else:
            # Hit MAX_TOOL_TURNS without a clean text-only finish.
            yield _sse({"text": " (Reached max tool turns — stopping here.)"})
    except Exception as exc:
        yield _sse({"text": f"Error: {exc}"})

    yield "data: [DONE]\n\n"
