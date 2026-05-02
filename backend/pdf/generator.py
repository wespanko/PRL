from datetime import datetime
from io import BytesIO

from reportlab.lib.pagesizes import letter
from reportlab.lib.units import inch
from reportlab.platypus import (
    HRFlowable, Image, PageBreak, Paragraph, SimpleDocTemplate,
    Spacer, Table, TableStyle,
)

from pdf.charts import correlation_heatmap, drawdown_chart
from pdf.styles import (
    BLUE, BORDER, DARK, GRAY, GREEN, LIGHT_GRAY, ORANGE, RED, WHITE,
    build_styles,
)

_W = 7.0 * inch  # usable content width: letter - (2 × 0.75" margins)


# ── shared helpers ────────────────────────────────────────────────────────────

def _hr():
    return HRFlowable(width="100%", thickness=0.5, color=BORDER, spaceBefore=4, spaceAfter=6)


def _styled_table(data: list, col_widths: list) -> Table:
    cmds = [
        ("BACKGROUND",    (0, 0), (-1, 0), BLUE),
        ("TEXTCOLOR",     (0, 0), (-1, 0), WHITE),
        ("FONTNAME",      (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTNAME",      (0, 1), (-1, -1), "Helvetica"),
        ("FONTSIZE",      (0, 0), (-1, -1), 9),
        ("TOPPADDING",    (0, 0), (-1, -1), 6),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
        ("LEFTPADDING",   (0, 0), (-1, -1), 8),
        ("RIGHTPADDING",  (0, 0), (-1, -1), 8),
        ("LINEBELOW",     (0, 0), (-1, 0), 0.5, BLUE),
        ("LINEBELOW",     (0, 1), (-1, -2), 0.5, BORDER),
        ("VALIGN",        (0, 0), (-1, -1), "MIDDLE"),
        *[("BACKGROUND",  (0, i), (-1, i), LIGHT_GRAY) for i in range(2, len(data), 2)],
    ]
    return Table(data, colWidths=col_widths, style=TableStyle(cmds), hAlign="LEFT")


def _metric_color(key: str, value: float) -> str:
    if key == "annualized_return":
        return "#16a34a" if value > 0 else "#dc2626"
    if key == "annualized_volatility":
        return "#ea580c" if value > 0.25 else "#111827"
    if key == "sharpe_ratio":
        return "#16a34a" if value >= 1.0 else "#ea580c" if value >= 0.5 else "#111827"
    if key == "max_drawdown":
        return "#dc2626" if value < -0.25 else "#ea580c" if value < -0.10 else "#111827"
    return "#111827"


def _fmt(key: str, value: float) -> str:
    pct_keys = {"annualized_return", "annualized_volatility", "max_drawdown"}
    if key in pct_keys:
        prefix = "+" if key == "annualized_return" and value > 0 else ""
        return f"{prefix}{value * 100:.1f}%"
    return f"{value:.2f}"


# ── section builders ──────────────────────────────────────────────────────────

def _cover(results: dict, styles: dict) -> list:
    holdings_str = "  ·  ".join(
        f"{t} ({w:.0%})" for t, w in zip(results["tickers"], results["weights"])
    )
    period = results["period"]
    return [
        Spacer(1, 0.4 * inch),
        Paragraph("PANKO RISK REPORT", styles["title"]),
        _hr(),
        Spacer(1, 0.05 * inch),
        Paragraph(f"<b>Portfolio</b>&nbsp;&nbsp;&nbsp;{holdings_str}", styles["body"]),
        Paragraph(f"<b>Benchmark</b>&nbsp;&nbsp;{results.get('benchmark', 'SPY')}", styles["body"]),
        Paragraph(f"<b>Period</b>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;{period['start']}  →  {period['end']}", styles["body"]),
        Paragraph(f"<b>Generated</b>&nbsp;&nbsp;{datetime.now().strftime('%B %d, %Y')}", styles["body"]),
        Spacer(1, 0.05 * inch),
        _hr(),
    ]


def _portfolio_summary(results: dict, styles: dict) -> list:
    from risk.scenarios import classify_ticker
    rows = [["Ticker", "Weight", "Asset Class"]]
    for t, w in zip(results["tickers"], results["weights"]):
        rows.append([t, f"{w:.0%}", classify_ticker(t).title()])
    rfr = results.get("risk_free_rate", 0.045)
    return [
        Paragraph("Portfolio Summary", styles["section"]),
        _styled_table(rows, [_W * 0.30, _W * 0.25, _W * 0.45]),
        Spacer(1, 0.06 * inch),
        Paragraph(
            f"Benchmark: {results.get('benchmark', 'SPY')}  ·  "
            f"Risk-free rate: {rfr * 100:.1f}%",
            styles["small"],
        ),
    ]


def _key_metrics(results: dict, styles: dict) -> list:
    benchmark = results.get("benchmark", "SPY")
    METRICS = [
        ("annualized_return",     "Annualized Return",     "Compound annual growth rate over the period"),
        ("annualized_volatility", "Annualized Volatility", "Std dev of daily returns × √252"),
        ("sharpe_ratio",          "Sharpe Ratio",          "Excess return per unit of total risk"),
        ("beta",                  "Beta",                  f"Sensitivity to {benchmark} movements"),
        ("max_drawdown",          "Max Drawdown",          "Largest peak-to-trough decline"),
    ]
    cell_style = styles["cell"]
    rows = [["Metric", "Value", "Notes"]]
    for key, label, note in METRICS:
        value = results.get(key, 0.0)
        hex_color = _metric_color(key, value)
        value_para = Paragraph(
            f'<font color="{hex_color}"><b>{_fmt(key, value)}</b></font>',
            cell_style,
        )
        rows.append([label, value_para, note])

    cmds = [
        ("BACKGROUND",    (0, 0), (-1, 0), BLUE),
        ("TEXTCOLOR",     (0, 0), (-1, 0), WHITE),
        ("FONTNAME",      (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTNAME",      (0, 1), (-1, -1), "Helvetica"),
        ("FONTSIZE",      (0, 0), (-1, -1), 9),
        ("TOPPADDING",    (0, 0), (-1, -1), 7),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 7),
        ("LEFTPADDING",   (0, 0), (-1, -1), 8),
        ("RIGHTPADDING",  (0, 0), (-1, -1), 8),
        ("LINEBELOW",     (0, 0), (-1, 0), 0.5, BLUE),
        ("LINEBELOW",     (0, 1), (-1, -2), 0.5, BORDER),
        ("VALIGN",        (0, 0), (-1, -1), "MIDDLE"),
        *[("BACKGROUND",  (0, i), (-1, i), LIGHT_GRAY) for i in range(2, len(rows), 2)],
    ]
    return [
        Paragraph("Key Risk Metrics", styles["section"]),
        Table(rows, colWidths=[_W * 0.28, _W * 0.18, _W * 0.54],
              style=TableStyle(cmds), hAlign="LEFT"),
    ]


def _drawdown_section(results: dict, styles: dict) -> list:
    series = results.get("drawdown_series", [])
    if not series:
        return []
    img = Image(BytesIO(drawdown_chart(series)), width=_W, height=2.2 * inch)
    img.hAlign = "LEFT"
    return [Paragraph("Drawdown Over Time", styles["section"]), img]


def _correlation_section(results: dict, styles: dict) -> list:
    matrix = results.get("correlation_matrix", {})
    tickers = results.get("tickers", [])
    if not matrix or len(tickers) < 2:
        return []
    n = len(tickers)
    w = min(_W, max(3.0 * inch, n * 1.1 * inch))
    img = Image(BytesIO(correlation_heatmap(matrix, tickers)), width=w, height=w * 0.8)
    img.hAlign = "LEFT"
    return [Paragraph("Correlation Matrix", styles["section"]), img]


def _stress_section(results: dict, styles: dict) -> list:
    scenarios = results.get("stress_scenarios", {})
    cell_style = styles["cell"]
    rows = [["Scenario", "Portfolio Return"]]
    for name, value in sorted(scenarios.items(), key=lambda x: x[1]):
        hex_color = "#dc2626" if value < -0.25 else "#ea580c" if value < -0.15 else "#6b7280"
        rows.append([
            name,
            Paragraph(
                f'<font color="{hex_color}"><b>{value * 100:+.1f}%</b></font>',
                cell_style,
            ),
        ])
    return [
        Paragraph("Stress Scenarios", styles["section"]),
        _styled_table(rows, [_W * 0.65, _W * 0.35]),
    ]


def _methodology(styles: dict) -> list:
    return [
        Paragraph("Methodology", styles["section"]),
        Paragraph(
            "<b>Annualized Return:</b> Mean daily return compounded over 252 trading days. "
            "<b>Annualized Volatility:</b> Sample standard deviation of daily returns × √252. "
            "<b>Sharpe Ratio:</b> Excess return over the risk-free rate divided by annualized volatility. "
            "<b>Beta:</b> Covariance of portfolio and benchmark returns divided by benchmark variance. "
            "<b>Max Drawdown:</b> Largest peak-to-trough decline measured from the portfolio start date.",
            styles["small"],
        ),
        Spacer(1, 0.08 * inch),
        Paragraph(
            "<b>Data source:</b> Yahoo Finance via yfinance. "
            "Prices are adjusted for splits and dividends.",
            styles["small"],
        ),
        Spacer(1, 0.08 * inch),
        Paragraph(
            "This report is generated for informational purposes only and does not "
            "constitute financial advice. Past performance is not indicative of future results.",
            styles["small"],
        ),
    ]


# ── public entry point ────────────────────────────────────────────────────────

def generate_pdf(results: dict) -> bytes:
    buf = BytesIO()
    doc = SimpleDocTemplate(
        buf,
        pagesize=letter,
        leftMargin=0.75 * inch,
        rightMargin=0.75 * inch,
        topMargin=0.75 * inch,
        bottomMargin=0.75 * inch,
    )
    styles = build_styles()
    story = (
        _cover(results, styles)
        + [PageBreak()]
        + _portfolio_summary(results, styles)
        + _key_metrics(results, styles)
        + _drawdown_section(results, styles)
        + _correlation_section(results, styles)
        + _stress_section(results, styles)
        + _methodology(styles)
    )
    doc.build(story)
    return buf.getvalue()
