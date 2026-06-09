import { ArrowRight, ShieldCheck, BarChart3, Brain } from "lucide-react";

export default function LandingHero({ onUpload, onTryDemo }) {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-zinc-900">
        <div className="max-w-6xl mx-auto px-6 py-5 flex items-center justify-between">
          <div className="font-semibold tracking-tight text-zinc-100">
            Trade Reality Check
          </div>
          <div className="text-xs text-zinc-500">Analytics only. No signals. No advice.</div>
        </div>
      </header>

      <section className="flex-1">
        <div className="max-w-4xl mx-auto px-6 pt-24 pb-20 text-center">
          <div className="inline-flex items-center gap-2 text-xs px-3 py-1 rounded-full border border-zinc-800 text-zinc-400 mb-8">
            <ShieldCheck className="w-3.5 h-3.5" />
            Your file is analyzed in your browser. Nothing is uploaded.
          </div>
          <h1 className="text-5xl md:text-6xl font-semibold tracking-tight text-zinc-50 leading-tight">
            Find out if your trading edge is real.
          </h1>
          <p className="mt-6 text-lg text-zinc-400 max-w-2xl mx-auto leading-relaxed">
            Upload your trade history and get a reality check on expectancy, drawdown risk,
            outlier dependence, and behavioral leaks — the things that quietly drain prop accounts.
          </p>
          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              onClick={onUpload}
              className="inline-flex items-center gap-2 bg-zinc-50 text-zinc-950 hover:bg-white px-5 py-3 rounded-lg font-medium transition-colors"
            >
              Upload Trade CSV <ArrowRight className="w-4 h-4" />
            </button>
            <button
              onClick={onTryDemo}
              className="inline-flex items-center gap-2 px-5 py-3 rounded-lg font-medium border border-zinc-800 text-zinc-300 hover:bg-zinc-900 transition-colors"
            >
              Try with sample data
            </button>
          </div>
        </div>
      </section>

      <section className="border-t border-zinc-900">
        <div className="max-w-6xl mx-auto px-6 py-16 grid md:grid-cols-3 gap-8">
          <Step
            icon={<BarChart3 className="w-5 h-5" />}
            n="01"
            title="Upload trades"
            desc="A CSV from your broker, prop firm, or journal. We auto-detect common column names."
          />
          <Step
            icon={<Brain className="w-5 h-5" />}
            n="02"
            title="Analyze risk and behavior"
            desc="Expectancy, drawdown, outlier dependence, sizing inconsistency, revenge trading, time-of-day."
          />
          <Step
            icon={<ShieldCheck className="w-5 h-5" />}
            n="03"
            title="Get rules to improve"
            desc="Direct, actionable rules — and a simulation of how the same trade distribution holds up against a prop firm's drawdown limits."
          />
        </div>
      </section>

      <section className="border-t border-zinc-900 bg-zinc-950">
        <div className="max-w-4xl mx-auto px-6 py-20">
          <div className="text-xs uppercase tracking-wider text-zinc-500 mb-4">Example insights</div>
          <div className="space-y-3 text-lg text-zinc-300">
            <p className="border-l-2 border-emerald-500/60 pl-4">
              "Your top 3 trades account for 84% of profits."
            </p>
            <p className="border-l-2 border-amber-500/60 pl-4">
              "You lose money after your first daily loss."
            </p>
            <p className="border-l-2 border-rose-500/60 pl-4">
              "Your position sizing is 3.7x more variable than your edge can support."
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}

function Step({ icon, n, title, desc }) {
  return (
    <div>
      <div className="flex items-center gap-3 mb-3">
        <div className="w-9 h-9 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-300">
          {icon}
        </div>
        <span className="text-xs font-mono text-zinc-500">{n}</span>
      </div>
      <h3 className="text-base font-medium text-zinc-100">{title}</h3>
      <p className="mt-2 text-sm text-zinc-400 leading-relaxed">{desc}</p>
    </div>
  );
}
