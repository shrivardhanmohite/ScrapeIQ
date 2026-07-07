import { motion } from "framer-motion";
import {
  Download,
  Edit3,
  FileSpreadsheet,
  FileText,
  Mail,
  RefreshCw,
  Trash2
} from "lucide-react";

const MotionArticle = motion.article;

export default function ReportCard({
  report,
  exported = false,
  onDelete,
  onView,
  onEdit,
  onRegenerate,
  onExport,
  onExportExcel,
  onEmail
}) {
  const dataset = report.datasetId && typeof report.datasetId === "object" ? report.datasetId : null;
  const workspace = report.workspaceId && typeof report.workspaceId === "object" ? report.workspaceId : null;

  return (
    <MotionArticle
      className="report-card"
      initial={{ opacity: 0, y: 14, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      whileHover={{ y: -4, scale: 1.01 }}
      transition={{ duration: 0.22 }}
    >
      <div className="report-card__top">
        <div className="report-card__title">
          <span><FileText size={17} /></span>
          <div>
            <h3>{report.title || "Untitled report"}</h3>
            <p>{dataset?.query || report.query || "No dataset recorded"}</p>
          </div>
        </div>
        <em>{report.status || "completed"}</em>
      </div>

      <div className="report-card__meta report-card__meta--library">
        <span>Dataset <strong>{dataset?.query || "Saved dataset"}</strong></span>
        <span>Generated <strong>{formatDate(report.createdAt)}</strong></span>
        <span>Export <strong>{exported || report.metadata?.exportedAt ? "Exported" : "Not exported"}</strong></span>
        <span>Workspace <strong>{workspace?.name || dataset?.workspaceName || "Unassigned"}</strong></span>
      </div>

      {report.generatedInsights?.length > 0 && (
        <div className="report-card__insight">
          <span>Key Insight</span>
          <p>{report.generatedInsights[0]}</p>
        </div>
      )}

      <div className="report-card__actions report-card__actions--library">
        <button type="button" onClick={() => onView(report)}>Open</button>
        <button type="button" onClick={() => onEdit?.(report)}><Edit3 size={15} /> Edit</button>
        <button type="button" onClick={() => onRegenerate?.(report)}><RefreshCw size={15} /> Regenerate</button>
        <button type="button" onClick={() => onExport(report)} title="Export PDF">
          <Download size={16} />
          PDF
        </button>
        <button type="button" onClick={() => onExportExcel?.(report)} title="Export Excel">
          <FileSpreadsheet size={16} />
          Excel
        </button>
        <button type="button" onClick={() => onEmail?.(report)} title="Email report">
          <Mail size={16} />
          Email
        </button>
        <button type="button" onClick={() => onDelete(report._id)} title="Delete">
          <Trash2 size={16} />
        </button>
      </div>
    </MotionArticle>
  );
}

function formatDate(date) {
  if (!date) return "Unknown";
  return new Date(date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric"
  });
}
