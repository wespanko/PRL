import { useState, useMemo } from "react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine, BarChart, Bar, Cell } from "recharts";

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
  // Simple amortization: monthly payment = P * (r/12) / (1 - (1+r/12)^-n)
  if (annualRate <= 0) return 0;
  const monthlyRate = annualRate / 12;
  const n = years * 12;
  const monthlyPayment = (principal * monthlyRate) / (1 - Math.pow(1 + monthlyRate, -n));
  const totalPaid = monthlyPayment * n;
  return totalPaid - principal;
}

function compoundedValue(monthlyContribution, annualRate, years) {
  // FV of a monthly annuity
  if (annualRate <= 0) return monthlyContribution * 12 * years;
  const r = annualRate / 12;
  const n = years * 12;
  return monthlyContribution * ((Math.pow(1 + r, n) - 1) / r);
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

  // Alt: invest the money instead. Compare opportunity cost.
  const investedGain = compoundedValue(monthlyPayment, portRate, years) - monthlyPayment * 12 * years;

  const debtIsHigher = debtRate > portRate;

  return (
    <div className="card plan-card">
      <div className="plan-card-header">
        <span className="plan-card-icon">$</span>
        <div>
          <h2 className="plan-card-title">Debt vs Invest</h2>
          <p className="plan-card-sub">
            Should you pay off your loans first or invest? The answer is mostly math —
            but the math is hidden behind big words. Let's make it obvious.
          </p>
        </div>
      </div>

      <div className="plan-inputs">
        <label className="plan-input">
          <span className="plan-input-label">Loan balance</span>
          <div className="plan-input-prefix">
            <span>$</span>
            <input
              type="number"
              value={balance}
              onChange={(e) => setBalance(parseFloat(e.target.value) || 0)}
              min="0"
              step="500"
            />
          </div>
        </label>
        <label className="plan-input">
          <span className="plan-input-label">Interest rate</span>
          <div className="plan-input-suffix">
            <input
              type="number"
              value={rate}
              onChange={(e) => setRate(parseFloat(e.target.value) || 0)}
              min="0"
              step="0.1"
            />
            <span>%</span>
          </div>
        </label>
        <label className="plan-input">
          <span className="plan-input-label">Years to pay off</span>
          <div className="plan-input-suffix">
            <input
              type="number"
              value={years}
              onChange={(e) => setYears(parseFloat(e.target.value) || 0)}
              min="1"
              step="1"
            />
            <span>yrs</span>
          </div>
        </label>
        <label className="plan-input">
          <span className="plan-input-label">Expected market return</span>
          <div className="plan-input-suffix">
            <input
              type="number"
              value={expectedReturn}
              onChange={(e) => setExpectedReturn(parseFloat(e.target.value) || 0)}
              min="0"
              step="0.5"
            />
            <span>%</span>
          </div>
        </label>
      </div>

      <div className="plan-default-note">
        Loan rates are <strong>nominal</strong> (the actual rate on your statement). The expected
        market return here is also nominal — <strong>10%</strong> is the S&P 500's long-run
        average (1928–2024). Lower it if you expect markets to underperform; raise it if you think
        the next decade will look like the last.
      </div>

      <div className={`plan-verdict ${debtIsHigher ? "plan-verdict--bad" : "plan-verdict--neutral"}`}>
        <div className="plan-verdict-headline">
          {debtIsHigher
            ? "The math suggests prioritizing this debt."
            : "Mathematically, investing the difference has higher expected value — with caveats."}
        </div>
        <div className="plan-verdict-body">
          {debtIsHigher
            ? `Your loan rate (${rate}%) exceeds the assumed market return (${expectedReturn}%). On a pure expected-value basis, paying down the loan dominates investing the same dollars. This is not advice — your actual situation may involve tax effects, liquidity needs, employer match opportunities, or psychological factors not captured here.`
            : `Your loan rate (${rate}%) is below the assumed market return (${expectedReturn}%). Math favors investing on a pure-expected-value basis, but markets don't return their average every year — they can crash 30%+ in a single year. The "only if you actually will" caveat matters: paying down debt is a guaranteed return; investing is not. This is a generic illustration, not a recommendation for your situation.`}
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
          <div className={`plan-comparison-value ${investedGain - interestPaid > 0 ? "plan-comparison-value--good" : "plan-comparison-value--bad"}`}>
            {investedGain - interestPaid > 0 ? "+" : ""}{fmtMoneyExact(investedGain - interestPaid)}
          </div>
        </div>
      </div>

      <div className="plan-tip">
        <strong>Real-world tip:</strong> credit cards (15-25%) are always pay-first. Student loans (5-7%)
        are close to expected market returns — the math is a coin flip, but the <em>certainty</em> of
        paying down debt is often worth it. Mortgages (3-7%) are the tightest call — historically,
        long-term equities have outperformed, but only if you actually invest and don't sell.
      </div>
    </div>
  );
}

