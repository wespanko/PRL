import { AlertTriangle } from "lucide-react";

export default function DisclaimerFooter({ setActiveTab }) {
  const year = new Date().getFullYear();
  return (
    <footer className="mt-12 px-6 md:px-10 pb-12">
      <div className="max-w-3xl mx-auto rounded-xl bg-slate-50 border border-slate-200 p-6 md:p-8">
        <div className="flex items-center gap-2 mb-3">
          <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" strokeWidth={2.5} />
          <div className="text-xs font-extrabold uppercase tracking-wider text-amber-700">
            Educational tool · Not financial advice · No warranty
          </div>
        </div>
        <p className="text-xs text-slate-500 leading-relaxed">
          Panko is provided <strong className="text-slate-500">"as is"</strong> by <strong className="text-slate-500">Panko Financial Strategies LLC</strong> for educational and informational purposes only. It is not investment advice, brokerage, or fiduciary service. Panko Financial Strategies LLC is <strong className="text-slate-500">not a registered investment adviser</strong> under the Investment Advisers Act of 1940. Numbers are computed from historical price data — <strong className="text-slate-500">past performance does not guarantee future results</strong>. Forward-looking projections are mathematical models, not forecasts. All investing carries risk of loss including loss of principal. The operator accepts no liability for losses, gains, taxes, or decisions made based on this tool's output. <strong className="text-slate-500">Consult a licensed financial advisor before making investment decisions.</strong>
        </p>
        {setActiveTab && (
          <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1.5 text-xs">
            <button type="button" onClick={() => setActiveTab("terms")} className="font-bold text-indigo-600 hover:text-indigo-700 hover:underline">
              Terms of Service
            </button>
            <button type="button" onClick={() => setActiveTab("privacy")} className="font-bold text-indigo-600 hover:text-indigo-700 hover:underline">
              Privacy Policy
            </button>
            <button type="button" onClick={() => setActiveTab("learn")} className="font-bold text-indigo-600 hover:text-indigo-700 hover:underline">
              Methodology (Learn tab)
            </button>
          </div>
        )}
        <div className="mt-4 text-[11px] text-slate-500 font-mono">
          © {year} Panko Financial Strategies LLC · All rights reserved
        </div>
      </div>
    </footer>
  );
}
