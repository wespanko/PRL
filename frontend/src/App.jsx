import { useEffect, useState } from "react";
import Sidebar from "./components/layout/Sidebar";
import TopBar from "./components/layout/TopBar";
import MarketsView from "./components/markets/MarketsView";
import MarketDetail from "./components/markets/MarketDetail";
import ArbView from "./components/arbitrage/ArbView";
import CalibrationView from "./components/calibration/CalibrationView";
import LearnView from "./components/learn/LearnView";
import Footer from "./components/Footer";
import { listActiveMarkets } from "./lib/polymarket";

export default function App() {
  const [view, setView] = useState("markets");
  const [selectedMarket, setSelectedMarket] = useState(null);
  const [apiStatus, setApiStatus] = useState("loading");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { fromCache, error } = await listActiveMarkets({ limit: 1 });
      if (cancelled) return;
      setApiStatus(fromCache || error ? "demo" : "live");
    })();
    return () => { cancelled = true; };
  }, []);

  const openMarket = (market) => {
    setSelectedMarket(market);
    setView("marketDetail");
  };

  const setNav = (id) => {
    if (id === "markets") setSelectedMarket(null);
    setView(id);
  };

  return (
    <div className="flex h-screen bg-black">
      <Sidebar active={view} onChange={setNav} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <TopBar view={view} apiStatus={apiStatus} />
        <main className="flex-1 overflow-auto bg-black p-4">
          {view === "markets" && <MarketsView onOpenMarket={openMarket} />}
          {view === "marketDetail" && <MarketDetail market={selectedMarket} onBack={() => setNav("markets")} />}
          {view === "arbitrage" && <ArbView onOpenMarket={openMarket} />}
          {view === "calibration" && <CalibrationView />}
          {view === "learn" && <LearnView />}
          <Footer />
        </main>
      </div>
    </div>
  );
}
