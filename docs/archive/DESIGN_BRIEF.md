# Panko Risk Report — Design Brief

You are redesigning this app's visual system. Read this entire document before touching any file. Do not "improve" things outside what's specified. Every change must trace back to a rule here.

## 1. Reference targets

The aesthetic should feel like a Bloomberg Terminal redesigned by Stripe — institutional gravity, but readable and modern. Specifically:
- Stripe Atlas / Stripe Press — typography hierarchy, generous whitespace, restrained accents
- Linear's marketing site — section pacing, button treatments, monochromatic discipline
- Bloomberg Terminal — data density, monospace numerics, no-nonsense IA
- Mercury Bank — light-mode finance aesthetic, navy primary, gold reserved for emphasis

Do NOT look at: Robinhood, Coinbase, generic crypto dashboards, shadcn defaults, or anything described as "modern SaaS."

## 2. Design tokens — non-negotiable

Create `src/styles/tokens.css` (or extend `tailwind.config`) with ONLY these values. No arbitrary hex codes in components. No `bg-[#abc123]`. If a value isn't in the token set, it doesn't get used.

### Color
```css
/* Neutrals */
--paper:   #FAFAF7;  /* page bg, warm white */
--canvas:  #FFFFFF;  /* card surfaces */
--ink-900: #0A1628;  /* primary text, deep navy-black */
--ink-700: #1E2A3D;  /* headings */
--ink-500: #4A5568;  /* body */
--ink-400: #718096;  /* secondary */
--ink-300: #A0AEC0;  /* tertiary, captions */
--ink-200: #CBD5E0;  /* hairlines */
--ink-100: #E2E8F0;  /* subtle bg */
--ink-50:  #F1F5F9;  /* hover, table stripes */

/* Blue — primary brand */
--blue-900: #0B1F3A;  /* deepest, dark sections only */
--blue-700: #1E3A5F;  /* primary brand */
--blue-500: #2B5582;  /* default accent */
--blue-300: #6B8CAE;  /* muted */
--blue-100: #E8EEF5;  /* tint bg */

/* Gold — sparingly. Panko Score, key CTAs only */
--gold-700: #8B6F1F;
--gold-500: #B8923A;  /* the "Panko gold" */
--gold-300: #D4B870;
--gold-100: #F5EDD6;

/* Semantic — data context only */
--risk-red:   #B33A3A;
--risk-amber: #C68A1A;
--risk-green: #2D6A4F;
```

### Typography — three families, no more
- **Display**: Libre Baskerville, serif — wordmark, hero headlines, the Panko Score number. Used rarely.
- **Body**: Hanken Grotesk, sans — nav, body, button labels, headers.
- **Mono**: IBM Plex Mono — every numeral. Tickers, prices, %, ratios, dates. If it's a number, it's mono.

Type scale (use these names only):
display-xl    48/56   400   Libre Baskerville
display-lg    36/44   400   Libre Baskerville
heading-lg    24/32   600   Hanken Grotesk
heading-md    18/26   600   Hanken Grotesk
heading-sm    14/20   600   Hanken Grotesk, uppercase, ls 0.08em
body-lg       16/26   400   Hanken Grotesk
body          14/22   400   Hanken Grotesk
body-sm       13/20   400   Hanken Grotesk
caption       12/16   500   Hanken Grotesk, uppercase, ls 0.06em
mono-lg       16/24   500   IBM Plex Mono
mono          14/20   500   IBM Plex Mono
mono-sm       12/18   500   IBM Plex Mono

### Spacing
8pt grid. Allowed: `4, 8, 12, 16, 24, 32, 48, 64, 96, 128`. No 5px. No 13px. No `space-y-7`.

### Radii
- `0px` — tables, data cells, dividers
- `2px` — buttons, inputs, badges
- `4px` — cards, panels
- `8px` — modals, command bar
- Never `rounded-xl`, `rounded-2xl`, `rounded-3xl`, or `rounded-full` (avatars excepted)

