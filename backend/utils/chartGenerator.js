const BLOCKED_DIMENSIONS = new Set([
  "name",
  "title",
  "description",
  "summary"
]);

const PREFERRED_CATEGORY_KEYS = [
  "category",
  "genre",
  "type",
  "industry",
  "country",
  "status",
  "region",
  "segment",
  "market",
  "department",
  "platform",
  "rating"
];
const PREFERRED_DATE_KEYS = ["createdat", "created", "updatedat", "updated", "year", "month", "date"];

function normalizeKey(key = "") {
  return String(key)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function isBlockedDimension(key = "") {
  const normalized = normalizeKey(key);
  if (!normalized) return true;

  const parts = normalized.split(/\s+/);
  return (
    parts.some((part) => BLOCKED_DIMENSIONS.has(part)) ||
    normalized.includes("url") ||
    normalized.includes("image") ||
    normalized.includes("source") ||
    normalized.includes("link")
  );
}

function isNumericColumn(rows, key) {
  const values = rows
    .map((row) => row?.[key])
    .filter((value) => value !== undefined && value !== null && String(value).trim() !== "");

  if (values.length < 2) return false;

  const numericCount = values.filter((value) => !Number.isNaN(Number.parseFloat(value))).length;
  return numericCount / values.length >= 0.7;
}

function isDateColumn(rows, key) {
  const normalized = normalizeKey(key).replace(/\s+/g, "");
  const keyLooksDate = PREFERRED_DATE_KEYS.some((dateKey) => normalized.includes(dateKey));
  const values = rows
    .map((row) => row?.[key])
    .filter((value) => value !== undefined && value !== null && String(value).trim() !== "");

  if (values.length < 2) return false;

  if (normalized === "year") {
    return values.filter((value) => /^\d{4}$/.test(String(value).trim())).length / values.length >= 0.7;
  }

  const dateCount = values.filter((value) => !Number.isNaN(Date.parse(value))).length;
  return keyLooksDate && dateCount / values.length >= 0.6;
}

function getCategoryStats(rows, key) {
  const counts = new Map();

  rows.forEach((row) => {
    const value = row?.[key];
    const label = String(value ?? "").trim();
    if (!label || label.length > 48 || /^https?:\/\//i.test(label)) return;
    counts.set(label, (counts.get(label) || 0) + 1);
  });

  const uniqueCount = counts.size;
  const repeatedCount = [...counts.values()].filter((count) => count > 1).length;
  const maxShare = rows.length ? Math.max(0, ...counts.values()) / rows.length : 0;

  return {
    key,
    counts,
    uniqueCount,
    repeatedCount,
    maxShare
  };
}

function isMeaningfulCategory(stats, rowCount) {
  if (!stats || rowCount < 3) return false;
  if (stats.uniqueCount < 2) return false;
  if (stats.uniqueCount > Math.max(8, Math.ceil(rowCount * 0.55))) return false;
  if (stats.repeatedCount < 1 && rowCount > 4) return false;
  return stats.maxShare < 0.95;
}

function scoreCategoryKey(key) {
  const normalized = normalizeKey(key);
  const preferredIndex = PREFERRED_CATEGORY_KEYS.findIndex((preferred) =>
    normalized === preferred || normalized.includes(preferred)
  );

  return preferredIndex === -1 ? 0 : 100 - preferredIndex;
}

function getChartColumns(data) {
  const rows = data.filter((row) => row && typeof row === "object" && !Array.isArray(row));
  const keys = [...new Set(rows.flatMap((row) => Object.keys(row)))];

  const numericKeys = keys.filter((key) => !isBlockedDimension(key) && isNumericColumn(rows, key));
  const dateKeys = keys.filter((key) => !isBlockedDimension(key) && isDateColumn(rows, key));
  const categoricalKeys = keys
    .filter((key) => !isBlockedDimension(key) && !numericKeys.includes(key) && !dateKeys.includes(key))
    .map((key) => getCategoryStats(rows, key))
    .filter((stats) => isMeaningfulCategory(stats, rows.length))
    .sort((a, b) => {
      const preferredScore = scoreCategoryKey(b.key) - scoreCategoryKey(a.key);
      if (preferredScore !== 0) return preferredScore;
      if (b.repeatedCount !== a.repeatedCount) return b.repeatedCount - a.repeatedCount;
      return a.uniqueCount - b.uniqueCount;
    })
    .map((stats) => stats.key);

  return { rows, numericKeys, categoricalKeys, dateKeys };
}

export function generateChartSuggestions(data = []) {
  if (!Array.isArray(data) || data.length === 0) {
    return [];
  }

  const { rows, numericKeys, categoricalKeys, dateKeys } = getChartColumns(data);
  const charts = [];
  const primaryCategory = categoricalKeys[0];
  const primaryMetric = numericKeys[0];
  const secondaryMetric = numericKeys.find((key) => key !== primaryMetric);
  const primaryDate = dateKeys[0];

  if (primaryDate && primaryMetric) {
    charts.push({
      type: "line",
      title: `${primaryMetric} over ${primaryDate}`,
      xKey: primaryDate,
      yKey: primaryMetric
    });

    charts.push({
      type: "area",
      title: `${primaryMetric} Trend Area`,
      xKey: primaryDate,
      yKey: primaryMetric
    });
  }

  if (primaryCategory && primaryMetric) {
    charts.push({
      type: "bar",
      title: `${primaryMetric} by ${primaryCategory}`,
      xKey: primaryCategory,
      yKey: primaryMetric
    });
  }

  if (primaryCategory) {
    charts.push({
      type: "pie",
      title: `${primaryCategory} Distribution`,
      dataKey: primaryCategory,
      valueKey: "value",
      aggregation: "count"
    });
  }

  if (primaryMetric && !primaryDate) {
    charts.push({
      type: "line",
      title: `${primaryMetric} Trend`,
      xKey: primaryCategory || "__index",
      yKey: primaryMetric
    });
  }

  if (primaryMetric) {
    charts.push({
      type: "histogram",
      title: `${primaryMetric} Distribution`,
      dataKey: primaryMetric,
      yKey: primaryMetric
    });
  }

  if (primaryMetric && secondaryMetric) {
    charts.push({
      type: "scatter",
      title: `${secondaryMetric} vs ${primaryMetric}`,
      xKey: primaryMetric,
      yKey: secondaryMetric
    });
  }

  return charts.slice(0, 6);
}
