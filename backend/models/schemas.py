from typing import Any
from pydantic import BaseModel, field_validator, model_validator


class Holding(BaseModel):
    ticker: str
    weight: float


class PortfolioRequest(BaseModel):
    holdings: list[Holding]
    start_date: str
    end_date: str
    benchmark: str = "SPY"
    risk_free_rate: float = 0.045
    total_value: float | None = None  # optional dollar value of portfolio

    @field_validator("holdings")
    @classmethod
    def weights_must_sum_to_one(cls, holdings: list[Holding]) -> list[Holding]:
        total = sum(h.weight for h in holdings)
        if abs(total - 1.0) > 0.001:
            raise ValueError(f"Weights must sum to 1.0, got {total:.4f}")
        return holdings

    @model_validator(mode="after")
    def start_before_end(self) -> "PortfolioRequest":
        if self.start_date >= self.end_date:
            raise ValueError("start_date must be before end_date")
        return self


class AnalyzeResponse(BaseModel):
    tickers: list[str]
    weights: list[float]
    annualized_return: float
    annualized_volatility: float
    sharpe_ratio: float
    beta: float
    max_drawdown: float
    var_95: float
    cvar_95: float
    upside_capture: float
    downside_capture: float
    risk_contributions: list[dict[str, Any]]
    concentration: dict[str, float]
    worst_periods: list[dict[str, Any]]
    best_periods: list[dict[str, Any]]
    exposures: dict[str, Any]
    stress_breakdown: dict[str, list[dict[str, Any]]]
    analyst_summary: dict[str, Any]
    portfolio_dna: dict[str, Any]
    correlation_matrix: dict[str, dict[str, float]]
    drawdown_series: list[dict[str, Any]]
    stress_scenarios: dict[str, float]
    period: dict[str, str]
    actual_period: dict[str, str]
    limited_history_tickers: list[str]
    benchmark: str
    benchmark_attribution: dict[str, float]
    risk_score: float