// ─── FUTURE VALUE PROJECTOR ─────────────────────────────────────────────────

function projectFuture(start, monthly, annualRate, years) {
  // Project month by month
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

  const annualReturn = useMyPortfolio && portfolioReturn != null
    ? portfolioReturn
    : 0.10;  // S&P 500 long-run nominal historical average (10.1% over 1928-2024)
  const vol = useMyPortfolio && portfolioVol != null ? portfolioVol : 0.16;

  const data = useMemo(
    () => projectFuture(start, monthly, annualReturn, years),
    [start, monthly, annualReturn, years],
  );

  const final = data[data.length - 1].value;
  const totalContributed = start + monthly * 12 * years;
  const gainsFromGrowth = final - totalContributed;

  // Rough ±1σ bands using historical drift
  const lower = data.map((d) => ({
    year: d.year,
    value: d.value * Math.exp(-vol * Math.sqrt(d.year || 0.001)),
  }));
  const upper = data.map((d) => ({
    year: d.year,
    value: d.value * Math.exp(vol * Math.sqrt(d.year || 0.001)),
  }));
  const bandData = data.map((d, i) => ({
    year: d.year,
    expected: d.value,
    lower: lower[i].value,
    upper: upper[i].value,
  }));

  return (
    <div className="card plan-card">
      <div className="plan-card-header">
        <span className="plan-card-icon">↗</span>
        <div>
          <h2 className="plan-card-title">What could this be worth?</h2>
          <p className="plan-card-sub">
            Compounding is the most overlooked thing in finance. The math will surprise you.
          </p>
        </div>
      </div>

      <div className="plan-inputs">
        <label className="plan-input">
          <span className="plan-input-label">Starting amount</span>
          <div className="plan-input-prefix">
            <span>$</span>
            <input
              type="number"
              value={start}
              onChange={(e) => setStart(parseFloat(e.target.value) || 0)}
              min="0"
              step="500"
            />
          </div>
        </label>
        <label className="plan-input">
          <span className="plan-input-label">Adding per month</span>
          <div className="plan-input-prefix">
            <span>$</span>
            <input
              type="number"
              value={monthly}
              onChange={(e) => setMonthly(parseFloat(e.target.value) || 0)}
              min="0"
              step="50"
            />
          </div>
        </label>
        <label className="plan-input">
          <span className="plan-input-label">Years</span>
          <div className="plan-input-suffix">
            <input
              type="number"
              value={years}
              onChange={(e) => setYears(parseFloat(e.target.value) || 0)}
              min="1"
              max="60"
              step="1"
            />
            <span>yrs</span>
          </div>
        </label>
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
            {" "}{(portfolioVol * 100).toFixed(1)}% volatility) instead of S&P 500 defaults (10%, 16%)
          </span>
        </label>
      )}
      {!portfolioReturn && (
        <div className="plan-default-note">
          Default <strong>10%</strong> = S&P 500 nominal historical average (1928–2024).
          Going forward, big firms (Vanguard, Goldman) model 4–7% nominal for US equities — edit if you want a more conservative projection.
        </div>
      )}

      <div className="plan-projection-headline">
        <div className="plan-projection-amount">{fmtMoney(final)}</div>
        <div className="plan-projection-context">
          projected value in {years} years at {(annualReturn * 100).toFixed(1)}% expected return
        </div>
      </div>

      <ResponsiveContainer width="100%" height={220}>
        <LineChart data={bandData} margin={{ top: 8, right: 12, bottom: 0, left: -8 }}>
          <XAxis
            dataKey="year"
            tick={{ fontSize: 10, fill: "#aeaeb2" }}
            tickFormatter={(v) => `Y${v}`}
          />
          <YAxis
            tick={{ fontSize: 10, fill: "#aeaeb2" }}
            tickFormatter={(v) => v >= 1e6 ? `$${(v / 1e6).toFixed(1)}M` : `$${(v / 1000).toFixed(0)}k`}
            width={60}
          />
          <Tooltip
            cursor={{ stroke: "rgba(0,0,0,0.12)", strokeWidth: 1 }}
            contentStyle={{
              fontSize: 11, padding: "6px 10px",
              border: "0.5px solid rgba(0,0,0,0.12)",
              borderRadius: 8, background: "rgba(255,255,255,0.95)",
            }}
            formatter={(v, name) => [fmtMoney(v), name === "expected" ? "Expected" : name === "upper" ? "Optimistic" : "Pessimistic"]}
            labelFormatter={(l) => `Year ${l}`}
          />
          <Line type="monotone" dataKey="upper" stroke="#34c759" strokeWidth={1} strokeDasharray="3 3" dot={false} />
          <Line type="monotone" dataKey="expected" stroke="#007aff" strokeWidth={2.5} dot={false} />
          <Line type="monotone" dataKey="lower" stroke="#ff9f0a" strokeWidth={1} strokeDasharray="3 3" dot={false} />
        </LineChart>
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

      <div className="plan-tip">
        <strong>Why two dashed lines?</strong> Markets don't return their average every year.
        The blue line is the expected path. The green dashed line is roughly the best-case
        (one standard deviation up); orange is the worst-case (one standard deviation down).
        Reality is usually somewhere between — but anything is possible.
      </div>
    </div>
  );
}