### Borders & shadows
- Hairlines: `1px solid var(--ink-200)` — default divider
- Cards: `1px solid var(--ink-200)`, no shadow
- Elevated (modals, dropdowns): `0 4px 24px rgba(10, 22, 40, 0.08)`
- Never use Tailwind's default `shadow-md` / `shadow-lg`

## 3. Layout

- Max content width 1280px, centered. Page padding 32px desktop, 16px mobile.
- Header: 64px tall, white, hairline bottom, sticky. Logo left, nav center, metrics right.
- Sidebar: 240px, `--paper` bg, hairline right border. Labels always visible.
- Cards: white, 1px ink-200 border, 24px internal padding, 4px radius. No shadows.
- Section spacing: 48px between sections, 24px between cards within.
- Tables: zero radius, hairlines, alternating rows `--ink-50`, mono numerics right-aligned, headers in caption style.

## 4. Color application rules

Default state of any page is 90% neutrals, 8% blue, 2% gold. If you reach for color, don't.

- **Blue** is the brand: primary buttons, active nav, links, chart primary series, header accent.
- **Gold** is reserved for exactly two things: (1) the **Panko Score number**, and (2) the **single most important CTA per page**. Nothing else. Gold is what the eye finds first — protect that.
- **The "Panko" wordmark** is the actual logo asset (`/public/logo.png`, eventually SVG) and renders in `--ink-900` (navy) — the brand's real color. It is NOT gold. It is not text rendered in Libre Baskerville. The Libre Baskerville family is reserved for the Panko Score number and any rare hero headline.
- **Risk red/amber/green** ONLY in data context (drawdowns, risk flags). Never decorative.
- One section per page MAY invert to dark (`--blue-900` bg, white text) for visual rhythm. Once, not three times.

## 5. Component rules

### Persistent metric ribbon
White bg. Layout: `[wordmark] [nav] [metrics, mono, right]`. Sharpe/Vol/Beta/Drawdown in a row, 1px ink-200 dividers between, caption-style label above and mono-lg number below. Negatives in `--risk-red`, positives in `--ink-900` (green only for explicit gain context).

### The Panko Score (Dashboard hero)
The one moment the design is dramatic. Center column. Score at 96px Libre Baskerville in `--gold-500`, with `/100` at 32px in `--ink-300` next to it. Below: "Unscored" or DNA label in caption. At least 64px whitespace on all sides. No card around it. Let it breathe.

### Buttons
- **Primary**: `--blue-700` bg, white text, 2px radius, 12/20 padding, weight 500. Hover `--blue-900`.
- **Secondary**: white bg, 1px `--ink-300` border, `--ink-900` text. Hover `--ink-50` bg.
- **Tertiary/link**: `--blue-700` text, no bg, underline on hover.
- **Gold CTA** (one per page max — typically "Generate suggestions" or "Run Simulation"): `--gold-500` bg, `--ink-900` text, 2px radius. The special one.

### Tables
Headers: caption style, `--ink-400`, `--ink-50` bg, hairline bottom. Cells: 12/16 padding, mono for numbers, body-sm for text. Hover row: `--ink-50`. Flagged row: 2px left border in `--gold-500` (Hidden Risk) or `--risk-red` (warnings).

### Charts
- Primary series: `--blue-700`. Secondary: `--blue-300`. Benchmark: `--ink-400` dashed.
- Best/worst-case bands: `--blue-100` fill at 40% opacity.
- Correlation heatmap: blue scale only, `--blue-100` to `--blue-900`. NO red-green diverging.
- Axes: `--ink-300` 1px, labels mono-sm `--ink-400`.
- No gridlines unless necessary; if used, `--ink-100` 1px dashed.
- Never default chart-library palettes.

### AI command bar (⌘K)
Pinned bottom, floating 24px from edge, centered, max-width 720px. White bg, 8px radius, `--ink-200` border, elevated shadow. Suggested prompt chips in body-sm, 1px `--ink-200` border, 2px radius, hover `--ink-50`.

### Warning banners (Improve)
`--gold-100` bg, `--gold-700` text, 4px-wide `--gold-300` left border, no radius. If icon, 1.5px outline only. Never yellow-yellow.

