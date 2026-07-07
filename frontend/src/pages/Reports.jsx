import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Download,
  FileText,
  Mail,
  Search,
  Sparkles,
} from "lucide-react";

import {
  exportReportPDF,
  getReports,
} from "../api/scraperApi";

export default function Reports() {
  const navigate = useNavigate();
  const [reports, setReports] = useState([]);
  const [selectedReportId, setSelectedReportId] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let isMounted = true;

    const loadReports = async () => {
      try {
        const reportItems = await getReports();
        if (!isMounted) return;
        setReports(Array.isArray(reportItems) ? reportItems : []);
        if (Array.isArray(reportItems) && reportItems.length > 0 && !selectedReportId) {
          setSelectedReportId(reportItems[0]._id);
        }
      } catch (err) {
        console.error("Failed to load reports:", err);
        if (isMounted) setError(err.message || "Failed to load reports.");
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    void loadReports();

    return () => {
      isMounted = false;
    };
  }, []);

  const filteredReports = useMemo(() => {
    const query = searchTerm.toLowerCase().trim();
    return reports.filter((report) => {
      const haystack = `${report.title || ""} ${report.query || ""}`.toLowerCase();
      return !query || haystack.includes(query);
    });
  }, [reports, searchTerm]);

  const selectedReport = useMemo(
    () => filteredReports.find((report) => report._id === selectedReportId) || filteredReports[0] || null,
    [filteredReports, selectedReportId]
  );

  const handleExportPdf = async (report) => {
    if (!report?._id) return;
    try {
      const pdfBlob = await exportReportPDF(report._id);
      const url = window.URL.createObjectURL(pdfBlob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${(report.title || "report").toLowerCase().replace(/\s+/g, "-")}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Export error:", err);
      setError(err.message || "Failed to export PDF.");
    }
  };

  return (
    <div className="reports-page">
      <section className="reports-hero">
        <div>
          <span className="reports-eyebrow">
            <FileText size={15} />
            Report library
          </span>
          <h1>Review generated reports in a single, focused workspace.</h1>
          <p>Select a report from the library to load the full preview instantly without leaving the page.</p>
        </div>
        <button className="reports-back-btn" onClick={() => navigate("/agent")}>
          <Sparkles size={16} />
          Open research
        </button>
      </section>

      {error && <div className="report-error-banner">{error}</div>}

      {loading ? (
        <div className="reports-loading">Loading report library...</div>
      ) : (
        <div className="reports-shell">
          <aside className="reports-library">
            <label className="reports-search reports-search--compact">
              <Search size={15} />
              <input value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} placeholder="Search reports" />
            </label>

            <div className="reports-library__list">
              {filteredReports.length === 0 ? (
                <div className="dashboard-empty">No reports match your current search.</div>
              ) : (
                filteredReports.map((report) => (
                  <button
                    key={report._id}
                    className={`reports-library__item ${selectedReport?._id === report._id ? "reports-library__item--active" : ""}`}
                    onClick={() => setSelectedReportId(report._id)}
                  >
                    <strong>{report.title || "Untitled report"}</strong>
                    <span>{new Date(report.createdAt).toLocaleDateString()}</span>
                    <p>{report.query || "Report generated from a saved dataset"}</p>
                  </button>
                ))
              )}
            </div>
          </aside>

          <section className="reports-preview-panel">
            {selectedReport ? (
              <>
                <div className="reports-preview-panel__header">
                  <div>
                    <span>Preview</span>
                    <h2>{selectedReport.title || "Untitled report"}</h2>
                  </div>
                  <div className="report-export-actions report-export-actions--wrap">
                    <button onClick={() => handleExportPdf(selectedReport)}>
                      <Download size={16} />
                      PDF
                    </button>
                    <button onClick={() => window.alert("Excel export is available from the research workspace.")}>
                      <Mail size={16} />
                      Email
                    </button>
                  </div>
                </div>

                <div className="reports-preview-metadata">
                  <span>{selectedReport.metadata?.rowCount || 0} rows</span>
                  <span>{selectedReport.metadata?.sourceCount || 0} sources</span>
                  <span>{selectedReport.status || "completed"}</span>
                  <span>{new Date(selectedReport.createdAt).toLocaleDateString()}</span>
                </div>

                <div className="reports-preview-content">
                  <h3>Executive summary</h3>
                  <p>{selectedReport.reportContent?.executiveSummary || selectedReport.generatedInsights?.[0] || "A polished executive summary will appear here once the report has been generated."}</p>

                  {selectedReport.generatedInsights?.length > 0 && (
                    <>
                      <h3>Key findings</h3>
                      <ul>
                        {selectedReport.generatedInsights.slice(0, 4).map((insight, index) => (
                          <li key={index}>{insight}</li>
                        ))}
                      </ul>
                    </>
                  )}

                  {selectedReport.reportContent?.recommendations?.length > 0 && (
                    <>
                      <h3>Recommendations</h3>
                      <ul>
                        {selectedReport.reportContent.recommendations.slice(0, 4).map((recommendation, index) => (
                          <li key={index}>{recommendation}</li>
                        ))}
                      </ul>
                    </>
                  )}
                </div>
              </>
            ) : (
              <div className="dashboard-empty">Select a report from the library to preview it here.</div>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
