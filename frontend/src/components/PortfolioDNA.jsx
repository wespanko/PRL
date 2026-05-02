export default function PortfolioDNA({ dna }) {
  if (!dna) return null;
  const { type, primary_drivers, vulnerabilities } = dna;

  return (
    <div className="card dna-card">
      <div className="dna-header">
        <span className="dna-label">Portfolio DNA</span>
        <span className="dna-type">{type}</span>
      </div>
      <div className="dna-grid">
        {primary_drivers.length > 0 && (
          <div>
            <div className="dna-section-label">Primary Drivers</div>
            <div className="dna-pills">
              {primary_drivers.map((d) => (
                <span key={d} className="dna-pill dna-pill--driver">{d}</span>
              ))}
            </div>
          </div>
        )}
        {vulnerabilities.length > 0 && (
          <div>
            <div className="dna-section-label">Main Vulnerabilities</div>
            <div className="dna-pills">
              {vulnerabilities.map((v) => (
                <span key={v} className="dna-pill dna-pill--vuln">{v}</span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
