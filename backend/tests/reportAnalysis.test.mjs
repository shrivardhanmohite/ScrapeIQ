import test from "node:test";
import assert from "node:assert/strict";
import { buildAnalystProfile, buildReportContent } from "../utils/reportAnalysis.js";

const sampleDataset = {
  query: "Global renewable energy adoption",
  workspaceName: "Analyst Workspace",
  data: [
    { country: "United States", year: 2020, capacity: 120, sector: "Solar", value: 80 },
    { country: "Germany", year: 2021, capacity: 95, sector: "Wind", value: 72 },
    { country: "India", year: 2022, capacity: 110, sector: "Solar", value: 67 },
    { country: "Japan", year: 2023, capacity: 88, sector: "Hydro", value: 58 },
    { country: "Brazil", year: 2024, capacity: 132, sector: "Wind", value: 84 },
    { country: "Canada", year: 2025, capacity: 101, sector: "Solar", value: 76 },
  ],
  sourceUrls: ["https://example.gov/renewables", "https://example.org/renewables"],
  images: [
    { url: "https://example.com/image1.jpg", caption: "Solar farm", title: "Solar farm" },
    { url: "https://example.com/image2.jpg", caption: "Wind turbines", title: "Wind turbines" }
  ]
};

function hasMeaningfulContent(value) {
  if (typeof value === "string") return value.trim().length > 0;
  if (Array.isArray(value)) return value.filter(Boolean).length > 0;
  if (value && typeof value === "object") return Object.keys(value).length > 0;
  return false;
}

test("buildReportContent creates detailed analyst-grade sections", () => {
  const profile = buildAnalystProfile(sampleDataset, Date.now());
  const content = buildReportContent(sampleDataset, profile);

  assert.ok(content.executiveSummary.length > 600, "Executive summary should be detailed");
  assert.ok(content.insightDetails.length >= 10, "At least 10 insights should be generated");

  const requiredSections = [
    "executiveSummary",
    "datasetOverview",
    "methodology",
    "dataCleaningSummary",
    "statisticalAnalysis",
    "trendAnalysis",
    "correlationAnalysis",
    "visualAnalytics",
    "geographicAnalysis",
    "entityAnalysis",
    "imageAnalysis",
    "sourceReliabilityAnalysis",
    "comparativeAnalysis",
    "recommendations",
    "limitations",
    "futurePredictions",
    "conclusion",
    "appendices"
  ];

  requiredSections.forEach((section) => {
    assert.ok(hasMeaningfulContent(content[section]), `${section} should not be empty`);
  });
});