// ─── DRAWDOWN EXPLAINER ─────────────────────────────────────────────────────

const HISTORICAL_DRAWDOWNS = [
  { event: "1987 Black Monday", drop: -34, recoveryYears: 2.0, color: "#ff9f0a" },
  { event: "2000 Dot-com",      drop: -49, recoveryYears: 7.0, color: "#ff3b30" },
  { event: "2008 Financial Crisis", drop: -57, recoveryYears: 5.0, color: "#ff3b30" },
  { event: "2020 COVID",        drop: -34, recoveryYears: 0.4, color: "#ffd60a" },
  { event: "2022 Inflation",    drop: -25, recoveryYears: 1.5, color: "#ff9f0a" },
];

function DrawdownExplainer() {
  return (
    <div className="card plan-card">
      <div className="plan-card-header">
        <span className="plan-card-icon">↓</span>
        <div>
          <h2 className="plan-card-title">Drawdowns aren't the enemy</h2>
          <p className="plan-card-sub">
            "Drawdown" is the biggest drop your portfolio takes from a peak. It feels terrifying.
            Here's why it shouldn't make you sell.
          </p>
        </div>
      </div>

      <div className="plan-callout">
        <strong>Every major US market drawdown in history has fully recovered.</strong>
        Some took months, some took years. But the people who held through them all
        ended up massively richer. The people who panic-sold at the bottom locked in
        the loss permanently.
      </div>

      <div className="plan-section-label">Major US market drawdowns since 1987</div>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={HISTORICAL_DRAWDOWNS} margin={{ top: 8, right: 12, bottom: 0, left: -8 }}>
          <XAxis
            dataKey="event"
            tick={{ fontSize: 10, fill: "#aeaeb2" }}
            interval={0}
          />
          <YAxis
            tick={{ fontSize: 10, fill: "#aeaeb2" }}
            tickFormatter={(v) => `${v}%`}
            domain={[-60, 0]}
          />
          <Tooltip
            cursor={{ fill: "rgba(0,0,0,0.04)" }}
            contentStyle={{ fontSize: 11, borderRadius: 8 }}
            formatter={(v, name, props) => [`${v}% drop, ${props.payload.recoveryYears}yr recovery`, props.payload.event]}
          />
          <ReferenceLine y={0} stroke="#000" strokeOpacity={0.15} />
          <Bar dataKey="drop" radius={[6, 6, 0, 0]}>
            {HISTORICAL_DRAWDOWNS.map((d, i) => (
              <Cell key={i} fill={d.color} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      <div className="plan-section-label">Recovery time per crash</div>
      <div className="plan-recovery-list">
        {HISTORICAL_DRAWDOWNS.map((d) => (
          <div key={d.event} className="plan-recovery-row">
            <span className="plan-recovery-event">{d.event}</span>
            <span className="plan-recovery-drop" style={{ color: d.color }}>
              {d.drop}%
            </span>
            <span className="plan-recovery-arrow">→</span>
            <span className="plan-recovery-time">
              recovered in {d.recoveryYears < 1 ? `${Math.round(d.recoveryYears * 12)} months` : `${d.recoveryYears} years`}
            </span>
          </div>
        ))}
      </div>

      <div className="plan-key-stats">
        <div className="plan-key-stat">
          <div className="plan-key-stat-value">+10%</div>
          <div className="plan-key-stat-label">S&P 500 average annual return, 1928 → today (with all those crashes baked in)</div>
        </div>
        <div className="plan-key-stat">
          <div className="plan-key-stat-value">$700k+</div>
          <div className="plan-key-stat-label">What $100 invested in the S&P in 1928 grew to (despite 1929, 2008, etc.)</div>
        </div>
        <div className="plan-key-stat">
          <div className="plan-key-stat-value">−40%</div>
          <div className="plan-key-stat-label">Average return for investors who panic-sold at the 2009 bottom — they missed the rebound</div>
        </div>
      </div>

      <div className="plan-tip">
        <strong>The key insight:</strong> drawdowns are how the market <em>pays</em> long-term
        investors. The reason equities return more than bonds over decades is precisely because
        they swing more in the short term. If you can't tolerate a 30% drop, you should hold a
        more defensive portfolio — not avoid the market entirely. The Improve tab can build one
        for you.
      </div>
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
      <div className="plan-hero">
        <h1 className="plan-hero-title">Plan</h1>
        <p className="plan-hero-sub">
          Personal-finance basics for beginners. Simple math, real numbers, no jargon.
        </p>
      </div>

      <div className="advisor-callout">
        <strong>Reminder:</strong> the calculators below are educational illustrations using
        generic assumptions. Your actual situation involves tax effects, liquidity needs, time
        horizon, employer matches, and behavioral factors that aren't modeled here.{" "}
        <strong>Consult a licensed financial advisor</strong> before acting on any of these numbers.
      </div>

      <DebtCalculator
        defaultExpectedReturn={portfolioReturn != null ? +(portfolioReturn * 100).toFixed(1) : 10}
      />

      <div className="risk-disclosure">
        <strong>Forward-looking risk disclosure:</strong> the projection chart below is a
        mathematical model based on a constant assumed return. <strong>Actual returns will differ
        substantially</strong> — markets can lose 30%+ in a single year, can underperform their
        long-run average for extended periods (sometimes decades), and have no guarantee of
        positive returns over any specific horizon. This is <strong>not a forecast or recommendation</strong>.
      </div>

      <FutureValueProjector
        portfolioReturn={portfolioReturn}
        portfolioVol={portfolioVol}
        totalValue={totalValue}
      />

      <DrawdownExplainer />
    </div>
  );
}
