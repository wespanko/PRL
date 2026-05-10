// Plan — DESIGN_BRIEF.md §7
//
// Strict spec:
//   • Three calculator cards.
//   • Compound interest chart: blue series + --blue-100 confidence band.
//   • "Drawdowns aren't the enemy" gets the --blue-900 dark inverted
//     treatment — the page's ONE dark section per §4.

import { useState, useMemo } from "react";
import {
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  BarChart,
  Bar,
  Cell,
} from "recharts";
import { Banner } from "./ui";

function fmtMoney(n) {
  if (!Number.isFinite(n)) return "$0";
  if (Math.abs(n) >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
  if (Math.abs(n) >= 1_000) return `$${Math.round(n).toLocaleString("en-US")}`;
  return `$${Math.round(n).toLocaleString("en-US")}`;
}

function fmtMoneyExact(n) {
  if (!Number.isFinite(n)) return "$0";
  return `$${Math.round(n).toLocaleString("en-US")}`;
}

// ─── DEBT CALCULATOR ────────────────────────────────────────────────────────

function totalInterest(principal, annualRate, years) {
  if (annualRate <= 0) return 0;
  const monthlyRate = annualRate / 12;
  const n = years * 12;
  const monthlyPayment = (principal * monthlyRate) / (1 - Math.pow(1 + monthlyRate, -n));
  const totalPaid = monthlyPayment * n;
  return totalPaid - principal;
}

function compoundedValue(monthlyContribution, annualRate, years) {
  if (annualRate <= 0) return monthlyContribution * 12 * years;
  const r = annualRate / 12;
  const n = years * 12;
  return monthlyContribution * ((Math.pow(1 + r, n) - 1) / r);
}

function PlanInput({ label, prefix, suffix, ...inputProps }) {
  return (
    <label className="plan-input">
      <span className="plan-input-label">{label}</span>
      <div className={`plan-input-row ${prefix ? "has-prefix" : ""} ${suffix ? "has-suffix" : ""}`}>
        {prefix && <span className="plan-input-affix">{prefix}</span>}
        <input className="plan-input-control" {...inputProps} />
        {suffix && <span className="plan-input-affix">{suffix}</span>}
      </div>
    </label>
  );
}

function DebtCalculator({ defaultExpectedReturn }) {
  const [balance, setBalance] = useState(30000);
  const [rate, setRate] = useState(6.5);
  const [years, setYears] = useState(10);
  const [expectedReturn, setExpectedReturn] = useState(defaultExpectedReturn ?? 10);

  const debtRate = rate / 100;
  const portRate = expectedReturn / 100;
  const interestPaid = totalInterest(balance, debtRate, years);
  const monthlyPayment = (balance * (debtRate / 12)) / (1 - Math.pow(1 + debtRate / 12, -years * 12));
  const investedGain = compoundedValue(monthlyPayment, portRate, years) - monthlyPayment * 12 * years;
  const debtIsHigher = debtRate > portRate;

  return (
    <div className="card plan-card">
      <div className="plan-card-header">
        <span className="plan-card-glyph" aria-hidden="true">$</span>
        <div>
          <h2 className="plan-card-title">Debt vs Invest</h2>
          <p className="plan-card-sub">
            Should you pay off your loans first or invest? The answer is mostly math —
            but the math is hidden behind big words. Let's make it obvious.
          </p>
        </div>
      </div>

      <div className="plan-inputs">
        <PlanInput
          label="Loan balance"
          prefix="$"
          type="number"
          value={balance}
          onChange={(e) => setBalance(parseFloat(e.target.value) || 0)}
          min="0"
          step="500"
        />
        <PlanInput
          label="Interest rate"
          suffix="%"
          type="number"
          value={rate}
          onChange={(e) => setRate(parseFloat(e.target.value) || 0)}
          min="0"
          step="0.1"
        />
        <PlanInput
          label="Years to pay off"
          suffix="yrs"
          type="number"
          value={years}
          onChange={(e) => setYears(parseFloat(e.target.value) || 0)}
          min="1"
          step="1"
        />
        <PlanInput
          label="Expected market return"
          suffix="%"
          type="number"
          value={expectedReturn}
          onChange={(e) => setExpectedReturn(parseFloat(e.target.value) || 0)}
          min="0"
          step="0.5"
        />
      </div>

      <p className="plan-default-note">
        Loan rates are <strong>nominal</strong> (the actual rate on your statement). The
        expected market return here is also nominal — <strong>10%</strong> is the S&amp;P
        500's long-run average (1928–2024). Lower it if you expect markets to underperform;
        raise it if you think the next decade will look like the last.
      </p>

      <div className={`plan-verdict ${debtIsHigher ? "plan-verdict--bad" : "plan-verdict--neutral"}`}>
        <div className="plan-verdict-headline">
          {debtIsHigher
            ? "The math suggests prioritizing this debt."
            : "Mathematically, investing the difference has higher expected value — with caveats."}
        </div>
        <div className="plan-verdict-body">
          {debtIsHigher
            ? `Your loan rate (${rate}%) exceeds the assumed market return (${expectedReturn}%). On a pure expected-value basis, paying down the loan dominates investing the same dollars. This is not advice — your actual situation may involve tax effects, liquidity needs, employer-match opportunities, or psychological factors not captured here.`
            : `Your loan rate (${rate}%) is below the assumed market return (${expectedReturn}%). Math favors investing on a pure-expected-value basis, but markets don't return their average every year — they can crash 30%+ in a single year. The "only if you actually will" caveat matters: paying down debt is a guaranteed return; investing is not.`}
        </div>
      </div>

      <div className="plan-comparison">
        <div className="plan-comparison-row">
          <div className="plan-comparison-label">Monthly payment</div>
          <div className="plan-comparison-value">{fmtMoneyExact(monthlyPayment)}</div>
        </div>
        <div className="plan-comparison-row">
          <div className="plan-comparison-label">
            Total interest you'll pay over {years} years
          </div>
          <div className="plan-comparison-value plan-comparison-value--bad">
            {fmtMoneyExact(interestPaid)}
          </div>
        </div>
        <div className="plan-comparison-row">
          <div className="plan-comparison-label">
            If instead you invested {fmtMoneyExact(monthlyPayment)}/mo at {expectedReturn}%
          </div>
          <div className="plan-comparison-value plan-comparison-value--good">
            +{fmtMoneyExact(investedGain)}
          </div>
        </div>
        <div className="plan-comparison-row plan-comparison-row--total">
          <div className="plan-comparison-label">
            Net difference (invest path − pay-off path)
          </div>
          <div
            className={`plan-comparison-value ${
              investedGain - interestPaid > 0
                ? "plan-comparison-value--good"
                : "plan-comparison-value--bad"
            }`}
          >
            {investedGain - interestPaid > 0 ? "+" : ""}
            {fmtMoneyExact(investedGain - interestPaid)}
          </div>
        </div>
      </div>

      <details className="plan-tip">
        <summary>
          <strong>Real-world tip</strong> — when math vs. behavior matters →
        </summary>
        <p>
          <strong>Credit cards (15–25%):</strong> always pay first. The math isn't even
          close.
        </p>
        <p>
          <strong>Student loans (5–7%):</strong> close to expected market returns — the
          math is a coin flip, but the <em>certainty</em> of paying down debt is often
          worth it.
        </p>
        <p>
          <strong>Mortgages (3–7%):</strong> tightest call. Historically, long-term
          equities have outperformed — <em>but only if you actually invest the difference
          and don't sell during a downturn</em>.
        </p>
      </details>
    </div>
  );
}

// ─── FUTURE VALUE PROJECTOR ─────────────────────────────────────────────────

function projectFuture(start, monthly, annualRate, years) {
  const data = [];
  let balance = start;
  const r = annualRate / 12;
  for (let y = 0; y <= years; y++) {
    data.push({ year: y, value: balance });
    for (let m = 0; m < 12 && y < years; m++) {
      balance = balance * (1 + r) + monthly;
    }
  }
  return data;
}

function FutureValueProjector({ portfolioReturn, portfolioVol, totalValue }) {
  const [start, setStart] = useState(totalValue && totalValue > 0 ? Math.round(totalValue) : 10000);
  const [monthly, setMonthly] = useState(500);
  const [years, setYears] = useState(20);
  const [useMyPortfolio, setUseMyPortfolio] = useState(!!portfolioReturn);

  const annualReturn = useMyPortfolio && portfolioReturn != null ? portfolioReturn : 0.10;
  const vol = useMyPortfolio && portfolioVol != null ? portfolioVol : 0.16;

  const data = useMemo(
    () => projectFuture(start, monthly, annualReturn, years),
    [start, monthly, annualReturn, years],
  );

  const final = data[data.length - 1].value;
  const totalContributed = start + monthly * 12 * years;
  const gainsFromGrowth = final - totalContributed;

  // ±1σ bands using historical drift.
  const bandData = data.map((d) => {
    const yearForVol = d.year || 0.001;
    const lower = d.value * Math.exp(-vol * Math.sqrt(yearForVol));
    const upper = d.value * Math.exp(vol * Math.sqrt(yearForVol));
    return {
      year: d.year,
      expected: d.value,
      lower,
      bandWidth: Math.max(0, upper - lower),
      upper,
    };
  });

  return (
    <div className="card plan-card">
      <div className="plan-card-header">
        <span className="plan-card-glyph" aria-hidden="true">↗</span>
        <div>
          <h2 className="plan-card-title">What could this be worth?</h2>
          <p className="plan-card-sub">
            Compounding is the most overlooked thing in finance. The math will surprise you.
          </p>
        </div>
      </div>

      <div className="plan-inputs">
        <PlanInput
          label="Starting amount"
          prefix="$"
          type="number"
          value={start}
          onChange={(e) => setStart(parseFloat(e.target.value) || 0)}
          min="0"
          step="500"
        />
        <PlanInput
          label="Adding per month"
          prefix="$"
          type="number"
          value={monthly}
          onChange={(e) => setMonthly(parseFloat(e.target.value) || 0)}
          min="0"
          step="50"
        />
        <PlanInput
          label="Years"
          suffix="yrs"
          type="number"
          value={years}
          onChange={(e) => setYears(parseFloat(e.target.value) || 0)}
          min="1"
          max="60"
          step="1"
        />
      </div>

      {portfolioReturn != null && (
        <label className="plan-toggle">
          <input
            type="checkbox"
            checked={useMyPortfolio}
            onChange={(e) => setUseMyPortfolio(e.target.checked)}
          />
          <span>
            Use my portfolio's actual numbers ({(portfolioReturn * 100).toFixed(1)}% return,
            {" "}
            {(portfolioVol * 100).toFixed(1)}% volatility) instead of S&amp;P 500 defaults
            (10%, 16%)
          </span>
        </label>
      )}
      {!portfolioReturn && (
        <p className="plan-default-note">
          Default <strong>10%</strong> = S&amp;P 500 nominal historical average (1928–2024).
          Going forward, big firms (Vanguard, Goldman) model 4–7% nominal for US equities —
          edit if you want a more conservative projection.
        </p>
      )}

      <div className="plan-projection-headline">
        <div className="plan-projection-amount">{fmtMoney(final)}</div>
        <div className="plan-projection-context">
          projected value in {years} years at {(annualReturn * 100).toFixed(1)}% expected return
        </div>
      </div>

      {/* §5 + §7: blue-700 expected line, blue-100 confidence band.
          The lower bound is rendered as an invisible stacked Area so the
          band Area can sit on top of it. */}
      <ResponsiveContainer width="100%" height={240}>
        <ComposedChart data={bandData} margin={{ top: 8, right: 12, bottom: 0, left: -8 }}>
          <XAxis
            dataKey="year"
            tick={{ fontSize: 10.5, fill: "#9ca3af" }}
            tickFormatter={(v) => `Y${v}`}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{ fontSize: 10.5, fill: "#9ca3af" }}
            tickFormatter={(v) => (v >= 1e6 ? `$${(v / 1e6).toFixed(1)}M` : `$${(v / 1000).toFixed(0)}k`)}
            width={60}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            cursor={{ stroke: "rgba(17, 24, 39, 0.16)", strokeWidth: 1, strokeDasharray: "3 3" }}
            contentStyle={{
              fontSize: 12,
              padding: "8px 12px",
              border: "1px solid rgba(17, 24, 39, 0.08)",
              borderRadius: 8,
              background: "#ffffff",
              boxShadow: "0 4px 16px rgba(17, 24, 39, 0.08)",
            }}
            formatter={(v, name) => {
              if (name === "lower" || name === "bandWidth") return null;
              if (name === "expected") return [fmtMoney(v), "Expected"];
              if (name === "upper") return [fmtMoney(v), "Optimistic (≈+1σ)"];
              return null;
            }}
            labelFormatter={(l) => `Year ${l}`}
          />
          {/* Invisible baseline so the band stacks correctly */}
          <Area
            dataKey="lower"
            stackId="conf"
            fill="transparent"
            stroke="none"
            isAnimationActive={false}
            tooltipType="none"
          />
          {/* The visible blue-100 confidence band */}
          <Area
            dataKey="bandWidth"
            stackId="conf"
            fill="#E8EEF5"
            fillOpacity={0.85}
            stroke="none"
            tooltipType="none"
          />
          {/* Expected line in --blue-700 */}
          <Line
            type="monotone"
            dataKey="expected"
            stroke="#1E3A5F"
            strokeWidth={2.4}
            dot={false}
            isAnimationActive={true}
            animationDuration={650}
          />
        </ComposedChart>
      </ResponsiveContainer>

      <div className="plan-projection-breakdown">
        <div className="plan-breakdown-row">
          <span className="plan-breakdown-label">Money you put in</span>
          <span className="plan-breakdown-value">{fmtMoney(totalContributed)}</span>
        </div>
        <div className="plan-breakdown-row">
          <span className="plan-breakdown-label">Money the market made for you</span>
          <span className="plan-breakdown-value plan-breakdown-value--good">
            +{fmtMoney(gainsFromGrowth)}
          </span>
        </div>
        <div className="plan-breakdown-row plan-breakdown-row--total">
          <span className="plan-breakdown-label">Final balance</span>
          <span className="plan-breakdown-value">{fmtMoney(final)}</span>
        </div>
      </div>

      <details className="plan-tip">
        <summary>
          <strong>Why is the area shaded?</strong> →
        </summary>
        <p>
          Markets <strong>don't</strong> return their average every year. The blue line is
          the expected path. The pale band shows roughly the ±1σ range — most outcomes
          fall inside it, but reality can land anywhere.
        </p>
      </details>
    </div>
  );
}

