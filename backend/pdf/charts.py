from io import BytesIO

import matplotlib
matplotlib.use("Agg")  # non-interactive backend — must be set before importing pyplot
import matplotlib.pyplot as plt
import numpy as np


def drawdown_chart(series: list[dict]) -> bytes:
    dates = [d["date"] for d in series]
    values = [d["value"] * 100 for d in series]
    xs = list(range(len(dates)))

    fig, ax = plt.subplots(figsize=(7.0, 2.2), facecolor="white")
    ax.plot(xs, values, color="#dc2626", linewidth=1.2)
    ax.fill_between(xs, values, 0, color="#dc2626", alpha=0.08)
    ax.axhline(y=0, color="#e5e7eb", linewidth=0.8, zorder=0)
    ax.set_ylim(top=0)

    n = len(dates)
    if n > 1:
        step = max(1, n // 5)
        ticks = sorted(set(list(range(0, n, step)) + [n - 1]))
        ax.set_xticks(ticks)
        ax.set_xticklabels([dates[i][:7] for i in ticks], fontsize=7)

    ax.yaxis.set_major_formatter(plt.FuncFormatter(lambda v, _: f"{v:.0f}%"))
    ax.tick_params(axis="both", labelsize=7)
    for spine in ["top", "right"]:
        ax.spines[spine].set_visible(False)
    ax.spines["left"].set_color("#e5e7eb")
    ax.spines["bottom"].set_color("#e5e7eb")

    buf = BytesIO()
    fig.savefig(buf, format="png", dpi=150, bbox_inches="tight", facecolor="white")
    plt.close(fig)
    buf.seek(0)
    return buf.read()


def correlation_heatmap(matrix: dict, tickers: list[str]) -> bytes:
    n = len(tickers)
    data = np.array([[matrix[r][c] for c in tickers] for r in tickers], dtype=float)
    size = max(3.0, n * 1.1)

    fig, ax = plt.subplots(figsize=(size, size * 0.8), facecolor="white")
    im = ax.imshow(data, cmap="RdBu_r", vmin=-1, vmax=1, aspect="auto")

    ax.set_xticks(range(n))
    ax.set_yticks(range(n))
    ax.set_xticklabels(tickers, fontsize=9)
    ax.set_yticklabels(tickers, fontsize=9)

    for i in range(n):
        for j in range(n):
            color = "white" if abs(data[i, j]) > 0.5 else "#374151"
            weight = "bold" if i == j else "normal"
            ax.text(j, i, f"{data[i, j]:.2f}", ha="center", va="center",
                    fontsize=9, color=color, fontweight=weight)

    plt.colorbar(im, ax=ax, shrink=0.7, label="Correlation")
    for spine in ax.spines.values():
        spine.set_visible(False)

    buf = BytesIO()
    fig.savefig(buf, format="png", dpi=150, bbox_inches="tight", facecolor="white")
    plt.close(fig)
    buf.seek(0)
    return buf.read()
