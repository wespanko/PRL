"""
Tool definitions for the Panko tutor. Schema is the standard Anthropic
tool-use shape; both /api/tutor and /api/chat pass TOOLS to the API.

The descriptions are the only guidance the model has about WHEN to call
each tool — they are load-bearing prompt copy. Edit with care.
"""

from __future__ import annotations


TOOLS = [
    {
        "name": "run_analysis",
        "description": "Run a full portfolio risk analysis on the user's current or specified holdings. Returns Panko Score, Sharpe, beta, max drawdown, VaR, correlation matrix, stress test results, and benchmark attribution. Call this whenever the user asks about their portfolio's risk, performance, or quality — or when you need quantitative grounding before answering. Do NOT call this for general definitional questions like 'what is Sharpe ratio'.",
        "input_schema": {
            "type": "object",
            "properties": {
                "holdings": {
                    "type": "array",
                    "description": "List of {ticker, weight} objects. Weights as decimals summing to ~1.0. If user hasn't specified, omit this and the backend will use their saved portfolio.",
                    "items": {
                        "type": "object",
                        "properties": {
                            "ticker": {"type": "string"},
                            "weight": {"type": "number"},
                        },
                        "required": ["ticker", "weight"],
                    },
                },
                "reason": {
                    "type": "string",
                    "description": "One sentence explaining why you're running this analysis. For internal logging — not shown to user.",
                },
            },
            "required": ["reason"],
        },
    },
    {
        "name": "map_thesis_to_portfolio",
        "description": "Convert a free-text investment thesis (e.g., 'AI infrastructure with crypto exposure') into a concrete suggested portfolio of tickers with weights. Use when the user describes what they want to invest in but hasn't picked holdings yet, OR when they ask 'what would a portfolio for X thesis look like'. Returns a suggested portfolio that the user can then accept, modify, or analyze.",
        "input_schema": {
            "type": "object",
            "properties": {
                "thesis": {
                    "type": "string",
                    "description": "The user's investment thesis in their own words or your paraphrase.",
                },
                "risk_tolerance": {
                    "type": "string",
                    "enum": ["conservative", "moderate", "aggressive"],
                    "description": "Inferred from conversation or asked explicitly.",
                },
            },
            "required": ["thesis", "risk_tolerance"],
        },
    },
    {
        "name": "optimize",
        "description": "Suggest trades that improve the Panko Score subject to constraints. ONLY call this when the user has already run an analysis AND explicitly asks how to improve their portfolio. Do NOT call this proactively or as a default response to portfolio questions — optimization is a specific request, not a default action. The user needs to understand what's wrong before they care what to change.",
        "input_schema": {
            "type": "object",
            "properties": {
                "holdings": {
                    "type": "array",
                    "description": "Current holdings. If omitted, uses saved portfolio.",
                    "items": {
                        "type": "object",
                        "properties": {
                            "ticker": {"type": "string"},
                            "weight": {"type": "number"},
                        },
                        "required": ["ticker", "weight"],
                    },
                },
                "constraint": {
                    "type": "string",
                    "enum": ["preserve_sharpe", "max_diversification", "reduce_drawdown"],
                    "description": "The optimization objective.",
                },
            },
            "required": ["constraint"],
        },
    },
    {
        "name": "suggest_lesson",
        "description": "Surface a relevant Practice lesson to the user. Call this when the user expresses confusion about a concept, asks 'how do I learn more,' or has just had a concept explained to them that they likely didn't fully understand before this conversation. Default to calling it in these cases — the lesson card is a useful, non-intrusive way to reinforce learning. Skip it only when (a) the user has already completed that lesson (check lessons_completed in the context header), (b) you've already suggested a lesson earlier in this conversation, or (c) the user has clearly demonstrated they already know the concept.",
        "input_schema": {
            "type": "object",
            "properties": {
                "topic": {
                    "type": "string",
                    "enum": ["volatility", "sharpe", "diversification", "beta", "drawdowns", "var", "capture", "correlation"],
                    "description": "Which lesson to surface. Must match an existing Practice lesson topic.",
                },
                "reason_shown_to_user": {
                    "type": "string",
                    "description": "Short sentence shown to user explaining why this lesson is relevant. E.g., 'This explains why your beta of 1.4 makes drawdowns sharper.'",
                },
            },
            "required": ["topic", "reason_shown_to_user"],
        },
    },
    {
        "name": "save_snapshot",
        "description": "Save the current portfolio state to history so it can be referenced later. Call this after meaningful analyses or changes — not after every message. The user can review snapshots on the Monitor page.",
        "input_schema": {
            "type": "object",
            "properties": {
                "label": {
                    "type": "string",
                    "description": "Short label for this snapshot. E.g., 'Initial diagnostic' or 'After rebalance toward AI infra'.",
                },
                "note": {
                    "type": "string",
                    "description": "One or two sentences capturing what was learned or decided. Optional.",
                },
            },
            "required": ["label"],
        },
    },
]


# Map of tool name -> human-readable status pill copy, sent to the frontend
# in an SSE event so the right pill text shows up while the tool runs.
TOOL_STATUS_COPY = {
    "run_analysis":            "Analyzing your portfolio…",
    "map_thesis_to_portfolio": "Mapping your thesis…",
    "optimize":                "Optimizing…",
    "suggest_lesson":          "Finding a lesson…",
    "save_snapshot":           "Saving snapshot…",
}
