import React, { useState } from "react";
import { motion } from "framer-motion";
import {
  BarChart3,
  CheckCircle2,
  Clock3,
  Database,
  Download,
  FileText,
  Save,
  Share2,
  Sparkles,
  X
} from "lucide-react";
import { exportReportPDF } from "../api/scraperApi";

export default function ReportPreviewModal({ report, onClose, onSave }) {
  const [isExporting, setIsExporting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const handleExportPDF = async () => {
    try {
      setIsExporting(true);
      const pdfBlob = await exportReportPDF(report._id);

      const url = window.URL.createObjectURL(pdfBlob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${report.title || "report"}-${Date.now()}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Export error:", err);
      alert("Failed to export PDF: " + err.message);
    } finally {
      setIsExporting(false);
    }
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);
      await onSave();
    } finally {
      setIsSaving(false);
    }
  };

  const confidence = report.metadata?.confidenceScore || report.confidenceScore || 92;
  const generatedDate = report.createdAt ? new Date(report.createdAt).toLocaleString() : "Ready";
  const executiveSummary = report.reportContent?.executiveSummary || "The report is ready for review.";
  const insightDetails = Array.isArray(report.reportContent?.insightDetails) ? report.reportContent.insightDetails : [];
  const recommendations = Array.isArray(report.reportContent?.recommendations) ? report.reportContent.recommendations : [];
  const visualAnalytics = Array.isArray(report.reportContent?.visualAnalytics) ? report.reportContent.visualAnalytics : [];
  const sourceReliability = Array.isArray(report.reportContent?.sourceReliabilityAnalysis) ? report.reportContent.sourceReliabilityAnalysis : [];

  return (
    <motion.div
      className="report-preview-backdrop"
      role="dialog"
      aria-modal="true"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      onClick={onClose}
    >
      <motion.div
        className="report-preview-modal"
        initial={{ opacity: 0, y: 26, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: "spring", stiffness: 240, damping: 24 }}
        onClick={(event) => event.stopPropagation()}
      >
        <header className="report-preview-header">
          <div>
            <span className="reports-eyebrow">
              <FileText size={15} />
              Report Preview
            </span>
            <h2>{report.title || "Executive report"}</h2>
            <p>{report.query || "No query recorded for this report."}</p>
          </div>
          <button onClick={onClose} className="report-modal-icon-btn" aria-label="Close report preview">
            <X size={20} />
          </button>
        </header>

        <div className="report-preview-timeline">
          <span><Database size={15} /> Dataset</span>
          <span><Sparkles size={15} /> AI Summary</span>
          <span><BarChart3 size={15} /> Charts</span>
          <span><CheckCircle2 size={15} /> Ready</span>
        </div>

        <div className="report-preview-body">
          <section className="report-preview-kpis">
            <article>
              <Database size={18} />
              <span>Total Records</span>
              <strong>{report.metadata?.rowCount || 0}</strong>
            </article>
            <article>
              <Share2 size={18} />
              <span>Sources</span>
              <strong>{report.metadata?.sourceCount || 0}</strong>
            </article>
            <article>
              <CheckCircle2 size={18} />
              <span>Confidence</span>
              <strong>{confidence}%</strong>
            </article>
            <article>
              <Clock3 size={18} />
              <span>Status</span>
              <strong>{report.status || "completed"}</strong>
            </article>
          </section>

          <section className="report-preview-section">
            <span>Executive Summary</span>
            <p>{executiveSummary}</p>
          </section>

          <section className="report-preview-section">
            <span>Key Insights</span>
            <ul className="report-preview-insights">
              {insightDetails.length > 0
                ? insightDetails.slice(0, 6).map((insight, idx) => (
                    <li key={idx}><strong>{insight.title}</strong>: {insight.observation}</li>
                  ))
                : (report.generatedInsights || []).slice(0, 6).map((insight, idx) => <li key={idx}>{insight}</li>)}
            </ul>
          </section>

          <section className="report-preview-section">
            <span>Analyst Recommendations</span>
            <ul className="report-preview-insights">
              {recommendations.length > 0
                ? recommendations.slice(0, 6).map((item, idx) => (
                    <li key={idx}><strong>{item.finding}</strong> — {item.recommendation}</li>
                  ))
                : (report.reportContent?.conclusion ? <li>{report.reportContent.conclusion}</li> : null)}
            </ul>
          </section>

          <section className="report-preview-section">
            <span>Visual Analytics</span>
            <div className="report-preview-chart-list">
              {visualAnalytics.length > 0
                ? visualAnalytics.slice(0, 4).map((chart, idx) => (
                    <article key={idx}>
                      <BarChart3 size={16} />
                      <div>
                        <strong>{chart.title}</strong>
                        <p>{chart.applicable ? chart.reason : `Not applicable: ${chart.reason}`}</p>
                      </div>
                    </article>
                  ))
                : (report.chartSnapshots || []).slice(0, 4).map((chart, idx) => (
                    <article key={idx}>
                      <BarChart3 size={16} />
                      <div>
                        <strong>{chart.title}</strong>
                        <p>{chart.description}</p>
                      </div>
                    </article>
                  ))}
            </div>
          </section>

          <section className="report-preview-section">
            <span>Source Reliability</span>
            <div className="report-preview-chart-list">
              {sourceReliability.length > 0
                ? sourceReliability.slice(0, 4).map((source, idx) => (
                    <article key={idx}>
                      <Share2 size={16} />
                      <div>
                        <strong>{source.domain}</strong>
                        <p>{source.reliabilityScore}/100 reliability · {source.authority}</p>
                      </div>
                    </article>
                  ))
                : <article><div><strong>No source reliability data</strong><p>The available dataset did not expose enough source metadata for a reliability breakdown.</p></div></article>}
            </div>
          </section>
        </div>

        <footer className="report-preview-footer">
          <span>Generated {generatedDate}</span>
          <div>
            <button onClick={onClose} className="report-soft-btn">Close</button>
            <button onClick={handleExportPDF} disabled={isExporting} className="report-primary-btn report-primary-btn--inline">
              <Download size={18} />
              {isExporting ? "Exporting..." : "Export PDF"}
            </button>
            <button onClick={handleSave} disabled={isSaving} className="report-soft-btn">
              <Save size={18} />
              {isSaving ? "Saving..." : "Save Report"}
            </button>
          </div>
        </footer>
      </motion.div>
    </motion.div>
  );
}
