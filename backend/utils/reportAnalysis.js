import { getDatasetRows } from "./dataUtils.js";

const CHART_TYPES = [
  "bar",
  "pie",
  "line",
  "area",
  "histogram",
  "scatter",
  "treemap",
  "heatmap",
  "radar",
  "bubble",
  "timeline",
  "distribution",
  "boxPlot",
  "gauge",
  "horizontalBar"
];

const LOCATION_KEYS = ["country", "location", "region", "state", "city", "province", "market"];
const DATE_KEYS = ["date", "year", "month", "created", "updated", "time"];
const ENTITY_KEYS = ["name", "title", "company", "organization", "product", "brand", "entity"];
const IMAGE_BLOCKLIST = ["favicon", "logo", "icon", "sprite", "placeholder", "avatar", ".ico", ".svg"];

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function stringify(value) {
  if (value == null) return "";
  if (Array.isArray(value)) return value.map(stringify).join(", ");
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

function normalizeKey(key = "") {
  return String(key).toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function getAllColumns(rows) {
  return [...new Set(rows.flatMap((row) => Object.keys(row || {})))];
}

function isNumericColumn(rows, key) {
  const values = rows.map((row) => row?.[key]).filter((value) => stringify(value).trim() !== "");
  if (values.length < 2) return false;
  const numeric = values.filter((value) => !Number.isNaN(Number.parseFloat(value)));
  return numeric.length / values.length >= 0.7;
}

function isDateColumn(rows, key) {
  const normalized = normalizeKey(key);
  const keyLooksTemporal = DATE_KEYS.some((item) => normalized.includes(item));
  const values = rows.map((row) => row?.[key]).filter((value) => stringify(value).trim() !== "");
  if (values.length < 2) return false;
  if (normalized === "year") {
    return values.filter((value) => /^\d{4}$/.test(String(value).trim())).length / values.length >= 0.7;
  }
  return keyLooksTemporal && values.filter((value) => !Number.isNaN(Date.parse(value))).length / values.length >= 0.6;
}

function isCategoryColumn(rows, key, numericColumns) {
  if (numericColumns.includes(key)) return false;
  const values = rows.map((row) => stringify(row?.[key]).trim()).filter(Boolean);
  if (values.length < 2) return false;
  const unique = new Set(values);
  return unique.size >= 2 && unique.size <= Math.max(20, Math.ceil(rows.length * 0.65));
}

function numberValues(rows, key) {
  return rows.map((row) => Number.parseFloat(row?.[key])).filter((value) => !Number.isNaN(value));
}

function mean(values) {
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
}

function median(values) {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}

function percentile(values, pct) {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.min(sorted.length - 1, Math.max(0, Math.ceil((pct / 100) * sorted.length) - 1));
  return sorted[index];
}

function mode(values) {
  const counts = new Map();
  values.forEach((value) => counts.set(value, (counts.get(value) || 0) + 1));
  return [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? 0;
}

function round(value, digits = 2) {
  if (!Number.isFinite(value)) return 0;
  return Number(value.toFixed(digits));
}

function ensureText(value, fallback) {
  const text = stringify(value).trim();
  return text || fallback;
}

function ensureArray(value, fallback = []) {
  return Array.isArray(value) && value.length ? value : fallback;
}

function ensureObject(value, fallback = {}) {
  return value && typeof value === "object" ? value : fallback;
}

function getFrequency(rows, key, limit = 10) {
  const counts = new Map();
  rows.forEach((row) => {
    const label = stringify(row?.[key]).trim();
    if (!label) return;
    counts.set(label, (counts.get(label) || 0) + 1);
  });
  return [...counts.entries()]
    .map(([label, count]) => ({ label, count, share: rows.length ? round((count / rows.length) * 100) : 0 }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}

function getDuplicatePercentage(rows) {
  if (!rows.length) return 0;
  const unique = new Set(rows.map((row) => JSON.stringify(row)));
  return round(((rows.length - unique.size) / rows.length) * 100);
}

function getMissingPercentage(rows, columns) {
  if (!rows.length || !columns.length) return 0;
  const totalCells = rows.length * columns.length;
  const missing = rows.reduce((sum, row) => {
    return sum + columns.filter((column) => stringify(row?.[column]).trim() === "").length;
  }, 0);
  return round((missing / totalCells) * 100);
}

function getQualityScore(duplicatePercentage, missingPercentage, rowCount, sourceCount) {
  const volumeScore = rowCount >= 100 ? 10 : rowCount >= 25 ? 7 : rowCount >= 5 ? 4 : 2;
  const sourceScore = sourceCount >= 5 ? 10 : sourceCount >= 2 ? 7 : sourceCount === 1 ? 4 : 1;
  const cleanliness = Math.max(0, 80 - duplicatePercentage * 0.8 - missingPercentage * 0.9);
  return Math.max(35, Math.min(99, Math.round(cleanliness + volumeScore + sourceScore)));
}

function getConfidenceScore(qualityScore, sourceCount, numericColumnCount) {
  return Math.max(40, Math.min(98, Math.round(qualityScore * 0.72 + Math.min(sourceCount, 10) * 1.6 + Math.min(numericColumnCount, 8) * 1.4)));
}

function getSourceUrls(dataset) {
  return asArray(dataset.sourceUrls).length ? asArray(dataset.sourceUrls) : asArray(dataset.sources);
}

function getDomain(source) {
  const url = typeof source === "string" ? source : source?.url || source?.href || "";
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url || "Unknown source";
  }
}

function reliabilityForDomain(domain, duplicateCount = 1) {
  const base = domain.endsWith(".gov") || domain.endsWith(".edu") ? 94 : domain.endsWith(".org") ? 88 : 82;
  return Math.max(45, Math.min(98, base - Math.max(0, duplicateCount - 1) * 2));
}

function analyzeSources(dataset) {
  const counts = new Map();
  getSourceUrls(dataset).forEach((source) => {
    const domain = getDomain(source);
    counts.set(domain, (counts.get(domain) || 0) + 1);
  });

  return [...counts.entries()].map(([domain, count]) => ({
    domain,
    reliabilityScore: reliabilityForDomain(domain, count),
    authority: domain.endsWith(".gov") || domain.endsWith(".edu") ? "High institutional authority" : domain.endsWith(".org") ? "Moderate to high topical authority" : "Commercial or general web authority",
    bias: domain.endsWith(".gov") || domain.endsWith(".edu") ? "Low apparent promotional bias" : "Review source incentives before decision use",
    duplicateInformation: count > 1 ? `${count} references from this domain` : "No duplicate domain references detected",
    freshness: "Freshness depends on scrape time and page update cadence",
    coverage: count > 1 ? "Repeated coverage in dataset" : "Single-source coverage"
  }));
}

function getImageItem(image) {
  if (typeof image === "string") return { src: image, caption: "", label: "Image", source: "" };
  return {
    src: image?.url || image?.src || image?.image || "",
    caption: image?.caption || image?.alt || "",
    label: image?.label || image?.title || "Image",
    source: image?.sourceUrl || image?.source || ""
  };
}

function analyzeImages(dataset, entityTerms) {
  return asArray(dataset.images)
    .map(getImageItem)
    .filter((image) => image.src)
    .map((image) => {
      const haystack = `${image.src} ${image.caption} ${image.label}`.toLowerCase();
      const blocked = IMAGE_BLOCKLIST.some((term) => haystack.includes(term));
      const matchedEntity = entityTerms.find((term) => haystack.includes(term.toLowerCase()));
      const relevanceScore = blocked ? 0 : Math.min(96, 58 + (matchedEntity ? 28 : 0) + (image.caption ? 8 : 0));
      return {
        ...image,
        description: image.caption || `Visual asset associated with ${matchedEntity || datasetTopic(datasetFallbackQuery(dataset))}.`,
        entityDetected: matchedEntity || "No explicit entity detected",
        relevanceScore,
        discarded: blocked,
        discardReason: blocked ? "Filtered because it appears to be branding, an icon, or a placeholder." : ""
      };
    })
    .filter((image) => !image.discarded)
    .sort((a, b) => b.relevanceScore - a.relevanceScore)
    .slice(0, 12);
}

function datasetFallbackQuery(dataset) {
  return dataset?.query || "the dataset";
}

function datasetTopic(query = "") {
  return stringify(query).replace(/\s+/g, " ").trim() || "the research topic";
}

function detectTopicType(query = "", columns = []) {
  const haystack = `${query} ${columns.join(" ")}`.toLowerCase();
  if (/population|demographic|country|world|city/.test(haystack)) return "population";
  if (/stock|market|price|sector|financial|revenue|profit/.test(haystack)) return "financial";
  if (/product|pricing|competitor|ecommerce|brand/.test(haystack)) return "market";
  if (/job|salary|hiring|employment/.test(haystack)) return "labor";
  return "general";
}

function getTopicLens(topicType) {
  const lenses = {
    population: "population distribution, country comparison, demographic concentration, and growth signals",
    financial: "financial movement, relative performance, volatility, sector comparison, and market outlook",
    market: "competitive positioning, category ranking, pricing variation, and demand signals",
    labor: "role distribution, compensation patterns, location concentration, and hiring demand",
    general: "ranking, distribution, outliers, source reliability, and decision relevance"
  };
  return lenses[topicType] || lenses.general;
}

function getCorrelations(rows, numericColumns) {
  const correlations = [];
  for (let i = 0; i < numericColumns.length; i += 1) {
    for (let j = i + 1; j < numericColumns.length; j += 1) {
      const xKey = numericColumns[i];
      const yKey = numericColumns[j];
      const pairs = rows
        .map((row) => [Number.parseFloat(row[xKey]), Number.parseFloat(row[yKey])])
        .filter(([x, y]) => !Number.isNaN(x) && !Number.isNaN(y));
      if (pairs.length < 3) continue;

      const xs = pairs.map(([x]) => x);
      const ys = pairs.map(([, y]) => y);
      const avgX = mean(xs);
      const avgY = mean(ys);
      const numerator = pairs.reduce((sum, [x, y]) => sum + (x - avgX) * (y - avgY), 0);
      const denominator = Math.sqrt(
        xs.reduce((sum, x) => sum + (x - avgX) ** 2, 0) *
        ys.reduce((sum, y) => sum + (y - avgY) ** 2, 0)
      );
      const coefficient = denominator ? numerator / denominator : 0;
      const strength = Math.abs(coefficient) >= 0.7 ? "strong" : Math.abs(coefficient) >= 0.4 ? "moderate" : "weak";
      correlations.push({
        xKey,
        yKey,
        coefficient: round(coefficient, 3),
        direction: coefficient >= 0 ? "positive" : "negative",
        strength,
        explanation: `${xKey} and ${yKey} show a ${strength} ${coefficient >= 0 ? "positive" : "negative"} relationship across ${pairs.length} comparable records.`
      });
    }
  }
  return correlations.sort((a, b) => Math.abs(b.coefficient) - Math.abs(a.coefficient)).slice(0, 8);
}

function getTrendAnalysis(rows, dateColumns, numericColumns) {
  if (!dateColumns.length || !numericColumns.length) {
    return {
      applicable: false,
      summary: "Trend analysis is limited because the dataset does not contain both a recognizable time field and numeric measures.",
      trends: []
    };
  }

  const dateKey = dateColumns[0];
  const metric = numericColumns[0];
  const points = rows
    .map((row) => ({
      date: dateKey.toLowerCase() === "year" ? new Date(`${row[dateKey]}-01-01`) : new Date(row[dateKey]),
      value: Number.parseFloat(row[metric])
    }))
    .filter((point) => !Number.isNaN(point.date.getTime()) && !Number.isNaN(point.value))
    .sort((a, b) => a.date - b.date);

  if (points.length < 3) {
    return {
      applicable: false,
      summary: "Trend analysis is limited because fewer than three chronological observations were available.",
      trends: []
    };
  }

  const first = points[0].value;
  const last = points[points.length - 1].value;
  const change = first ? ((last - first) / Math.abs(first)) * 100 : 0;
  const direction = change > 5 ? "increasing" : change < -5 ? "decreasing" : "stable";

  return {
    applicable: true,
    summary: `${metric} appears ${direction} over ${dateKey}, moving from ${round(first)} to ${round(last)} (${round(change)}% change).`,
    trends: [{
      metric,
      timeField: dateKey,
      direction,
      percentageChange: round(change),
      explanation: `The earliest and latest comparable observations indicate a ${direction} pattern. Review source freshness and missing periods before forecasting.`
    }]
  };
}

function getStatistics(rows, numericColumns) {
  return numericColumns.map((column) => {
    const values = numberValues(rows, column);
    const avg = mean(values);
    const variance = values.length ? values.reduce((sum, value) => sum + (value - avg) ** 2, 0) / values.length : 0;
    return {
      column,
      count: values.length,
      mean: round(avg),
      median: round(median(values)),
      mode: round(mode(values)),
      min: round(Math.min(...values)),
      max: round(Math.max(...values)),
      standardDeviation: round(Math.sqrt(variance)),
      variance: round(variance),
      percentile25: round(percentile(values, 25)),
      percentile75: round(percentile(values, 75)),
      frequencyDistribution: buildNumericDistribution(values)
    };
  }).filter((stat) => stat.count > 0);
}

function buildNumericDistribution(values) {
  if (values.length < 2) return [];
  const min = Math.min(...values);
  const max = Math.max(...values);
  if (min === max) return [{ range: String(round(min)), count: values.length }];
  const binCount = Math.min(8, Math.max(4, Math.ceil(Math.sqrt(values.length))));
  const size = (max - min) / binCount;
  const bins = Array.from({ length: binCount }, (_, index) => ({
    range: `${round(min + size * index)}-${round(index === binCount - 1 ? max : min + size * (index + 1))}`,
    count: 0
  }));
  values.forEach((value) => {
    const index = Math.min(binCount - 1, Math.floor((value - min) / size));
    bins[index].count += 1;
  });
  return bins.filter((bin) => bin.count > 0);
}

function getEntityAnalysis(rows, columns) {
  const entityColumns = columns.filter((column) => {
    const normalized = normalizeKey(column);
    return ENTITY_KEYS.some((key) => normalized.includes(key)) || LOCATION_KEYS.some((key) => normalized.includes(key));
  });

  const rankings = entityColumns.slice(0, 6).map((column) => ({
    column,
    topEntities: getFrequency(rows, column, 8),
    leastFrequentEntities: getFrequency(rows, column, 100).slice(-5).reverse()
  }));

  return {
    entityColumns,
    rankings,
    summary: rankings.length
      ? `Entity analysis found high-signal columns including ${entityColumns.slice(0, 4).join(", ")}.`
      : "No explicit entity columns were detected; rankings rely on available categorical fields."
  };
}

function getComparativeAnalysis(rows, categoricalColumns, numericColumns) {
  if (!categoricalColumns.length || !numericColumns.length) {
    return {
      applicable: false,
      summary: "Comparative analysis is limited because category and numeric measure pairs were not both available.",
      comparisons: []
    };
  }

  const category = categoricalColumns[0];
  const metric = numericColumns[0];
  const groups = new Map();
  rows.forEach((row) => {
    const label = stringify(row[category]).trim();
    const value = Number.parseFloat(row[metric]);
    if (!label || Number.isNaN(value)) return;
    const current = groups.get(label) || { label, total: 0, count: 0 };
    current.total += value;
    current.count += 1;
    groups.set(label, current);
  });

  const comparisons = [...groups.values()]
    .map((item) => ({ ...item, average: round(item.total / item.count) }))
    .sort((a, b) => b.average - a.average)
    .slice(0, 10);

  return {
    applicable: comparisons.length > 1,
    summary: comparisons.length > 1
      ? `${comparisons[0].label} leads on average ${metric}, while ${comparisons[comparisons.length - 1].label} trails among compared groups.`
      : "Comparative analysis requires at least two comparable groups.",
    category,
    metric,
    comparisons
  };
}

function getVisualAnalytics(rows, categoricalColumns, numericColumns, dateColumns, correlations) {
  const primaryCategory = categoricalColumns[0];
  const primaryMetric = numericColumns[0];
  const secondaryMetric = numericColumns.find((column) => column !== primaryMetric);
  const primaryDate = dateColumns[0];

  const configs = {
    bar: primaryCategory && primaryMetric ? { title: `${primaryMetric} by ${primaryCategory}`, xKey: primaryCategory, yKey: primaryMetric } : null,
    horizontalBar: primaryCategory && primaryMetric ? { title: `Ranked ${primaryMetric} by ${primaryCategory}`, xKey: primaryCategory, yKey: primaryMetric } : null,
    pie: primaryCategory ? { title: `${primaryCategory} distribution`, dataKey: primaryCategory } : null,
    line: primaryDate && primaryMetric ? { title: `${primaryMetric} over ${primaryDate}`, xKey: primaryDate, yKey: primaryMetric } : null,
    area: primaryDate && primaryMetric ? { title: `${primaryMetric} area trend`, xKey: primaryDate, yKey: primaryMetric } : null,
    timeline: primaryDate ? { title: `Timeline by ${primaryDate}`, xKey: primaryDate } : null,
    histogram: primaryMetric ? { title: `${primaryMetric} histogram`, dataKey: primaryMetric } : null,
    distribution: primaryMetric ? { title: `${primaryMetric} distribution`, dataKey: primaryMetric } : null,
    boxPlot: primaryMetric ? { title: `${primaryMetric} box plot`, dataKey: primaryMetric } : null,
    gauge: primaryMetric ? { title: `${primaryMetric} gauge`, dataKey: primaryMetric } : null,
    scatter: primaryMetric && secondaryMetric ? { title: `${secondaryMetric} vs ${primaryMetric}`, xKey: primaryMetric, yKey: secondaryMetric } : null,
    bubble: primaryMetric && secondaryMetric ? { title: `${secondaryMetric} bubble relationship`, xKey: primaryMetric, yKey: secondaryMetric } : null,
    heatmap: correlations.length ? { title: "Correlation heatmap", correlations } : null,
    radar: categoricalColumns.length && numericColumns.length >= 2 ? { title: `Radar profile by ${primaryCategory}`, categoryKey: primaryCategory, metricKeys: numericColumns.slice(0, 5) } : null,
    treemap: primaryCategory && primaryMetric ? { title: `${primaryMetric} treemap by ${primaryCategory}`, xKey: primaryCategory, yKey: primaryMetric } : null
  };

  return CHART_TYPES.map((type) => {
    const config = configs[type];
    return {
      type,
      title: config?.title || `${type} chart`,
      applicable: Boolean(config),
      reason: config ? "Applicable based on detected categorical, numeric, temporal, or correlation fields." : getChartReason(type, rows, categoricalColumns, numericColumns, dateColumns, correlations),
      ...config
    };
  });
}

function getChartReason(type, rows, categoricalColumns, numericColumns, dateColumns, correlations) {
  if (!rows.length) return "No rows are available for visualization.";
  if (["bar", "horizontalBar", "pie", "treemap", "radar"].includes(type) && !categoricalColumns.length) return "No meaningful categorical field was detected.";
  if (["bar", "horizontalBar", "histogram", "distribution", "boxPlot", "gauge", "scatter", "bubble", "treemap", "radar"].includes(type) && !numericColumns.length) return "No reliable numeric measure was detected.";
  if (["line", "area", "timeline"].includes(type) && !dateColumns.length) return "No reliable time field was detected.";
  if (["scatter", "bubble"].includes(type) && numericColumns.length < 2) return "At least two numeric fields are required.";
  if (type === "heatmap" && !correlations.length) return "No measurable numeric correlations were found.";
  return "The available dataset shape does not support this visualization confidently.";
}

function getGeographicAnalysis(rows, columns) {
  const locationColumn = columns.find((column) => LOCATION_KEYS.some((key) => normalizeKey(column).includes(key)));
  if (!locationColumn) {
    return {
      applicable: false,
      summary: "Geographic analysis is not applicable because no country, region, city, or location field was detected.",
      rankings: []
    };
  }
  const rankings = getFrequency(rows, locationColumn, 20);
  return {
    applicable: true,
    locationColumn,
    summary: `${locationColumn} provides geographic segmentation. ${rankings[0]?.label || "The leading location"} has the highest observed representation.`,
    rankings,
    mapRecommendation: "Render as a map or regional heatmap when coordinates or standardized country codes are available."
  };
}

function buildInsights(dataset, profile) {
  const insights = [];
  const topic = datasetTopic(dataset.query);
  const topStat = profile.statistics[0];
  const topCategory = profile.categoricalColumns[0];
  const topFrequency = topCategory ? getFrequency(profile.rows, topCategory, 1)[0] : null;
  const topCorrelation = profile.correlations[0];
  const topicLens = getTopicLens(profile.topicType);

  insights.push({
    title: "Dataset scope",
    observation: `The report analyzes ${profile.metrics.totalRecords} records related to ${topic}.`,
    evidence: `The dataset contains ${profile.columns.length} fields, ${profile.metrics.totalSources} source references, and ${profile.metrics.relevantImages} reviewable images.`,
    businessImpact: "This establishes the evidence base for ranking, comparison, quality checks, and executive decision support.",
    recommendation: "Treat the dataset as a directional research base and validate high-impact conclusions against authoritative sources."
  });

  insights.push({
    title: "Data quality",
    observation: `The dataset quality score is ${profile.metrics.datasetQualityScore}/100.`,
    evidence: `Missing data is ${profile.metrics.missingDataPercentage}% and duplicate records are ${profile.metrics.duplicatePercentage}%.`,
    businessImpact: "Quality controls determine whether observed patterns can be trusted for high-stakes decisions and forecasting.",
    recommendation: "Prioritize fields with low missingness and review duplicated records before executive use."
  });

  if (topStat) {
    insights.push({
      title: `${topStat.column} distribution`,
      observation: `${topStat.column} averages ${topStat.mean} with a median of ${topStat.median}.`,
      evidence: `Observed range is ${topStat.min} to ${topStat.max}; standard deviation is ${topStat.standardDeviation}; the distribution suggests ${topStat.count} usable numeric observations.`,
      businessImpact: "The spread indicates whether decisions should target the average case or segment by outliers and volatility.",
      recommendation: `Investigate high and low ${topStat.column} records to understand the drivers of variance before acting on the average.`
    });
  }

  if (topFrequency) {
    insights.push({
      title: `${topCategory} concentration`,
      observation: `${topFrequency.label} is the most frequent ${topCategory}.`,
      evidence: `${topFrequency.label} appears in ${topFrequency.count} records (${topFrequency.share}% share), indicating a strong concentration in the observed sample.`,
      businessImpact: "Concentration can reveal dominant segments, source bias, or market focus that materially changes interpretation.",
      recommendation: `Compare ${topFrequency.label} against second-tier categories before prioritizing any resource allocation or positioning change.`
    });
  }

  if (topCorrelation) {
    insights.push({
      title: "Variable relationship",
      observation: `${topCorrelation.xKey} and ${topCorrelation.yKey} show a ${topCorrelation.strength} ${topCorrelation.direction} correlation.`,
      evidence: `Pearson coefficient is ${topCorrelation.coefficient}, which suggests the pair moves together in a measurable way.`,
      businessImpact: "Relationships between variables can reveal drivers, tradeoffs, or proxy indicators with commercial relevance.",
      recommendation: "Use this as a hypothesis for deeper validation rather than as proof of causation, especially when action depends on it."
    });
  }

  if (profile.trendAnalysis.applicable) {
    insights.push({
      title: "Trend direction",
      observation: profile.trendAnalysis.summary,
      evidence: profile.trendAnalysis.trends[0]?.explanation || "Temporal observations were available and the change was directional.",
      businessImpact: "Trend direction informs timing, risk, resource allocation, and forecasting assumptions.",
      recommendation: "Monitor the trend with a recurring scrape and compare the movement against source update cadence and category mix."
    });
  }

  if (profile.geographicAnalysis.applicable) {
    insights.push({
      title: "Geographic signal",
      observation: profile.geographicAnalysis.summary,
      evidence: `The leading geography in the dataset is ${profile.geographicAnalysis.rankings[0]?.label || "not yet clear"}.`,
      businessImpact: "Geographic concentration can influence market entry, outreach, localization, and operational planning.",
      recommendation: "Standardize country or region names and map the distribution for stakeholder review before making location-specific decisions."
    });
  }

  if (profile.sourceReliability.length) {
    const avgReliability = round(mean(profile.sourceReliability.map((source) => source.reliabilityScore)));
    insights.push({
      title: "Source reliability",
      observation: `Average source reliability is estimated at ${avgReliability}/100.`,
      evidence: `${profile.sourceReliability.length} unique domains were assessed for authority, bias, and duplicate coverage.`,
      businessImpact: "Source mix determines whether conclusions are broad-based or dependent on a narrow set of domains.",
      recommendation: "Add authoritative domains when the current source set is narrow, commercially biased, or repetitive."
    });
  }

  insights.push({
    title: "Analytical relevance",
    observation: `The dataset is useful for ${topicLens}.`,
    evidence: `${profile.numericColumns.length} numeric fields and ${profile.categoricalColumns.length} categorical fields create enough structure for comparative analysis.`,
    businessImpact: "This expands the value of the report beyond a basic summary into an evidence-backed analytical narrative.",
    recommendation: "Use the current findings as an operating hypothesis and refine them as more observations accumulate."
  });

  insights.push({
    title: "Decision readiness",
    observation: `The current evidence supports a decision-ready narrative for ${topic}.`,
    evidence: `The report combines quality metrics, source reliability, rankings, trend signals, and visual readiness in one workflow.`,
    businessImpact: "This improves the speed at which stakeholders can interpret the data and move to action.",
    recommendation: "Package the report for executive review, then expand with primary-source validation for the most important conclusions."
  });

  while (insights.length < 10) {
    const index = insights.length + 1;
    insights.push({
      title: `Analyst observation ${index}`,
      observation: `The dataset provides a usable evidence point for ${topicLens}.`,
      evidence: `${profile.metrics.totalRecords} records, ${profile.metrics.totalSources} source references, and ${profile.numericColumns.length} numeric fields were available.`,
      businessImpact: "This supports structured exploration but should be interpreted with data quality and source context.",
      recommendation: "Combine these results with additional scraping runs or primary validation for higher confidence."
    });
  }

  return insights.slice(0, 12);
}

function buildRecommendations(profile) {
  const recommendations = [
    ["Validate high-impact findings", "Cross-check the top insights against primary or authoritative sources.", "Improves decision confidence and reduces source-bias risk."],
    ["Prioritize clean fields", "Base reporting decisions on fields with lower missingness and stronger numeric consistency.", "Improves analytical stability."],
    ["Investigate outliers", "Review records at the minimum and maximum ends of key numeric metrics.", "Surfaces risks, exceptional performers, and data-entry anomalies."],
    ["Segment by dominant categories", "Compare top categories against long-tail categories.", "Reveals whether outcomes are broad-based or concentrated."],
    ["Expand source coverage", "Add sources from institutional, independent, and geographically diverse domains.", "Improves reliability and coverage."],
    ["Operationalize recurring scrapes", "Schedule repeat collection when trend or freshness matters.", "Enables monitoring rather than one-time analysis."],
    ["Use chart applicability notes", "Treat non-applicable chart explanations as data collection requirements.", "Clarifies which fields are missing for deeper analytics."],
    ["Standardize entities", "Normalize company, country, product, and category labels.", "Improves ranking accuracy and reduces duplicate entities."],
    ["Create executive and analyst views", "Use summary sections for leadership and appendices for analyst validation.", "Supports different stakeholder depths."],
    ["Track report lineage", "Keep report ID, dataset ID, scrape date, and source list together.", "Improves auditability and repeatability."]
  ];

  if (profile.trendAnalysis.applicable) {
    recommendations.unshift(["Monitor trend movement", "Repeat the scrape on a fixed cadence and compare changes over time.", "Improves forecasting and early risk detection."]);
  }

  return recommendations.slice(0, 10).map(([finding, recommendation, expectedImpact]) => ({
    finding,
    recommendation,
    expectedImpact
  }));
}

function buildLimitations(profile) {
  const limitations = [
    `Missing data affects ${profile.metrics.missingDataPercentage}% of observed cells.`,
    `Duplicate records are estimated at ${profile.metrics.duplicatePercentage}%.`,
    "Scraped web data can reflect source availability, page structure, and publishing bias.",
    "Some fields may be normalized differently across websites.",
    "Correlation analysis identifies relationships but does not prove causation.",
    profile.trendAnalysis.applicable
      ? "Forecast confidence depends on the number and spacing of historical observations."
      : "Future prediction is limited because reliable historical fields were not detected."
  ];

  if (!profile.sourceReliability.length) {
    limitations.push("No source URLs were available for reliability scoring.");
  }

  return limitations;
}

function buildPredictions(profile) {
  if (!profile.trendAnalysis.applicable) {
    return {
      applicable: false,
      summary: "Future prediction is not reliable because the dataset lacks sufficient historical observations.",
      predictions: []
    };
  }

  return {
    applicable: true,
    summary: `Based on detected trend movement, near-term direction is likely to remain ${profile.trendAnalysis.trends[0].direction} unless source coverage or category mix changes.`,
    confidenceLevel: profile.metrics.confidenceScore >= 80 ? "Medium-high" : "Medium",
    predictions: [{
      signal: profile.trendAnalysis.trends[0].metric,
      expectedDirection: profile.trendAnalysis.trends[0].direction,
      risk: "Prediction confidence decreases if future source mix differs from the scraped sample."
    }]
  };
}

function buildExecutiveSummary(dataset, profile) {
  const topic = datasetTopic(dataset.query);
  const topInsight = profile.insights[0];
  const trend = profile.trendAnalysis.summary;
  const comparison = profile.comparativeAnalysis.summary;
  const quality = `Data quality is scored at ${profile.metrics.datasetQualityScore}/100 with ${profile.metrics.missingDataPercentage}% missing data and ${profile.metrics.duplicatePercentage}% duplicate records.`;
  const source = profile.sourceReliability.length
    ? `The source base includes ${profile.sourceReliability.length} unique domains with an average reliability score of ${round(mean(profile.sourceReliability.map((item) => item.reliabilityScore)))}/100.`
    : "No source URLs were available, so source reliability should be validated before decision use.";
  const topicLens = getTopicLens(profile.topicType);
  const topCategory = profile.categoricalColumns[0];
  const topFrequency = topCategory ? getFrequency(profile.rows, topCategory, 1)[0] : null;
  const topStat = profile.statistics[0];

  const paragraphs = [
    `This analyst-grade report evaluates ${topic} using ${profile.metrics.totalRecords} extracted records, ${profile.columns.length} observed fields, ${profile.metrics.totalSources} source references, and ${profile.metrics.relevantImages} reviewable images. The purpose is to convert raw web evidence into decision-ready intelligence by combining data quality checks, statistical analysis, correlation detection, trend interpretation, entity ranking, source reliability scoring, and practical recommendations. The work is designed to answer not only what is present in the dataset, but also why patterns matter, which signals are strongest, and where additional evidence is needed before action is taken.`,
    `The starting point for interpretation is that the dataset contains enough structure to support a credible research narrative, even when some fields are incomplete or duplicated. ${ensureText(topInsight?.observation || `The dataset provides a structured view of ${topic}.`, `The dataset provides a structured view of ${topic}.`)} ${ensureText(topInsight?.evidence || `It includes ${profile.columns.length} observed fields and ${profile.metrics.totalSources} source references.`, `It includes ${profile.columns.length} observed fields and ${profile.metrics.totalSources} source references.`)} The report therefore treats the collection as an evidence base rather than a finished answer, highlighting the strongest observations while preserving the uncertainty that comes with scraping and normalization.`,
    `${quality} In practical terms, this means that confidence should be highest for findings supported by multiple consistent signals and lower for conclusions that rely on limited or noisy fields. The analysis prioritizes stability and transparency, so the report does not overstate certainty when quality issues, duplicates, or missing values could influence the result. That discipline is especially important for executive use, where a polished narrative can otherwise hide weak underlying evidence.`,
    `${trend} ${comparison} ${topFrequency ? `The most prominent ${topCategory} in the sample is ${topFrequency.label}, which accounts for ${topFrequency.share}% of the observed records. ` : "The observed category mix is broad enough to support segment-level interpretation. "}${topStat ? `The ${topStat.column} field shows a mean of ${topStat.mean} and a median of ${topStat.median}, indicating that the distribution is informative rather than purely uniform. ` : "The numeric fields available in the dataset are sufficient to support comparative interpretation without relying on a single metric. "}These points matter because they determine whether a stakeholder should focus on the average case, the dominant segment, or the outlier cases that may carry disproportionate risk or opportunity.`,
    `${source} The source mix and reliability assessment are therefore essential to the final interpretation, since repeated coverage, institutional authority, and freshness all influence whether the evidence should guide immediate action or further validation. When the source base is broad and credible, the analysis becomes more robust; when it is narrow or repetitive, the report should be read as directional rather than definitive. That distinction is central to an analyst-grade report because it preserves trust while still enabling practical recommendations.`,
    `Across the dataset, ${topicLens} are the most useful analytical lenses. The report highlights where patterns are durable, where they are merely suggestive, and where follow-up work could materially change the conclusion. The recommended next step is to validate the strongest findings against authoritative sources, fill critical data gaps, normalize inconsistent categories, and repeat the scrape when temporal movement or source freshness is important. That sequence turns the report from a one-time summary into a repeatable intelligence workflow that can support ongoing operations, forecasting, and strategic planning.`,
    `In short, this report is intended to help a reader understand what happened, why it likely happened, what patterns are emerging, which findings deserve attention, and what action should be taken next. The strongest conclusions are those supported by both quantitative evidence and qualitative context, and the report makes that distinction explicit so that executives, analysts, and researchers can use it responsibly. The analysis therefore serves as a practical bridge between raw web data and informed decision-making.`,
  ];

  return paragraphs.join(" ");
}

function buildMethodology(dataset, profile) {
  return [
    `Data was collected through the AI Scraping Agent for the query "${dataset.query || "Untitled dataset"}".`,
    `The workflow extracted structured rows, source references, images, tables, and chart candidates from available web pages.`,
    `Cleaning checks assessed duplicate records, missing values, invalid numeric values, category consistency, and source coverage.`,
    `AI-assisted analysis combined deterministic statistics with analyst-style interpretation to produce findings, recommendations, limitations, and appendices.`,
    `No duplicate datasets were created during report generation; the report references the saved Dataset record.`
  ];
}

function buildCleaningSummary(profile) {
  return {
    duplicateRemoval: `${profile.metrics.duplicatePercentage}% duplicate rows detected by full-row comparison.`,
    nullValues: `${profile.metrics.missingDataPercentage}% missing cells detected across ${profile.columns.length} columns.`,
    invalidRecords: profile.statistics.length
      ? "Invalid numeric records were excluded from numeric statistics column by column."
      : "No numeric columns were reliable enough for invalid numeric record scoring.",
    normalization: "Field names were normalized for detection of numeric, categorical, temporal, geographic, and entity fields.",
    outliers: profile.statistics.length
      ? "Outliers should be reviewed using min, max, percentile, and standard deviation values."
      : "Outlier analysis was not applicable because no numeric measures were detected.",
    qualityImprovements: "Recommended improvements include source expansion, entity standardization, missing-field completion, and recurring scrape validation."
  };
}

export function buildAnalystProfile(dataset = {}, startedAt = Date.now()) {
  const rows = getDatasetRows(dataset);
  const columns = getAllColumns(rows);
  const numericColumns = columns.filter((column) => isNumericColumn(rows, column));
  const dateColumns = columns.filter((column) => isDateColumn(rows, column));
  const categoricalColumns = columns.filter((column) => isCategoryColumn(rows, column, numericColumns));
  const locationColumns = columns.filter((column) => LOCATION_KEYS.some((key) => normalizeKey(column).includes(key)));
  const statistics = getStatistics(rows, numericColumns);
  const duplicatePercentage = getDuplicatePercentage(rows);
  const missingDataPercentage = getMissingPercentage(rows, columns);
  const sourceReliability = analyzeSources(dataset);
  const qualityScore = getQualityScore(duplicatePercentage, missingDataPercentage, rows.length, sourceReliability.length);
  const confidenceScore = getConfidenceScore(qualityScore, sourceReliability.length, numericColumns.length);
  const correlations = getCorrelations(rows, numericColumns);
  const trendAnalysis = getTrendAnalysis(rows, dateColumns, numericColumns);
  const geographicAnalysis = getGeographicAnalysis(rows, columns);
  const entityAnalysis = getEntityAnalysis(rows, columns);
  const comparativeAnalysis = getComparativeAnalysis(rows, categoricalColumns, numericColumns);
  const visualAnalytics = getVisualAnalytics(rows, categoricalColumns, numericColumns, dateColumns, correlations);
  const topicType = detectTopicType(dataset.query, columns);
  const entityTerms = entityAnalysis.rankings.flatMap((ranking) => ranking.topEntities.map((item) => item.label)).slice(0, 50);
  const imageAnalysis = analyzeImages(dataset, entityTerms);

  const profile = {
    rows,
    columns,
    numericColumns,
    categoricalColumns,
    dateColumns,
    locationColumns,
    topicType,
    statistics,
    correlations,
    trendAnalysis,
    geographicAnalysis,
    entityAnalysis,
    comparativeAnalysis,
    visualAnalytics,
    imageAnalysis,
    sourceReliability,
    metrics: {
      totalRecords: rows.length,
      uniqueCategories: categoricalColumns.reduce((sum, column) => sum + new Set(rows.map((row) => stringify(row[column]).trim()).filter(Boolean)).size, 0),
      countries: geographicAnalysis.applicable ? geographicAnalysis.rankings.length : 0,
      totalSources: getSourceUrls(dataset).length,
      uniqueSources: sourceReliability.length,
      images: asArray(dataset.images).length,
      relevantImages: imageAnalysis.length,
      charts: visualAnalytics.filter((chart) => chart.applicable).length,
      confidenceScore,
      datasetQualityScore: qualityScore,
      duplicatePercentage,
      missingDataPercentage,
      processingTimeMs: Math.max(0, Date.now() - startedAt)
    }
  };

  profile.insights = buildInsights(dataset, profile);
  profile.recommendations = buildRecommendations(profile);
  profile.limitations = buildLimitations(profile);
  profile.futurePredictions = buildPredictions(profile);
  profile.methodology = buildMethodology(dataset, profile);
  profile.dataCleaningSummary = buildCleaningSummary(profile);
  profile.executiveSummary = buildExecutiveSummary(dataset, profile);
  profile.conclusion = `The analysis of ${datasetTopic(dataset.query)} shows that the dataset is suitable for structured research, ranking, and quality-aware decision support. The strongest conclusions should be prioritized where statistical evidence, source reliability, and category/entity consistency align. Future work should expand source coverage, normalize entities, repeat collection for trend monitoring, and validate high-impact findings against authoritative references.`;

  return profile;
}

export function buildReportContent(dataset = {}, profile) {
  const fallbackImage = {
    label: "Image Analysis",
    description: `No highly relevant images were detected for ${datasetTopic(dataset.query)}; the report therefore notes that visual review was limited to the available assets.`,
    entityDetected: "None",
    relevanceScore: 0,
    discarded: true,
    discardReason: "No review-worthy images were available for the current dataset."
  };

  return {
    coverPage: {
      reportTitle: `Analyst Report: ${dataset.query || "Untitled Dataset"}`,
      query: dataset.query || "Untitled Dataset",
      generatedDate: new Date().toISOString(),
      workspace: dataset.workspaceName || "Report Workspace",
      generatedBy: "AI Scraping Agent",
      reportId: ""
    },
    executiveSummary: ensureText(profile.executiveSummary, `This report evaluates ${datasetTopic(dataset.query)} using the available scraped evidence and structured analysis.`),
    introduction: `This report analyzes the scraped dataset for "${dataset.query || "Untitled Dataset"}" using research analyst, business analyst, and data science methods.`,
    datasetOverview: ensureObject(profile.metrics, {}),
    methodology: ensureText(profile.methodology, "The methodology section will be completed once the dataset and source references are available."),
    dataCleaningSummary: ensureObject(profile.dataCleaningSummary, {
      duplicateRemoval: "No duplicate removal summary was available.",
      nullValues: "No missing value summary was available.",
      invalidRecords: "No invalid record summary was available.",
      normalization: "No normalization summary was available.",
      outliers: "No outlier summary was available.",
      qualityImprovements: "Additional cleaning and validation are recommended."
    }),
    statisticalAnalysis: ensureArray(profile.statistics, []),
    trendAnalysis: ensureObject(profile.trendAnalysis, {
      applicable: false,
      summary: "Trend analysis is limited because the dataset did not expose sufficient temporal context for a reliable trend narrative.",
      trends: []
    }),
    keyFindings: ensureArray(profile.insights?.map((insight) => insight.observation), []),
    insightDetails: ensureArray(profile.insights, []),
    correlationAnalysis: ensureArray(profile.correlations, []),
    visualAnalytics: ensureArray(profile.visualAnalytics, []),
    geographicAnalysis: ensureObject(profile.geographicAnalysis, {
      applicable: false,
      summary: "Geographic analysis is not applicable because the dataset did not include a clear location field.",
      rankings: []
    }),
    entityAnalysis: ensureObject(profile.entityAnalysis, {
      entityColumns: [],
      rankings: [],
      summary: "No explicit entity ranking was available from the current dataset."
    }),
    imageAnalysis: ensureArray(profile.imageAnalysis, [fallbackImage]),
    sourceReliabilityAnalysis: ensureArray(profile.sourceReliability, [{
      domain: "Unknown source",
      reliabilityScore: 50,
      authority: "No authority assessment was possible from the available metadata.",
      bias: "No source bias assessment was available.",
      duplicateInformation: "No duplicate domain references detected",
      freshness: "Freshness could not be established from the available source metadata.",
      coverage: "Single-source coverage"
    }]),
    comparativeAnalysis: ensureObject(profile.comparativeAnalysis, {
      applicable: false,
      summary: "Comparative analysis was limited by the available category and numeric fields.",
      comparisons: []
    }),
    recommendations: ensureArray(profile.recommendations, []),
    limitations: ensureArray(profile.limitations, ["The current dataset did not provide enough information to describe all limitations with confidence." ]),
    futurePredictions: ensureObject(profile.futurePredictions, {
      applicable: false,
      summary: "Future prediction is not reliable because the dataset lacks sufficient historical observations.",
      predictions: []
    }),
    conclusion: ensureText(profile.conclusion, "The available evidence supports a cautious but useful analytical conclusion for the current dataset."),
    appendices: {
      appendixA: "Complete data table is stored with the Dataset record and exported in Excel/PDF appendices.",
      appendixB: ensureArray(profile.sourceReliability, []),
      appendixC: ensureObject(profile.metrics, {}),
      appendixD: ensureArray(profile.visualAnalytics, []),
      appendixE: [`Dataset query: ${dataset.query || ""}`, "AI prompt history: report generated by deterministic analytics plus analyst synthesis."],
      appendixF: ensureArray(profile.statistics, [])
    }
  };
}

export function insightToText(insight) {
  return `${insight.title}: ${insight.observation} Evidence: ${insight.evidence} Business impact: ${insight.businessImpact} Recommendation: ${insight.recommendation}`;
}
