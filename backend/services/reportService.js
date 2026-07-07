import Report, { normalizeChartSnapshots } from "../models/Report.js";
import Dataset from "../models/Dataset.js";
import Workspace from "../models/Workspace.js";
import {
  ResearchAgent,
  AnalysisAgent,
  VisualizationAgent,
  InsightAgent,
  ReportAgent,
} from "../agents/reportAgents.js";
import { generateReportPDF } from "../utils/reportGenerator.js";

export async function generateReport(workspaceId, datasetId) {
  const startTime = Date.now();
  
  try {
    // Fetch dataset
    const dataset = await Dataset.findById(datasetId);
    if (!dataset) {
      throw new Error("Dataset not found");
    }

    let resolvedWorkspaceId = workspaceId || dataset.workspaceId;

    if (!resolvedWorkspaceId) {
      const fallbackWorkspace = await Workspace.findOneAndUpdate(
        { name: "Report Workspace" },
        {
          $setOnInsert: {
            name: "Report Workspace",
            description: "Auto-created for legacy datasets without a workspace."
          }
        },
        { new: true, upsert: true }
      );

      resolvedWorkspaceId = fallbackWorkspace._id;
      dataset.workspaceId = resolvedWorkspaceId;
      dataset.workspaceName = fallbackWorkspace.name;
      await dataset.save();
    }

    // Create report record
    let report = new Report({
      workspaceId: resolvedWorkspaceId,
      datasetId,
      title: `Report: ${dataset.query}`,
      query: dataset.query,
      status: "generating",
      metadata: {
        rowCount: dataset.data?.length || 0,
        sourceCount: dataset.sourceUrls?.length || dataset.sources?.length || 0,
        imageCount: dataset.images?.length || 0,
        chartCount: dataset.charts?.length || 0,
      },
    });
    await report.save();

    // Execute agents sequentially
    const agentResults = {
      research: null,
      analysis: null,
      visualization: null,
      insight: null,
      report: null,
    };

    try {
      // 1. Research Agent
      console.log("Starting Research Agent...");
      agentResults.research = await ResearchAgent(dataset);
      if (agentResults.research.status === "failed") {
        throw new Error(agentResults.research.error);
      }

      // 2. Analysis Agent
      console.log("Starting Analysis Agent...");
      agentResults.analysis = await AnalysisAgent(dataset);
      if (agentResults.analysis.status === "failed") {
        throw new Error(agentResults.analysis.error);
      }

      // 3. Visualization Agent
      console.log("Starting Visualization Agent...");
      agentResults.visualization = await VisualizationAgent(dataset);
      if (agentResults.visualization.status === "failed") {
        throw new Error(agentResults.visualization.error);
      }

      // 4. Insight Agent
      console.log("Starting Insight Agent...");
      agentResults.insight = await InsightAgent(dataset);
      if (agentResults.insight.status === "failed") {
        throw new Error(agentResults.insight.error);
      }

      // 5. Report Agent
      console.log("Starting Report Agent...");
      agentResults.report = await ReportAgent(
        dataset,
        agentResults.analysis,
        agentResults.insight
      );
      if (agentResults.report.status === "failed") {
        throw new Error(agentResults.report.error);
      }

      // Update report with generated content
      report.reportContent = agentResults.report.data.reportContent;
      report.generatedInsights = agentResults.insight.data.insights;
      report.chartSnapshots = normalizeChartSnapshots(
        agentResults.visualization?.data?.chartSnapshots || []
      );
      report.analystProfile = agentResults.report.data.analystProfile;
      report.status = "completed";
      report.metadata.generatedAt = new Date();
      report.metadata.generationDuration = Date.now() - startTime;
      report.metadata.rowCount = agentResults.analysis.data.totalRows;
      report.metadata.sourceCount = agentResults.report.data.analystProfile.metrics.totalSources;
      report.metadata.imageCount = agentResults.report.data.analystProfile.metrics.images;
      report.metadata.chartCount = agentResults.report.data.analystProfile.metrics.charts;
      report.metadata.confidenceScore = agentResults.report.data.analystProfile.metrics.confidenceScore;
      report.metadata.datasetQualityScore = agentResults.report.data.analystProfile.metrics.datasetQualityScore;
      report.metadata.duplicatePercentage = agentResults.report.data.analystProfile.metrics.duplicatePercentage;
      report.metadata.missingDataPercentage = agentResults.report.data.analystProfile.metrics.missingDataPercentage;
      report.reportContent.coverPage.reportId = String(report._id);

      await report.save();

      return {
        success: true,
        reportId: report._id,
        report,
        agentProgress: {
          research: agentResults.research.status,
          analysis: agentResults.analysis.status,
          visualization: agentResults.visualization.status,
          insight: agentResults.insight.status,
          report: agentResults.report.status,
        },
      };
    } catch (agentErr) {
      report.status = "failed";
      report.error = agentErr.message;
      await report.save();

      return {
        success: false,
        error: agentErr.message,
        reportId: report._id,
      };
    }
  } catch (err) {
    console.error("Report generation error:", err);
    return {
      success: false,
      error: err.message,
    };
  }
}

export async function getReport(reportId) {
  try {
    const report = await Report.findById(reportId)
      .populate("datasetId")
      .populate("workspaceId");
    
    if (!report) {
      throw new Error("Report not found");
    }

    return report;
  } catch (err) {
    console.error("Get report error:", err);
    throw err;
  }
}

export async function getWorkspaceReports(workspaceId) {
  try {
    const reports = await Report.find({ workspaceId })
      .populate("datasetId")
      .sort({ createdAt: -1 });

    return reports;
  } catch (err) {
    console.error("Get workspace reports error:", err);
    throw err;
  }
}

export async function getAllReports() {
  try {
    const reports = await Report.find({})
      .populate("datasetId")
      .populate("workspaceId")
      .sort({ createdAt: -1 });

    return reports;
  } catch (err) {
    console.error("Get reports error:", err);
    throw err;
  }
}

export async function deleteReport(reportId) {
  try {
    const result = await Report.findByIdAndDelete(reportId);
    return { success: !!result };
  } catch (err) {
    console.error("Delete report error:", err);
    throw err;
  }
}

export async function exportReportPDF(reportId) {
  try {
    const report = await Report.findById(reportId).populate("datasetId");
    
    if (!report) {
      throw new Error("Report not found");
    }

    const pdfBuffer = await generateReportPDF(report, report.datasetId);
    report.metadata = {
      ...(report.metadata || {}),
      exportedAt: new Date()
    };
    await report.save();
    return pdfBuffer;
  } catch (err) {
    console.error("Export PDF error:", err);
    throw err;
  }
}