### Sidebar nav
Items in body weight 500. Active: `--blue-700` text, 2px left border in `--gold-500`, `--ink-50` bg. Hover: `--ink-50` bg, no border. Section headers (Build, Analyze): caption style, `--ink-400`.

## 6. Anti-patterns — forbidden

- No gradients of any kind. Solid colors only.
- No glassmorphism, backdrop blur, frosted effects.
- No corner radii beyond 8px. No pill buttons (except tag chips). No `rounded-full` cards.
- No emoji or sparkle icons. No ✨, 🚀, 📊. Keep the geometric category symbols (◍ ◎ ▲ ◆ ↕ ◐) — those are correct.
- No Lucide Sparkles icon anywhere. Icons generally: 1.5px stroke outline, used minimally.
- No drop shadows on cards or buttons.
- No center-aligned body text. Center only headlines and the Panko Score.
- No Lorem Ipsum. Copy is already written — use verbatim.
- No "powered by AI" badges, animated borders, or motion beyond 150ms ease-out on hover/focus.
- No more than one font weight per family in a single component.
- No non-monospace numbers. Every numeral in mono, including nav badges.

## 7. Page-by-page emphasis

- **Dashboard**: Panko Score is the hero. Three-column grid below: Top Risk Driver | Main Vulnerability | Suggested Focus. Each: heading-sm label, body description, single pulled-out mono figure.
- **Build**: Three-column Quick Start / Pick a Diagnosis / Custom Thesis. Quick Start = secondary buttons. Custom Thesis textarea: `--ink-50` bg, `--ink-200` border, 4px radius, body-lg font — feel like a serious input. Risk Tolerance: segmented control, hairline borders, active filled `--blue-700`. "Generate suggestions" = THE gold CTA.
- **Analyze**: Dense. Allow density. Stack: AI Analyst Summary (full-width, `--ink-50` bg) → Benchmark Attribution + Capital Efficiency side-by-side → Correlation Matrix full-width → Stress Scenarios row of 4 small cards → Drawdown chart full-width.
- **Simulate**: Sandbox table is the centerpiece. `--ink-50` panel bg, white input cells with `--ink-200` borders. Weight-total validator pinned bottom-right in mono-lg. "Run Simulation" = gold CTA.
- **Improve**: Yellow warning banner at top. Two-column compare: Current | Proposed, with center column showing deltas (Sharpe, Vol, Drawdown) in mono with ↑↓ arrows, green/red for direction.
- **Plan**: Three calculator cards. Compound interest chart: blue series + blue-100 confidence band. "Drawdowns aren't the enemy" gets the `--blue-900` dark inverted treatment — your one dark section per the layout rule.
- **Monitor**: Empty state must be elegant. display-lg headline "No snapshots yet" in `--ink-300`, body subtext, single secondary button "Save your first snapshot." Center-aligned, 480px-wide block.
- **Learn**: Glossary. Category chips horizontal scroll, sticky under header. Collapsed: heading-md term + body-sm one-liner. Expanded: body explanation, "Why it matters" in `--ink-50` panel, "Common misconceptions" in italic `--ink-500`.

## 8. Implementation order

Do not skip ahead.
1. tokens.css + Tailwind config. Verify by inspecting any element.
2. Install Libre Baskerville, Hanken Grotesk, IBM Plex Mono via next/font. Wire to `font-display`, `font-sans`, `font-mono`.
3. Build header and sidebar shell. Get this right before any page content.
4. Build shared primitives: Button, Card, Input, Table, Badge, Banner in `src/components/ui/`. Every page uses these — no one-offs.
5. Refactor pages in order: Dashboard → Build → Analyze → Simulate → Improve → Plan → Monitor → Learn.
6. After each page, stop and confirm: does this violate any rule? Fix before moving on.

## 9. When in doubt

- Less color, not more.
- More whitespace, not less.
- Mono for any digit.
- Gold appears once. Maybe twice. Never three times.
- If it looks like a generic AI-generated dashboard, it's wrong.
