import {
  buildAnalystProfile,
  buildReportContent,
  insightToText
} from "../utils/reportAnalysis.js";

const profileCache = new Map();

function getDatasetId(dataset = {}) {
  return String(dataset._id || dataset.id || dataset.query || "dataset");
}

function getProfile(dataset) {
  const key = getDatasetId(dataset);
  if (!profileCache.has(key)) {
    profileCache.set(key, buildAnalystProfile(dataset));
  }
  return profileCache.get(key);
}

export async function ResearchAgent(dataset) {
  console.log("Research Agent: Starting...");

  try {
    const profile = getProfile(dataset);

    return {
      status: "completed",
      data: {
        query: dataset.query || "Untitled dataset",
        dataQuality: profile.metrics,
        methodology: profile.methodology,
        sourceReliability: profile.sourceReliability,
        limitations: profile.limitations
      }
    };
  } catch (err) {
    console.error("Research Agent Error:", err);
    return { status: "failed", error: err.message };
  }
}

export async function AnalysisAgent(dataset) {
  console.log("Analysis Agent: Starting...");

  try {
    const profile = getProfile(dataset);

    return {
      status: "completed",
      data: {
        totalRows: profile.metrics.totalRecords,
        columns: profile.columns,
        numericFields: profile.numericColumns,
        categoricalFields: profile.categoricalColumns,
        dateFields: profile.dateColumns,
        locationFields: profile.locationColumns,
        statistics: profile.statistics,
        correlationAnalysis: profile.correlations,
        trendAnalysis: profile.trendAnalysis,
        comparativeAnalysis: profile.comparativeAnalysis,
        dataCleaningSummary: profile.dataCleaningSummary,
        duplicatePercentage: profile.metrics.duplicatePercentage,
        missingDataPercentage: profile.metrics.missingDataPercentage,
        datasetQualityScore: profile.metrics.datasetQualityScore,
        confidenceScore: profile.metrics.confidenceScore
      }
    };
  } catch (err) {
    console.error("Analysis Agent Error:", err);
    return { status: "failed", error: err.message };
  }
}

export async function VisualizationAgent(dataset) {
  console.log("Visualization Agent: Starting...");

  try {
    const profile = getProfile(dataset);
    const chartSnapshots = profile.visualAnalytics.map((chart) => ({
      title: chart.title,
      type: chart.type,
      description: chart.applicable
        ? `${chart.type} visualization is applicable: ${chart.reason}`
        : `${chart.type} visualization not generated: ${chart.reason}`,
      applicable: chart.applicable,
      reason: chart.reason,
      xKey: chart.xKey,
      yKey: chart.yKey,
      dataKey: chart.dataKey
    }));

    return {
      status: "completed",
      data: {
        chartCount: chartSnapshots.filter((chart) => chart.applicable).length,
        chartSnapshots,
        visualization: "ready",
        imageAnalysis: profile.imageAnalysis,
        geographicAnalysis: profile.geographicAnalysis
      }
    };
  } catch (err) {
    console.error("Visualization Agent Error:", err);
    return { status: "failed", error: err.message };
  }
}

export async function InsightAgent(dataset) {
  console.log("Insight Agent: Starting...");

  try {
    const profile = getProfile(dataset);

    return {
      status: "completed",
      data: {
        insights: profile.insights.map(insightToText),
        insightDetails: profile.insights,
        recommendations: profile.recommendations,
        findingCount: profile.insights.length
      }
    };
  } catch (err) {
    console.error("Insight Agent Error:", err);
    return { status: "failed", error: err.message };
  }
}

export async function ReportAgent(dataset, analysis, insights) {
  console.log("Report Agent: Starting...");

  try {
    const profile = getProfile(dataset);
    const reportContent = buildReportContent(dataset, profile);

    reportContent.keyFindings = insights?.data?.insightDetails?.map((insight) => insight.observation) || reportContent.keyFindings;
    reportContent.insightDetails = insights?.data?.insightDetails || reportContent.insightDetails;
    reportContent.recommendations = insights?.data?.recommendations || reportContent.recommendations;
    reportContent.statisticalAnalysis = analysis?.data?.statistics || reportContent.statisticalAnalysis;
    reportContent.correlationAnalysis = analysis?.data?.correlationAnalysis || reportContent.correlationAnalysis;
    reportContent.trendAnalysis = analysis?.data?.trendAnalysis || reportContent.trendAnalysis;

    return {
      status: "completed",
      data: {
        reportContent,
        analystProfile: profile,
        timestamp: new Date().toISOString()
      }
    };
  } catch (err) {
    console.error("Report Agent Error:", err);
    return { status: "failed", error: err.message };
  } finally {
    profileCache.delete(getDatasetId(dataset));
  }
}