// ─── DRAWDOWN EXPLAINER (the page's one dark section, §7 + §4) ──────────────

const HISTORICAL_DRAWDOWNS = [
  // Two-tier severity per §6 — risk-red for severe (>40%), risk-amber otherwise.
  // On --blue-900 dark bg these stay legible.
  { event: "1987 Black Monday",     drop: -34, recoveryYears: 2.0, severity: "amber" },
  { event: "2000 Dot-com",          drop: -49, recoveryYears: 7.0, severity: "red"   },
  { event: "2008 Financial Crisis", drop: -57, recoveryYears: 5.0, severity: "red"   },
  { event: "2020 COVID",            drop: -34, recoveryYears: 0.4, severity: "amber" },
  { event: "2022 Inflation",        drop: -25, recoveryYears: 1.5, severity: "amber" },
];

const DD_BAR_FILL = {
  red:   "#B33A3A",  // --risk-red
  amber: "#C68A1A",  // --risk-amber
};

function DrawdownExplainer() {
  return (
    <div className="card plan-card plan-card--dark">
      <div className="plan-card-header">
        <span className="plan-card-glyph plan-card-glyph--dark" aria-hidden="true">↓</span>
        <div>
          <h2 className="plan-card-title plan-card-title--dark">Drawdowns aren't the enemy</h2>
          <p className="plan-card-sub plan-card-sub--dark">
            "Drawdown" is the biggest drop your portfolio takes from a peak. It feels
            terrifying. Here's why it shouldn't make you sell.
          </p>
        </div>
      </div>

      <div className="plan-callout plan-callout--dark">
        <strong>Every major US market drawdown in history has fully recovered.</strong>{" "}
        Some took months, some took years. But the people who held through them all ended
        up massively richer. The people who panic-sold at the bottom locked in the loss
        permanently.
      </div>

      <div className="plan-section-label plan-section-label--dark">
        Major US market drawdowns since 1987
      </div>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={HISTORICAL_DRAWDOWNS} margin={{ top: 8, right: 12, bottom: 0, left: -8 }}>
          <XAxis
            dataKey="event"
            tick={{ fontSize: 10.5, fill: "#A0AEC0" }}
            interval={0}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{ fontSize: 10.5, fill: "#A0AEC0" }}
            tickFormatter={(v) => `${v}%`}
            domain={[-60, 0]}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            cursor={{ fill: "rgba(255, 255, 255, 0.04)" }}
            contentStyle={{
              fontSize: 12,
              padding: "8px 12px",
              border: "1px solid rgba(255, 255, 255, 0.12)",
              borderRadius: 8,
              background: "#0B1F3A",
              color: "#FFFFFF",
            }}
            formatter={(v, _name, props) =>
              [`${v}% drop, ${props.payload.recoveryYears}yr recovery`, props.payload.event]
            }
          />
          <ReferenceLine y={0} stroke="rgba(255,255,255,0.18)" />
          <Bar dataKey="drop" radius={[4, 4, 0, 0]}>
            {HISTORICAL_DRAWDOWNS.map((d, i) => (
              <Cell key={i} fill={DD_BAR_FILL[d.severity]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      <div className="plan-section-label plan-section-label--dark">
        Recovery time per crash
      </div>
      <div className="plan-recovery-list">
        {HISTORICAL_DRAWDOWNS.map((d) => (
          <div key={d.event} className="plan-recovery-row plan-recovery-row--dark">
            <span className="plan-recovery-event">{d.event}</span>
            <span
              className="plan-recovery-drop"
              style={{ color: DD_BAR_FILL[d.severity] }}
            >
              {d.drop}%
            </span>
            <span className="plan-recovery-arrow">→</span>
            <span className="plan-recovery-time">
              recovered in{" "}
              {d.recoveryYears < 1
                ? `${Math.round(d.recoveryYears * 12)} months`
                : `${d.recoveryYears} years`}
            </span>
          </div>
        ))}
      </div>

      <div className="plan-key-stats plan-key-stats--dark">
        <div className="plan-key-stat plan-key-stat--dark">
          <div className="plan-key-stat-value plan-key-stat-value--dark">+10%</div>
          <div className="plan-key-stat-label plan-key-stat-label--dark">
            S&amp;P 500 average annual return, 1928 → today (with all those crashes baked in)
          </div>
        </div>
        <div className="plan-key-stat plan-key-stat--dark">
          <div className="plan-key-stat-value plan-key-stat-value--dark">$700k+</div>
          <div className="plan-key-stat-label plan-key-stat-label--dark">
            What $100 invested in the S&amp;P in 1928 grew to (despite 1929, 2008, etc.)
          </div>
        </div>
        <div className="plan-key-stat plan-key-stat--dark">
          <div className="plan-key-stat-value plan-key-stat-value--dark">−40%</div>
          <div className="plan-key-stat-label plan-key-stat-label--dark">
            Average return for investors who panic-sold at the 2009 bottom — they missed
            the rebound
          </div>
        </div>
      </div>

      <details className="plan-tip plan-tip--dark" open>
        <summary>
          <strong>The key insight</strong> →
        </summary>
        <p>
          Drawdowns are how the market <em>pays</em> long-term investors. The reason
          equities return more than bonds over decades is{" "}
          <strong>precisely because they swing more</strong> in the short term.
        </p>
        <p>
          If you <strong>can't tolerate a 30% drop</strong>, you should hold a more
          defensive portfolio — not avoid the market entirely. The Improve tab can build
          one for you.
        </p>
      </details>
    </div>
  );
}

// ─── MAIN PLAN PAGE ─────────────────────────────────────────────────────────

export default function PlanPage({ results, payload }) {
  const portfolioReturn = results?.annualized_return;
  const portfolioVol = results?.annualized_volatility;
  const totalValue = results?.total_value;

  return (
    <div className="container">
      <header className="plan-header">
        <h1 className="pk-text-heading-lg pk-ink-900">Plan</h1>
        <p className="pk-text-body-lg pk-ink-500 plan-header-sub">
          Personal-finance basics for beginners. Simple math, real numbers, no jargon.
        </p>
      </header>

      <Banner variant="warning" title="Educational illustrations, not financial advice">
        The calculators below use generic assumptions. Your actual situation involves tax
        effects, liquidity needs, time horizon, employer matches, and behavioral factors
        that aren't modeled here. Consult a licensed financial advisor before acting on any
        of these numbers.
      </Banner>

      <DebtCalculator
        defaultExpectedReturn={portfolioReturn != null ? +(portfolioReturn * 100).toFixed(1) : 10}
      />

      <FutureValueProjector
        portfolioReturn={portfolioReturn}
        portfolioVol={portfolioVol}
        totalValue={totalValue}
      />

      <DrawdownExplainer />
    </div>
  );
}
