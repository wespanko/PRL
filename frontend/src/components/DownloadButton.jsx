import { useState } from "react";
import { downloadPdf } from "../api/client";
import { Button } from "./ui";

export default function DownloadButton({ payload }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  async function handleClick() {
    setLoading(true);
    setError(null);
    try {
      const blob = await downloadPdf(payload);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "panko_risk_report.pdf";
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="download-row">
      <Button variant="secondary" size="sm" onClick={handleClick} disabled={loading}>
        {loading ? "Generating…" : "Download PDF"}
      </Button>
      {error && <span className="download-error">{error}</span>}
    </div>
  );
}
