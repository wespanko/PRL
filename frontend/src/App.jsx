import { useMemo, useState } from "react";
import LandingHero from "./components/LandingHero";
import CsvUploader from "./components/CsvUploader";
import ReportDashboard from "./components/ReportDashboard";
import Footer from "./components/Footer";
import { fullReport } from "./lib/analytics";
import { generateSampleTrades } from "./lib/sampleData";

export default function App() {
  const [view, setView] = useState("landing");
  const [parsed, setParsed] = useState(null);
  const [source, setSource] = useState("");

  const report = useMemo(() => {
    if (!parsed?.trades?.length) return null;
    return fullReport(parsed.trades, {
      hasDates: parsed.hasDates,
      hasTimestamps: parsed.hasTimestamps,
      anyEstimated: parsed.anyEstimated,
    });
  }, [parsed]);

  const handleParsed = (result) => {
    setParsed(result);
    setSource("Uploaded CSV");
    setView("report");
  };

  const handleDemo = () => {
    const trades = generateSampleTrades();
    setParsed({
      trades,
      hasDates: true,
      hasTimestamps: true,
      anyEstimated: false,
    });
    setSource("Sample data");
    setView("report");
  };

  const handleNew = () => {
    setParsed(null);
    setView("landing");
  };

  if (view === "landing") {
    return (
      <>
        <LandingHero onUpload={() => setView("upload")} onTryDemo={handleDemo} />
        <Footer />
      </>
    );
  }

  if (view === "upload") {
    return (
      <CsvUploader
        onParsed={handleParsed}
        onBack={() => setView("landing")}
        onTryDemo={handleDemo}
      />
    );
  }

  if (view === "report" && report) {
    return (
      <ReportDashboard
        report={report}
        trades={parsed.trades}
        sourceLabel={source}
        onBack={handleNew}
      />
    );
  }

  return null;
}
