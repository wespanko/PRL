import pandas as pd

_KNOWN_EVENTS = [
    ("2007-10-01", "2009-06-30", "2008 Financial Crisis"),
    ("2020-02-01", "2020-04-30", "COVID-19 Crash"),
    ("2022-01-01", "2022-12-31", "2022 Rate Shock"),
    ("2018-10-01", "2018-12-31", "Q4 2018 Selloff"),
    ("2011-07-01", "2011-10-31", "US Debt Ceiling Crisis"),
    ("2015-08-01", "2015-09-30", "China Devaluation Shock"),
    ("2023-03-01", "2023-04-30", "SVB Banking Stress"),
]


def _label_period(start_date: pd.Timestamp) -> str:
    for s, e, label in _KNOWN_EVENTS:
        if pd.Timestamp(s) <= start_date <= pd.Timestamp(e):
            return label
    return start_date.strftime("%b %Y")


def _build_period_list(
    portfolio_returns: pd.Series, series: pd.Series, window: int
) -> list[dict]:
    result = []
    for end_date, total_return in series.items():
        end_pos = portfolio_returns.index.get_loc(end_date)
        start_pos = max(0, end_pos - window + 1)
        start_date = portfolio_returns.index[start_pos]
        result.append({
            "start": str(start_date.date()),
            "end": str(end_date.date()),
            "return": round(float(total_return), 4),
            "label": _label_period(start_date),
        })
    return result


def compute_worst_periods(
    portfolio_returns: pd.Series, n: int = 3, window: int = 21
) -> list[dict]:
    rolling = portfolio_returns.rolling(window).sum().dropna()
    return _build_period_list(portfolio_returns, rolling.nsmallest(n), window)


def compute_best_periods(
    portfolio_returns: pd.Series, n: int = 3, window: int = 21
) -> list[dict]:
    rolling = portfolio_returns.rolling(window).sum().dropna()
    return _build_period_list(portfolio_returns, rolling.nlargest(n), window)
