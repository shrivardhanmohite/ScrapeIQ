import express from "express";
import {
  generateReport,
  getAllReports,
  getReport,
  getWorkspaceReports,
  deleteReport,
  exportReportPDF,
} from "../services/reportService.js";

const router = express.Router();

// POST /api/report/generate - Generate report for a dataset
router.post("/generate", async (req, res) => {
  try {
    const { workspaceId, datasetId } = req.body;

    if (!datasetId) {
      return res.status(400).json({
        message: "datasetId is required",
      });
    }

    const result = await generateReport(workspaceId, datasetId);

    if (!result.success) {
      return res.status(500).json({ message: result.error });
    }

    res.json(result);
  } catch (err) {
    console.error("Generate report error:", err);
    res.status(500).json({ message: err.message });
  }
});

// GET /api/report/all - Get all reports
router.get("/all", async (req, res) => {
  try {
    const reports = await getAllReports();
    res.json(reports);
  } catch (err) {
    console.error("Get reports error:", err);
    res.status(500).json({ message: err.message });
  }
});

// GET /api/report/workspace/:workspaceId - Get all reports in workspace
router.get("/workspace/:workspaceId", async (req, res) => {
  try {
    const reports = await getWorkspaceReports(req.params.workspaceId);
    res.json(reports);
  } catch (err) {
    console.error("Get workspace reports error:", err);
    res.status(500).json({ message: err.message });
  }
});

// GET /api/report/:id - Get report by ID
router.get("/:id", async (req, res) => {
  try {
    const report = await getReport(req.params.id);
    res.json(report);
  } catch (err) {
    console.error("Get report error:", err);
    res.status(500).json({ message: err.message });
  }
});

// DELETE /api/report/:id - Delete report
router.delete("/:id", async (req, res) => {
  try {
    const result = await deleteReport(req.params.id);
    res.json(result);
  } catch (err) {
    console.error("Delete report error:", err);
    res.status(500).json({ message: err.message });
  }
});

// POST /api/report/:id/export-pdf - Export report as PDF
router.post("/:id/export-pdf", async (req, res) => {
  try {
    const pdfBuffer = await exportReportPDF(req.params.id);

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="report-${Date.now()}.pdf"`
    );
    res.send(pdfBuffer);
  } catch (err) {
    console.error("Export PDF error:", err);
    res.status(500).json({ message: err.message });
  }
});

export default router;
