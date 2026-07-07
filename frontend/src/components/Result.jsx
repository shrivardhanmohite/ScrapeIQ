import axios from "axios";
import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import {
  BarChart,
  Bar,
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import { Download, FileText, Maximize2, Minimize2 } from "lucide-react";
import Sources from "./Sources";
import ReportExecutionPanel from "./ReportExecutionPanel";
import ReportPreviewModal from "./ReportPreviewModal";
import { generateReport } from "../api/scraperApi";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api";

const BLOCKED_CHART_DIMENSIONS = new Set(["name", "title", "description", "summary"]);
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
  "platform"
];
const PREFERRED_DATE_KEYS = ["createdat", "created", "updatedat", "updated", "year", "month", "date"];
const CHART_TYPE_OPTIONS = [
  { value: "auto", label: "Auto" },
  { value: "bar", label: "Bar" },
  { value: "horizontalBar", label: "Horizontal Bar" },
  { value: "line", label: "Line" },
  { value: "pie", label: "Pie" },
  { value: "histogram", label: "Histogram" },
  { value: "scatter", label: "Scatter" },
  { value: "area", label: "Area" }
];
const BLOCKED_IMAGE_TERMS = [
  "favicon",
  "logo",
  "icon",
  "sprite",
  "placeholder",
  "avatar",
  "wikipedia/static"
];

const normalizeKey = (key = "") =>
  String(key).toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

const isBlockedChartDimension = (key = "") => {
  const normalized = normalizeKey(key);
  if (!normalized) return true;
  const parts = normalized.split(/\s+/);

  return (
    parts.some((part) => BLOCKED_CHART_DIMENSIONS.has(part)) ||
    normalized.includes("url") ||
    normalized.includes("image") ||
    normalized.includes("source") ||
    normalized.includes("link")
  );
};

const isNumericColumn = (rows, key) => {
  const values = rows
    .map((row) => row?.[key])
    .filter((value) => value !== undefined && value !== null && String(value).trim() !== "");

  if (values.length < 2) return false;

  const numericCount = values.filter((value) => !Number.isNaN(Number.parseFloat(value))).length;
  return numericCount / values.length >= 0.7;
};

const isDateColumn = (rows, key) => {
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
};

const getCategoryStats = (rows, key) => {
  const counts = new Map();

  rows.forEach((row) => {
    const label = String(row?.[key] ?? "").trim();
    if (!label || label.length > 48 || /^https?:\/\//i.test(label)) return;
    counts.set(label, (counts.get(label) || 0) + 1);
  });

  const values = [...counts.values()];
  return {
    key,
    counts,
    uniqueCount: counts.size,
    repeatedCount: values.filter((count) => count > 1).length,
    maxShare: rows.length ? Math.max(0, ...values) / rows.length : 0
  };
};

const isMeaningfulCategory = (stats, rowCount) => {
  if (!stats || rowCount < 3) return false;
  if (stats.uniqueCount < 2) return false;
  if (stats.uniqueCount > Math.max(8, Math.ceil(rowCount * 0.55))) return false;
  if (stats.repeatedCount < 1 && rowCount > 4) return false;
  return stats.maxShare < 0.95;
};

const scoreCategoryKey = (key) => {
  const normalized = normalizeKey(key);
  const preferredIndex = PREFERRED_CATEGORY_KEYS.findIndex((preferred) =>
    normalized === preferred || normalized.includes(preferred)
  );

  return preferredIndex === -1 ? 0 : 100 - preferredIndex;
};

const getMeaningfulCategories = (rows, keys, numericKeys = []) =>
  keys
    .filter((key) => !isBlockedChartDimension(key) && !numericKeys.includes(key))
    .map((key) => getCategoryStats(rows, key))
    .filter((stats) => isMeaningfulCategory(stats, rows.length))
    .sort((a, b) => {
      const preferredScore = scoreCategoryKey(b.key) - scoreCategoryKey(a.key);
      if (preferredScore !== 0) return preferredScore;
      if (b.repeatedCount !== a.repeatedCount) return b.repeatedCount - a.repeatedCount;
      return a.uniqueCount - b.uniqueCount;
    })
    .map((stats) => stats.key);

const aggregatePieCounts = (rows, key) =>
  [...rows.reduce((counts, row) => {
    const label = String(row?.[key] ?? "").trim();
    if (!label) return counts;
    counts.set(label, (counts.get(label) || 0) + 1);
    return counts;
  }, new Map())]
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 8);

const aggregateNumericByCategory = (rows, xKey, yKey) =>
  [...rows.reduce((groups, row) => {
    const label = String(row?.[xKey] ?? "").trim();
    const value = Number.parseFloat(row?.[yKey]);
    if (!label || Number.isNaN(value)) return groups;

    const current = groups.get(label) || { [xKey]: label, [yKey]: 0, __count: 0 };
    current[yKey] += value;
    current.__count += 1;
    groups.set(label, current);
    return groups;
  }, new Map()).values()]
    .sort((a, b) => b[yKey] - a[yKey])
    .slice(0, 12);

const buildHistogramBins = (rows, key, binCount = 8) => {
  const values = rows
    .map((row) => Number.parseFloat(row?.[key]))
    .filter((value) => !Number.isNaN(value));

  if (values.length < 2) return [];

  const min = Math.min(...values);
  const max = Math.max(...values);
  if (min === max) return [{ range: String(min), value: values.length }];

  const size = (max - min) / binCount;
  const bins = Array.from({ length: binCount }, (_, index) => {
    const start = min + size * index;
    const end = index === binCount - 1 ? max : start + size;
    return {
      range: `${start.toFixed(1)}-${end.toFixed(1)}`,
      value: 0
    };
  });

  values.forEach((value) => {
    const index = Math.min(binCount - 1, Math.floor((value - min) / size));
    bins[index].value += 1;
  });

  return bins.filter((bin) => bin.value > 0);
};

const buildScatterData = (rows, xKey, yKey) =>
  rows
    .map((row, index) => ({
      __index: index + 1,
      [xKey]: Number.parseFloat(row?.[xKey]),
      [yKey]: Number.parseFloat(row?.[yKey])
    }))
    .filter((row) => !Number.isNaN(row[xKey]) && !Number.isNaN(row[yKey]))
    .slice(0, 80);

const chartXAxisOptionsCandidate = (value, options) =>
  Boolean(value && options.includes(value));

const hasBlockedImageSignal = (url = "", metadata = "") => {
  const haystack = `${url} ${metadata}`.toLowerCase();
  return BLOCKED_IMAGE_TERMS.some((term) => haystack.includes(term)) ||
    [".ico", ".svg"].some((extension) => {
      try {
        return new URL(url).pathname.toLowerCase().endsWith(extension);
      } catch {
        return url.toLowerCase().includes(extension);
      }
    });
};

const buildEntityTerms = (rows) => {
  const terms = new Set();

  rows.slice(0, 30).forEach((row) => {
    Object.entries(row || {}).forEach(([key, value]) => {
      if (isBlockedChartDimension(key) && !["name", "title"].includes(normalizeKey(key))) return;
      const text = String(value ?? "").trim();
      if (text.length >= 4 && text.length <= 60 && !/^https?:\/\//i.test(text)) {
        terms.add(text.toLowerCase());
      }
    });
  });

  return [...terms].slice(0, 50);
};

const scoreImageItem = (item, entityTerms = []) => {
  const metadata = `${item.label} ${item.prompt} ${item.caption || ""} ${item.sourceUrl || ""}`;
  let score = 0;

  if (hasBlockedImageSignal(item.src, metadata)) return -100;
  if (item.label && item.label !== "Image") score += 16;
  if (item.prompt) score += 8;
  if (/\/(images?|photos?|media|uploads?|content)\//i.test(item.src)) score += 12;
  if (/\.(jpe?g|png|webp|avif)(\?|$)/i.test(item.src)) score += 8;
  if (/thumb|thumbnail|small|badge/i.test(item.src)) score -= 10;

  const haystack = `${metadata} ${item.src}`.toLowerCase();
  if (entityTerms.some((term) => haystack.includes(term))) score += 28;

  return score;
};

export default function Result({ result }) {
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState({});
  const [rangeFilters, setRangeFilters] = useState({});
  const [hiddenCols, setHiddenCols] = useState([]);
  const [sortKey, setSortKey] = useState(null);
  const [asc, setAsc] = useState(true);
  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [chartType, setChartType] = useState("auto");
  const [xAxisKey, setXAxisKey] = useState("");
  const [yAxisKey, setYAxisKey] = useState("");
  const [generatedImages, setGeneratedImages] = useState([]);
  const [imageLoading, setImageLoading] = useState(false);
  const [imageError, setImageError] = useState("");
  const [showFullSummary, setShowFullSummary] = useState(false);
  const [activeTab, setActiveTab] = useState("overview"); // overview, insights, chat
  const [insights, setInsights] = useState(null);
  const [insightsLoading, setInsightsLoading] = useState(false);
  const [insightsError, setInsightsError] = useState("");
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [chatError, setChatError] = useState("");
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const [reportGenerationStatus, setReportGenerationStatus] = useState(null);
  const [generatedReport, setGeneratedReport] = useState(null);
  const [showReportPreview, setShowReportPreview] = useState(false);
  const [previewImage, setPreviewImage] = useState(null);
  const [chartFullscreen, setChartFullscreen] = useState(false);
  const chartFrameRef = useRef(null);

  const safeResult = result && typeof result === "object" && !Array.isArray(result) ? result : {};

  const formatCellValue = (value) => {
    if (value == null) return "-";
    if (Array.isArray(value)) return value.map((item) => String(item)).join(", ");
    if (typeof value === "object") {
      return Object.entries(value)
        .map(([key, item]) => `${key}: ${typeof item === "object" ? JSON.stringify(item) : String(item)}`)
        .join(", ");
    }
    return String(value);
  };

  const formatAnswerText = (answer) => {
    if (typeof answer === "string") return answer;
    if (Array.isArray(answer)) return answer.filter(Boolean).map(String).join("\n\n");
    if (answer && typeof answer === "object") {
      return Object.entries(answer)
        .map(([key, value]) => `${key}: ${formatCellValue(value)}`)
        .join("\n\n");
    }
    return "";
  };

  const isValidImageUrl = (url) => {
    if (!url || typeof url !== "string") return false;
    try {
      const parsed = new URL(url);
      return ["http:", "https:"].includes(parsed.protocol);
    } catch {
      return false;
    }
  };

  const getImageItem = (image) => {
    if (!image) return null;
    if (typeof image === "string") {
      return { src: image.trim(), label: "Image", prompt: "" };
    }

    const src = String(image.url || image.src || image.image || "").trim();
    if (!src) return null;

    return {
      src,
      label: String(image.label || image.title || image.alt || "Image").trim(),
      prompt: String(image.prompt || image.caption || "").trim(),
      caption: String(image.caption || "").trim(),
      sourceUrl: String(image.sourceUrl || "").trim()
    };
  };

  const imageEntityTerms = useMemo(() => {
    const directRows = normalizeRows(safeResult.data);
    return buildEntityTerms(directRows);
  }, [safeResult.data]);

  const normalizedImages = useMemo(() => {
    if (!Array.isArray(safeResult.images)) return [];

    const seen = new Set();
    return safeResult.images
      .map(getImageItem)
      .filter((item) => item && isValidImageUrl(item.src))
      .map((item) => ({ ...item, score: scoreImageItem(item, imageEntityTerms) }))
      .filter((item) => item.score > 0)
      .filter((item) => {
        if (seen.has(item.src)) return false;
        seen.add(item.src);
        return true;
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, 6);
  }, [safeResult.images, imageEntityTerms]);

  const displayImages = useMemo(() => {
    return normalizedImages.slice(0, 6);
  }, [normalizedImages]);

  const answerView = formatAnswer(formatAnswerText(safeResult.answer));

  const isValidHistoryItem = useCallback((item) => {
    if (item == null) return false;
    if (typeof item === "string") return item.trim() !== "";
    if (Array.isArray(item)) return item.length > 0;
    if (typeof item === "object") return Object.keys(item).length > 0;
    return true;
  }, []);

  const normalizeTableRows = (table) => {
    if (!table) return [];
    if (Array.isArray(table)) return table;
    if (Array.isArray(table.rows)) return table.rows;
    if (Array.isArray(table.data)) return table.data;
    return [];
  };

  const hasValidTableRows = useCallback((table) => {
    const rows = normalizeTableRows(table);
    return Array.isArray(rows) && rows.length > 0 && rows.some(isValidHistoryItem);
  }, [isValidHistoryItem]);

  const validTables = useMemo(() => {
    if (!Array.isArray(safeResult.tables)) return [];
    return safeResult.tables.filter((table) =>
      isValidHistoryItem(table) && hasValidTableRows(table)
    );
  }, [safeResult.tables, isValidHistoryItem, hasValidTableRows]);

  const validImages = useMemo(() => {
    if (!Array.isArray(safeResult.images)) return [];
    return safeResult.images.filter((image) => {
      if (!isValidHistoryItem(image)) return false;
      if (typeof image === "string") return true;
      return Boolean(image.url || image.src || image.image || image.label);
    });
  }, [safeResult.images, isValidHistoryItem]);

  const validCharts = useMemo(() => {
    if (!Array.isArray(safeResult.charts)) return [];
    return safeResult.charts.filter((chart) => {
      if (!isValidHistoryItem(chart)) return false;
      if (chart.type === "pie") {
        return typeof chart.dataKey === "string" && chart.dataKey.trim() !== "";
      }
      return (
        typeof chart.xKey === "string" && chart.xKey.trim() !== "" &&
        typeof chart.yKey === "string" && chart.yKey.trim() !== ""
      );
    });
  }, [safeResult.charts, isValidHistoryItem]);


  const buildRowsFromArrayTable = useCallback((rows) => {
    if (!Array.isArray(rows) || rows.length === 0) return [];

    const headerRow = rows[0];
    const hasHeaders = Array.isArray(headerRow) && headerRow.every(cell => typeof cell === "string" && cell.trim() !== "");

    if (hasHeaders && rows.length > 1) {
      const headers = headerRow.map(cell => String(cell).trim() || "column");
      return rows.slice(1).map((row) => {
        return headers.reduce((obj, header, index) => {
          obj[header] = row[index] ?? "";
          return obj;
        }, {});
      }).filter(isValidHistoryItem);
    }

    return rows.map((row, index) => {
      if (!Array.isArray(row)) return {};
      return row.reduce((obj, cell, cellIndex) => {
        obj[`col_${cellIndex + 1}`] = cell;
        return obj;
      }, { index: index + 1 });
    }).filter(isValidHistoryItem);
  }, [isValidHistoryItem]);

  const fallbackTableData = useMemo(() => {
    return validTables.flatMap((table) => {
      const rows = normalizeTableRows(table);
      if (!rows.length) return [];
      return buildRowsFromArrayTable(rows);
    });
  }, [validTables, buildRowsFromArrayTable]);

  const data = useMemo(() => {
    const normalized = normalizeRows(safeResult.data);
    return normalized.length > 0 ? normalized : fallbackTableData;
  }, [safeResult.data, fallbackTableData]);

  const columns = useMemo(() => {
    return [...new Set(data.flatMap((obj) => Object.keys(obj)))].filter(Boolean);
  }, [data]);

  const numericCols = useMemo(
    () => columns.filter((col) => !isBlockedChartDimension(col) && isNumericColumn(data, col)),
    [columns, data]
  );

  const categoricalCols = useMemo(
    () => getMeaningfulCategories(data, columns, numericCols),
    [data, columns, numericCols]
  );

  const dateCols = useMemo(
    () => columns.filter((col) => !isBlockedChartDimension(col) && isDateColumn(data, col)),
    [columns, data]
  );

  const chartOptions = useMemo(() => {
    if (data.length === 0) return [];

    const categorySet = new Set(categoricalCols);
    const numericSet = new Set(numericCols);
    const dateSet = new Set(dateCols);
    const sanitizedCharts = validCharts.filter((chart) => {
      if (chart.type === "pie") {
        return categorySet.has(chart.dataKey);
      }

      if (chart.type === "bar" || chart.type === "horizontalBar") {
        return categorySet.has(chart.xKey) && numericSet.has(chart.yKey);
      }

      if (chart.type === "line" || chart.type === "area") {
        return (chart.xKey === "__index" || categorySet.has(chart.xKey) || dateSet.has(chart.xKey)) && numericSet.has(chart.yKey);
      }

      if (chart.type === "histogram") {
        return numericSet.has(chart.yKey || chart.dataKey);
      }

      if (chart.type === "scatter") {
        return numericSet.has(chart.xKey) && numericSet.has(chart.yKey) && chart.xKey !== chart.yKey;
      }

      return false;
    });

    if (sanitizedCharts.length > 0) {
      return sanitizedCharts.slice(0, 12);
    }

    const suggestions = [];
    const primaryCategory = categoricalCols[0];
    const primaryMetric = numericCols[0];
    const secondaryMetric = numericCols.find((col) => col !== primaryMetric);
    const primaryDate = dateCols[0];

    if (primaryDate && primaryMetric) {
      suggestions.push({
        type: "line",
        title: `${primaryMetric} over ${primaryDate}`,
        xKey: primaryDate,
        yKey: primaryMetric
      });

      suggestions.push({
        type: "area",
        title: `${primaryMetric} Trend Area`,
        xKey: primaryDate,
        yKey: primaryMetric
      });
    }

    if (primaryCategory && primaryMetric) {
      suggestions.push({
        type: "bar",
        title: `${primaryMetric} by ${primaryCategory}`,
        xKey: primaryCategory,
        yKey: primaryMetric
      });

      suggestions.push({
        type: "horizontalBar",
        title: `Ranked ${primaryMetric} by ${primaryCategory}`,
        xKey: primaryCategory,
        yKey: primaryMetric
      });
    }

    if (primaryCategory) {
      suggestions.push({
        type: "pie",
        title: `${primaryCategory} Distribution`,
        dataKey: primaryCategory,
        valueKey: "value",
        aggregation: "count"
      });
    }

    if (primaryMetric && !primaryDate) {
      suggestions.push({
        type: "line",
        title: `${primaryMetric} Trend`,
        xKey: primaryCategory || "__index",
        yKey: primaryMetric
      });
    }

    if (primaryMetric) {
      suggestions.push({
        type: "histogram",
        title: `${primaryMetric} Distribution`,
        dataKey: primaryMetric,
        yKey: primaryMetric
      });
    }

    if (primaryMetric && secondaryMetric) {
      suggestions.push({
        type: "scatter",
        title: `${secondaryMetric} vs ${primaryMetric}`,
        xKey: primaryMetric,
        yKey: secondaryMetric
      });
    }

    if (primaryCategory && primaryMetric && !primaryDate) {
      suggestions.push({
        type: "area",
        title: `${primaryMetric} Area by ${primaryCategory}`,
        xKey: primaryCategory,
        yKey: primaryMetric
      });
    }

    const seen = new Set();
    return suggestions
      .filter((chart) => {
        const key = `${chart.type}-${chart.xKey || chart.dataKey}-${chart.yKey || chart.valueKey}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .slice(0, 12);
  }, [validCharts, data, categoricalCols, numericCols, dateCols]);

  const activeChartType = chartType === "auto"
    ? chartOptions[0]?.type || "bar"
    : chartType;

  const selectedChart = useMemo(() => {
    if (!chartOptions.length) return null;
    return chartOptions.find((chart) => chart.type === activeChartType) || chartOptions[0];
  }, [chartOptions, activeChartType]);

  const activeXAxisKey = (() => {
    if (activeChartType === "pie") return selectedChart?.dataKey || categoricalCols[0] || "";
    if (activeChartType === "histogram") return selectedChart?.dataKey || selectedChart?.yKey || (numericCols.includes(xAxisKey) ? xAxisKey : numericCols[0]) || "";
    if (activeChartType === "scatter") return selectedChart?.xKey || (numericCols.includes(xAxisKey) ? xAxisKey : numericCols[0]) || "";
    const fallback = dateCols[0] || categoricalCols[0] || "__index";
    return selectedChart?.xKey || (chartXAxisOptionsCandidate(xAxisKey, [...dateCols, ...categoricalCols, ...numericCols, "__index"]) ? xAxisKey : fallback);
  })();
  const activeYAxisKey = (() => {
    const allowed = numericCols;
    if (selectedChart?.yKey && allowed.includes(selectedChart.yKey)) return selectedChart.yKey;
    if (yAxisKey && allowed.includes(yAxisKey) && yAxisKey !== activeXAxisKey) return yAxisKey;
    return allowed.find((col) => col !== activeXAxisKey) || allowed[0] || "";
  })();
  const chartXAxisOptions = useMemo(() => {
    if (activeChartType === "pie") return categoricalCols;
    if (activeChartType === "histogram") return numericCols;
    const options = activeChartType === "scatter"
      ? [...numericCols]
      : [...dateCols, ...categoricalCols, ...numericCols];
    if (!options.includes("__index") && activeChartType !== "scatter") {
      options.push("__index");
    }
    return [...new Set(options)];
  }, [activeChartType, categoricalCols, dateCols, numericCols]);

  console.debug("Result render:", {
    query: safeResult.query,
    dataCount: data.length,
    tables: validTables.length,
    images: validImages.length,
    charts: chartOptions.length
  });

  const filteredData = useMemo(() => {
    const searchFiltered = data.filter((row) =>
      Object.values(row).some((val) =>
        String(val).toLowerCase().includes(search.toLowerCase())
      )
    );

    const columnFiltered = searchFiltered.filter((row) =>
      Object.entries(filters).every(([col, val]) =>
        !val || String(row[col]) === val
      )
    );

    return columnFiltered.filter((row) =>
      Object.entries(rangeFilters).every(([col, range]) => {
        if (!range) return true;

        const value = parseFloat(row[col]);
        if (isNaN(value)) return true;

        return value >= (range.min || -Infinity) &&
          value <= (range.max || Infinity);
      })
    );
  }, [data, search, filters, rangeFilters]);

  const pieData = useMemo(() => {
    if (activeChartType !== "pie" || !activeXAxisKey) return [];

    return aggregatePieCounts(filteredData, activeXAxisKey);
  }, [filteredData, activeChartType, activeXAxisKey]);

  const chartData = useMemo(() => {
    if (activeChartType === "pie") return pieData;
    if (activeChartType === "histogram") return buildHistogramBins(filteredData, activeXAxisKey || activeYAxisKey);
    if (activeChartType === "scatter") return buildScatterData(filteredData, activeXAxisKey, activeYAxisKey);
    if (!activeXAxisKey || !activeYAxisKey) return [];

    if ((activeChartType === "bar" || activeChartType === "horizontalBar" || activeChartType === "area") && activeXAxisKey !== "__index" && !dateCols.includes(activeXAxisKey)) {
      return aggregateNumericByCategory(filteredData, activeXAxisKey, activeYAxisKey);
    }

    return filteredData.map((row, index) => ({
      ...row,
      __index: index,
      [activeXAxisKey]: activeXAxisKey === "__index" ? index + 1 : row[activeXAxisKey],
      [activeYAxisKey]: Number(row[activeYAxisKey])
    })).filter((row) => !Number.isNaN(row[activeYAxisKey]));
  }, [filteredData, activeChartType, activeXAxisKey, activeYAxisKey, pieData, dateCols]);

  const sortedData = useMemo(() => {
    const nextRows = [...filteredData];

    if (!sortKey) return nextRows;

    nextRows.sort((a, b) => {
      const valA = a[sortKey] ?? "";
      const valB = b[sortKey] ?? "";

      if (!isNaN(valA) && !isNaN(valB)) {
        return asc ? valA - valB : valB - valA;
      }

      return asc
        ? String(valA).localeCompare(String(valB))
        : String(valB).localeCompare(String(valA));
    });

    return nextRows;
  }, [filteredData, sortKey, asc]);

  const totalPages = Math.max(1, Math.ceil(sortedData.length / rowsPerPage));
  const paginatedData = useMemo(() => {
    const start = (page - 1) * rowsPerPage;
    return sortedData.slice(start, start + rowsPerPage);
  }, [sortedData, page, rowsPerPage]);

  useEffect(() => {
    setPage(1);
  }, [search, filters, rangeFilters, rowsPerPage]);

  useEffect(() => {
    setPage((current) => Math.min(current, totalPages));
  }, [totalPages]);

  const getUniqueValues = (col) =>
    [...new Set(data.map(row => row[col]).filter(Boolean))];

  const downloadCSV = async () => {
    const res = await axios.post(
      `${API_BASE_URL}/download-csv`,
      { data: filteredData },
      { responseType: "blob" }
    );

    const url = window.URL.createObjectURL(new Blob([res.data]));
    const link = document.createElement("a");
    link.href = url;
    link.download = "data.csv";
    link.click();
    window.URL.revokeObjectURL(url);
  };

  const exportExcel = () => {
    axios.post(
      `${API_BASE_URL}/download-excel`,
      {
        datasetId: safeResult._id,
        query: safeResult.query || "",
        answer: safeResult.answer || "",
        data: filteredData,
        sources: safeResult.sources || [],
        sourceUrls: safeResult.sourceUrls || safeResult.sources || [],
        images: normalizedImages,
        charts: chartOptions,
        insights: insights || [],
        workspaceName: safeResult.workspaceName || safeResult.workspace?.name || ""
      },
      { responseType: "blob" }
    ).then((res) => {
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement("a");
      link.href = url;
      link.download = "ai-scraping-report.xlsx";
      link.click();
      window.URL.revokeObjectURL(url);
    });
  };

  const sendEmailReport = async () => {
    const email = window.prompt("Send report to email address");
    if (!email) return;

    try {
      await axios.post(`${API_BASE_URL}/send-mail`, {
        email,
        datasetId: safeResult._id,
        query: safeResult.query || "",
        answer: safeResult.answer || "",
        data: filteredData,
        sources: safeResult.sources || [],
        sourceUrls: safeResult.sourceUrls || safeResult.sources || [],
        images: normalizedImages,
        charts: chartOptions,
        insights: insights || [],
        workspaceName: safeResult.workspaceName || safeResult.workspace?.name || ""
      });

      alert("Report emailed successfully.");
    } catch (err) {
      console.error("Email report error:", err);
      alert("Failed to send report email.");
    }
  };

  const exportChartCSV = () => {
    if (!chartData.length) return;

    const keys = [...new Set(chartData.flatMap((row) => Object.keys(row)))].filter((key) => key !== "__count");
    const csv = [
      keys.join(","),
      ...chartData.map((row) =>
        keys.map((key) => `"${String(row[key] ?? "").replace(/"/g, '""')}"`).join(",")
      )
    ].join("\n");
    const url = window.URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `${activeChartType}-chart.csv`;
    link.click();
    window.URL.revokeObjectURL(url);
  };

  const exportChartSVG = () => {
    const svg = chartFrameRef.current?.querySelector("svg");
    if (!svg) return;

    const serialized = new XMLSerializer().serializeToString(svg);
    const url = window.URL.createObjectURL(new Blob([serialized], { type: "image/svg+xml" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `${activeChartType}-chart.svg`;
    link.click();
    window.URL.revokeObjectURL(url);
  };

  const saveDataset = async () => {
    try {
      const response = await axios.post(`${API_BASE_URL}/dataset/save`, {
        query: safeResult.query || safeResult.answer || "",
        answer: safeResult.answer || "",
        data,
        sources: safeResult.sources || [],
        sourceUrls: safeResult.sourceUrls || safeResult.sources || [],
        tables: safeResult.tables || [],
        images: safeResult.images || [],
        text: safeResult.text || "",
        charts: safeResult.charts || []
      });

      if (response.data?.dataset?._id) {
        window.localStorage.setItem("latestDatasetId", response.data.dataset._id);
      }

      window.dispatchEvent(new Event("datasetSaved"));
      alert("Dataset saved successfully.");
    } catch (err) {
      console.error("Save error:", err);
      alert(
        "Failed to save dataset: " +
        (err.response?.data?.message || err.message || "Unknown error")
      );
    }
  };

  const generateImages = async () => {
    setImageLoading(true);
    setImageError("");

    try {
      const res = await axios.post(`${API_BASE_URL}/generate-images`, {
        answer: safeResult.answer,
        data: filteredData,
        count: 3
      });

      setGeneratedImages(res.data.images || []);
    } catch (err) {
      console.log("Image generation error:", err);
      setImageError("Unable to generate images right now.");
    } finally {
      setImageLoading(false);
    }
  };

  const fetchInsights = async () => {
    setInsightsLoading(true);
    setInsightsError("");

    try {
      const res = await axios.post(`${API_BASE_URL}/dataset/insights`, {
        datasetId: safeResult._id,
        query: safeResult.query,
        answer: safeResult.answer,
        data: filteredData,
        sourceUrls: safeResult.sources || safeResult.sourceUrls || []
      });

      setInsights(res.data.insights || []);
    } catch (err) {
      console.error("Insights error:", err);
      setInsightsError("Unable to generate insights right now.");
    } finally {
      setInsightsLoading(false);
    }
  };

  const sendChatMessage = async () => {
    if (!chatInput.trim()) return;

    const userMessage = chatInput.trim();
    setChatInput("");
    setChatMessages((prev) => [...prev, { role: "user", content: userMessage }]);
    setChatLoading(true);
    setChatError("");

    try {
      const res = await axios.post(`${API_BASE_URL}/dataset/chat`, {
        datasetId: safeResult._id,
        question: userMessage,
        data: filteredData,
        sourceUrls: safeResult.sources || safeResult.sourceUrls || []
      });

      setChatMessages((prev) => [...prev, { role: "assistant", content: res.data.answer || "" }]);
    } catch (err) {
      console.error("Chat error:", err);
      setChatError("Unable to send message right now.");
    } finally {
      setChatLoading(false);
    }
  };

  const handleGenerateReport = async () => {
    const workspaceId = safeResult.workspaceId || safeResult.workspace?._id;

    if (!workspaceId || !safeResult?._id) {
      alert("Please select a workspace and ensure data is loaded");
      return;
    }

    try {
      setIsGeneratingReport(true);
      setReportGenerationStatus("Research");
      setGeneratedReport(null);
      setShowReportPreview(false);

      const result = await generateReport(workspaceId, safeResult._id);

      if (result.success) {
        setGeneratedReport(result.report);
        setShowReportPreview(true);
        setReportGenerationStatus("Report");
      } else {
        alert("Report generation failed: " + result.error);
        setReportGenerationStatus("failed");
      }
    } catch (err) {
      console.error("Report generation error:", err);
      alert("Error generating report: " + err.message);
      setReportGenerationStatus("failed");
    } finally {
      setIsGeneratingReport(false);
    }
  };


  const getNumericValues = (col) =>
    filteredData
      .map(row => parseFloat(row[col]))
      .filter(v => !isNaN(v));

  const analyticsInsights = {};

  numericCols.forEach(col => {
    const values = getNumericValues(col);

    if (values.length > 0) {
      const sum = values.reduce((a, b) => a + b, 0);
      analyticsInsights[col] = {
        avg: (sum / values.length).toFixed(2),
        max: Math.max(...values),
        min: Math.min(...values)
      };
    }
  });

  let topItem = null;
  if (numericCols.length > 0) {
    const key = numericCols[0];
    topItem = [...filteredData].sort((a, b) =>
      parseFloat(b[key]) - parseFloat(a[key])
    )[0];
  }

  const chartColors = ["#38bdf8", "#22c55e", "#f59e0b", "#ef4444", "#a78bfa", "#14b8a6"];

  const renderChart = () => {
    if (activeChartType === "area") {
      if (!activeXAxisKey || !activeYAxisKey || chartData.length === 0) {
        return <div>No area chart data available.</div>;
      }

      return (
        <AreaChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.12)" />
          <XAxis dataKey={activeXAxisKey} />
          <YAxis />
          <Tooltip />
          <Legend />
          <Area type="monotone" dataKey={activeYAxisKey} stroke="#a78bfa" fill="#7c3aed" fillOpacity={0.3} strokeWidth={2} />
        </AreaChart>
      );
    }

    if (activeChartType === "line") {
      if (!activeXAxisKey || !activeYAxisKey || chartData.length === 0) {
        return <div>No line chart data available.</div>;
      }

      return (
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.12)" />
          <XAxis dataKey={activeXAxisKey} />
          <YAxis />
          <Tooltip />
          <Legend />
          <Line type="monotone" dataKey={activeYAxisKey} stroke="#38bdf8" strokeWidth={2} />
        </LineChart>
      );
    }

    if (activeChartType === "pie") {
      if (pieData.length === 0) {
        return <div>No pie chart data available.</div>;
      }

      return (
        <PieChart>
          <Tooltip />
          <Legend />
          <Pie
            data={pieData}
            dataKey="value"
            nameKey="name"
            outerRadius={100}
            label
          >
            {pieData.map((_, index) => (
              <Cell key={index} fill={chartColors[index % chartColors.length]} />
            ))}
          </Pie>
        </PieChart>
      );
    }

    if (activeChartType === "histogram") {
      if (chartData.length === 0) {
        return <div>No histogram data available.</div>;
      }

      return (
        <BarChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.12)" />
          <XAxis dataKey="range" />
          <YAxis />
          <Tooltip />
          <Legend />
          <Bar dataKey="value" name="Frequency" fill="#a78bfa" />
        </BarChart>
      );
    }

    if (activeChartType === "horizontalBar") {
      if (!activeXAxisKey || !activeYAxisKey || chartData.length === 0) {
        return <div>No horizontal bar chart data available.</div>;
      }

      return (
        <BarChart data={chartData} layout="vertical" margin={{ left: 18 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.12)" />
          <XAxis type="number" />
          <YAxis dataKey={activeXAxisKey} type="category" width={110} />
          <Tooltip />
          <Legend />
          <Bar dataKey={activeYAxisKey} fill="#a78bfa" />
        </BarChart>
      );
    }

    if (activeChartType === "scatter") {
      if (!activeXAxisKey || !activeYAxisKey || chartData.length === 0) {
        return <div>No scatter plot data available.</div>;
      }

      return (
        <ScatterChart>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.12)" />
          <XAxis dataKey={activeXAxisKey} name={activeXAxisKey} type="number" />
          <YAxis dataKey={activeYAxisKey} name={activeYAxisKey} type="number" />
          <Tooltip cursor={{ strokeDasharray: "3 3" }} />
          <Legend />
          <Scatter name={`${activeYAxisKey} vs ${activeXAxisKey}`} data={chartData} fill="#38bdf8" />
        </ScatterChart>
      );
    }

    if (!activeXAxisKey || !activeYAxisKey || chartData.length === 0) {
      return <div>No bar chart data available.</div>;
    }

    if (activeChartType !== "bar") {
      return <div>No bar chart data available.</div>;
    }

    return (
      <BarChart data={chartData}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.12)" />
        <XAxis dataKey={activeXAxisKey} />
        <YAxis />
        <Tooltip />
        <Legend />
        <Bar dataKey={activeYAxisKey} fill="#38bdf8" />
      </BarChart>
    );
  };

  return (
    <div className="result-workspace">

      <div className="answer-panel">
        <div className="answer-panel__header">
          <div>
            <span className="answer-panel__eyebrow">Answer</span>
            <h2>{safeResult.query || "Research summary"}</h2>
          </div>

          <div className="answer-panel__stats" aria-label="Answer statistics">
            <span>{data.length} rows</span>
            <span>{(safeResult.sources || []).length} sources</span>
          </div>
        </div>
      </div>

      <div className="result-tabs">
        {[
          { id: "overview", label: "Overview" },
          { id: "insights", label: "AI Insights" },
          { id: "chat", label: "Chat" }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => {
              setActiveTab(tab.id);
              if (tab.id === "insights" && !insights) fetchInsights();
            }}
            className={activeTab === tab.id ? "result-tab result-tab--active" : "result-tab"}
          >
            {tab.label}
          </button>
        ))}
        <button
          onClick={handleGenerateReport}
          disabled={isGeneratingReport}
          className="result-report-btn"
        >
          <FileText size={16} />
          {isGeneratingReport ? "Generating..." : "Generate Report"}
        </button>
      </div>

      {(isGeneratingReport || reportGenerationStatus === "Report") && (
        <div className="result-section">
          <ReportExecutionPanel
            currentAgent={reportGenerationStatus}
            isGenerating={isGeneratingReport}
          />
        </div>
      )}

      {showReportPreview && generatedReport && (
        <ReportPreviewModal
          report={generatedReport}
          onClose={() => setShowReportPreview(false)}
          onSave={() => setShowReportPreview(false)}
        />
      )}

      {previewImage && (
        <div className="image-preview-modal" role="dialog" aria-modal="true" onClick={() => setPreviewImage(null)}>
          <div className="image-preview-modal__panel" onClick={(event) => event.stopPropagation()}>
            <button className="image-preview-modal__close" type="button" onClick={() => setPreviewImage(null)}>
              Close
            </button>
            <img src={previewImage.src} alt={previewImage.label} />
            <div>
              <strong>{previewImage.label}</strong>
              {previewImage.prompt && <p>{previewImage.prompt}</p>}
              <a href={previewImage.src} target="_blank" rel="noreferrer">Open original</a>
            </div>
          </div>
        </div>
      )}

      {activeTab === "overview" && (
        <>
          <section className="result-section result-controls" aria-label="Dataset controls">
            <input
              className="result-search"
              placeholder="Search..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />

            {columns.length > 0 && (
              <div className="result-filter-grid">
                {columns.map(col => (
                  <label className="result-field" key={col}>
                    <span>{col}</span>
                    <select
                      value={filters[col] || ""}
                      onChange={(e) =>
                        setFilters(prev => ({ ...prev, [col]: e.target.value }))
                      }
                    >
                      <option value="">All</option>
                      {getUniqueValues(col).map((val, i) => (
                        <option key={i} value={val}>{val}</option>
                      ))}
                    </select>
                  </label>
                ))}
              </div>
            )}

            {numericCols.length > 0 && (
              <div className="result-range-grid">
                {numericCols.map(col => (
                  <div className="result-range-field" key={col}>
                    <span>{col}</span>
                    <input
                      type="number"
                      placeholder="Min"
                      onChange={(e) =>
                        setRangeFilters(prev => ({
                          ...prev,
                          [col]: { ...prev[col], min: e.target.value }
                        }))
                      }
                    />
                    <input
                      type="number"
                      placeholder="Max"
                      onChange={(e) =>
                        setRangeFilters(prev => ({
                          ...prev,
                          [col]: { ...prev[col], max: e.target.value }
                        }))
                      }
                    />
                  </div>
                ))}
              </div>
            )}

            {columns.length > 0 && (
              <div className="result-column-toggles" aria-label="Visible columns">
                {columns.map(col => (
                  <label key={col}>
                    <input
                      type="checkbox"
                      checked={!hiddenCols.includes(col)}
                      onChange={() =>
                        setHiddenCols(prev =>
                          prev.includes(col)
                            ? prev.filter(c => c !== col)
                            : [...prev, col]
                        )
                      }
                    />
                    <span>{col}</span>
                  </label>
                ))}
              </div>
            )}
          </section>

          <section className="result-section result-panel">
            <div className="result-section-header">
              <div>
                <span className="result-section-kicker">Statistics</span>
                <h3>Dataset Overview</h3>
              </div>
              <span>{filteredData.length} filtered rows</span>
            </div>

            <div className="analytics-grid analytics-grid--wide">
              <article className="kpi-card kpi-card--primary">
                <span>Total Rows</span>
                <strong>{filteredData.length}</strong>
                <p>Records matching current filters</p>
              </article>

              {Object.entries(analyticsInsights).slice(0, 5).map(([col, val]) => (
                <article className="kpi-card" key={col}>
                  <span>{col}</span>
                  <strong>{val.avg}</strong>
                  <p>Avg | Max {val.max} | Min {val.min}</p>
                </article>
              ))}

              {topItem && (
                <article className="kpi-card">
                  <span>Top Performer</span>
                  <strong>{formatCellValue(topItem[columns[0]])}</strong>
                  <p>{numericCols[0]}: {formatCellValue(topItem[numericCols[0]])}</p>
                </article>
              )}
            </div>
          </section>

          <section className="agent-results result-section">
            <div className="results-header">
              <div>
                <span className="result-section-kicker">Table</span>
                <h2>Data Table</h2>
              </div>
              <span>{sortedData.length} rows</span>
            </div>

            {sortedData.length > 0 && columns.length > 0 ? (
              <div className="results-table-wrapper">
                <table className="results-table">
                  <thead>
                    <tr>
                      {columns
                        .filter(col => !hiddenCols.includes(col))
                        .map(col => (
                          <th key={col} onClick={() => {
                            setSortKey(col);
                            setAsc(prev => sortKey === col ? !prev : true);
                          }}>
                            {col}
                            {sortKey === col && <span>{asc ? "Asc" : "Desc"}</span>}
                          </th>
                        ))}
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedData.map((row, i) => (
                      <tr key={i}>
                        {columns
                          .filter(col => !hiddenCols.includes(col))
                          .map((col, j) => (
                            <td key={j}>{formatCellValue(row[col])}</td>
                          ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="result-empty-state">No tabular data was returned for this run.</div>
            )}

            {sortedData.length > rowsPerPage && (
              <div className="table-pagination">
                <button type="button" onClick={() => setPage((current) => Math.max(1, current - 1))} disabled={page === 1}>
                  Previous
                </button>
                <span>Page {page} of {totalPages}</span>
                <button type="button" onClick={() => setPage((current) => Math.min(totalPages, current + 1))} disabled={page === totalPages}>
                  Next
                </button>
                <select value={rowsPerPage} onChange={(event) => setRowsPerPage(Number(event.target.value))}>
                  {[10, 25, 50, 100].map((size) => (
                    <option key={size} value={size}>{size} rows</option>
                  ))}
                </select>
              </div>
            )}

            <div className="result-actions">
              <button onClick={downloadCSV} disabled={filteredData.length === 0}>CSV</button>
              <button onClick={exportExcel} disabled={filteredData.length === 0}>Excel</button>
              <button onClick={sendEmailReport} disabled={filteredData.length === 0}>Send Email</button>
              <button onClick={saveDataset}>Save</button>
            </div>
          </section>

          <section className="result-section result-panel">
            <div className="result-section-header">
              <div>
                <span className="result-section-kicker">Analytics</span>
                <h3>Performance Dashboard</h3>
              </div>
              <span>{chartOptions.length} chart views</span>
            </div>

            <div className="analytics-dashboard-grid analytics-dashboard-grid--chart-only">
              {chartOptions.length > 0 && (
                <div className={chartFullscreen ? "analytics-chart-card analytics-chart-card--fullscreen" : "analytics-chart-card"}>
                  <div className="chart-card-topbar">
                    <div>
                      <span className="result-section-kicker">Visualization</span>
                      <strong>{selectedChart?.title || `${activeChartType} chart`}</strong>
                    </div>
                    <div className="chart-actions">
                      <button type="button" onClick={exportChartCSV} disabled={chartData.length === 0}>
                        <Download size={15} />
                        CSV
                      </button>
                      <button type="button" onClick={exportChartSVG} disabled={chartData.length === 0}>
                        <Download size={15} />
                        SVG
                      </button>
                      <button type="button" onClick={() => setChartFullscreen((current) => !current)}>
                        {chartFullscreen ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
                        {chartFullscreen ? "Exit" : "Fullscreen"}
                      </button>
                    </div>
                  </div>

                  <div className="chart-toolbar">
                    <label>
                      <span>Chart Type</span>
                      <select value={chartType} onChange={(e) => setChartType(e.target.value)}>
                        {CHART_TYPE_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>{option.label}</option>
                        ))}
                      </select>
                    </label>

                    <label>
                      <span>{activeChartType === "histogram" ? "Metric" : "X Axis"}</span>
                      <select value={activeXAxisKey} onChange={(e) => setXAxisKey(e.target.value)}>
                      {chartXAxisOptions.map((col) => (
                        <option key={col} value={col}>{col === "__index" ? "Row order" : col}</option>
                      ))}
                      </select>
                    </label>

                    {!["pie", "histogram"].includes(activeChartType) && (
                      <label>
                        <span>Y Axis</span>
                        <select value={activeYAxisKey} onChange={(e) => setYAxisKey(e.target.value)}>
                          {numericCols.map((col) => (
                            <option key={col} value={col}>{col}</option>
                          ))}
                        </select>
                      </label>
                    )}
                  </div>

                  <div className="chart-meta">
                    {chartType === "auto" ? "AUTO" : activeChartType.toUpperCase()} using {activeXAxisKey || "-"}
                    {!["pie", "histogram"].includes(activeChartType) ? ` vs ${activeYAxisKey || "-"}` : ""}
                  </div>

                  <div className="analytics-chart-frame" ref={chartFrameRef}>
                    <ResponsiveContainer width="100%" height="100%">
                      {renderChart()}
                    </ResponsiveContainer>
                  </div>
                </div>
              )}
            </div>

            {chartOptions.length > 1 && (
              <div className="auto-chart-gallery">
                {chartOptions.map((chart, index) => (
                  <article className="auto-chart-card" key={`${chart.type}-${chart.xKey || chart.dataKey}-${chart.yKey || index}`}>
                    <div className="auto-chart-card__header">
                      <span>{chart.type === "horizontalBar" ? "Ranked Bar" : chart.type}</span>
                      <strong>{chart.title}</strong>
                    </div>
                    <div className="auto-chart-frame">
                      <ResponsiveContainer width="100%" height="100%">
                        <MiniAutoChart chart={chart} rows={filteredData} dateCols={dateCols} />
                      </ResponsiveContainer>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>

          <section className="result-section result-panel">
            <div className="result-section-header">
              <div>
                <span className="result-section-kicker">Insights</span>
                <h3>Key Findings</h3>
              </div>
              {!insights && !insightsLoading && (
                <button className="result-soft-btn" onClick={fetchInsights}>
                  Generate Insights
                </button>
              )}
            </div>

            {insightsLoading && <p className="result-muted">Generating insights...</p>}
            {insightsError && <p className="result-error">{insightsError}</p>}
            {insights && insights.length > 0 && (
              <ul className="insights-list">
                {insights.map((insight, i) => (
                  <li key={i}>{insight}</li>
                ))}
              </ul>
            )}
            {!insightsLoading && !insights && !insightsError && (
              <p className="result-muted">Generate AI findings from the filtered table.</p>
            )}
          </section>

          {answerView.summary && (
            <section className="result-section result-panel">
              <div className="result-section-header">
                <div>
                  <span className="result-section-kicker">Summary</span>
                  <h3>Research Summary</h3>
                </div>
                {answerView.summary.length > 280 && (
                  <button
                    className="result-soft-btn"
                    onClick={() => setShowFullSummary((current) => !current)}
                  >
                    {showFullSummary ? "Show Less" : "Read More"}
                  </button>
                )}
              </div>

              <p className={showFullSummary ? "summary-copy" : "summary-copy summary-copy--clamped"}>
                {answerView.summary}
              </p>
            </section>
          )}

          {(normalizedImages.length > 0 || generatedImages.length > 0) && (
            <section className="result-section result-panel">
              <div className="result-section-header">
                <div>
                  <span className="result-section-kicker">Images</span>
                  <h3>Image Gallery</h3>
                </div>
                <div className="result-header-actions">
                  <button className="result-soft-btn" onClick={generateImages} disabled={imageLoading}>
                    {imageLoading ? "Generating..." : "Generate Images"}
                  </button>
                </div>
              </div>

              {imageError && <p className="result-error">{imageError}</p>}

              {normalizedImages.length > 0 && (
                <div className="image-gallery">
                  {displayImages.map((image) => (
                    <button
                      className="image-tile"
                      type="button"
                      onClick={() => setPreviewImage(image)}
                      key={image.src}
                    >
                      <img src={image.src} alt={image.label} loading="lazy" />
                      <span>{image.label}</span>
                    </button>
                  ))}
                </div>
              )}

              {generatedImages.length > 0 && (
                <div className="generated-gallery">
                  {generatedImages.slice(0, 3).map((image) => (
                    <a
                      className="generated-image-card"
                      key={image.id || image.url}
                      href={image.url}
                      target="_blank"
                      rel="noreferrer"
                    >
                      <img src={image.url} alt={image.label} loading="lazy" />
                      <strong>{image.label}</strong>
                      {image.prompt && <span>{image.prompt}</span>}
                    </a>
                  ))}
                </div>
              )}
            </section>
          )}

          <Sources sources={safeResult.sourceUrls || safeResult.sources || []} />
        </>
      )}

      {activeTab === "insights" && (
        <div style={{ padding: "20px 0" }}>
          {insightsLoading && (
            <div style={{ textAlign: "center", padding: "40px" }}>
              <p>Generating insights...</p>
            </div>
          )}

          {insightsError && (
            <div style={{ padding: "16px", background: "rgba(220, 38, 38, 0.1)", borderRadius: "12px", color: "#fca5a5", marginBottom: "16px" }}>
              {insightsError}
            </div>
          )}

          {insights && insights.length > 0 && (
            <div className="glass" style={{ padding: "20px" }}>
              <h3 style={{ marginBottom: "16px" }}>Key Findings</h3>
              <ul style={{ lineHeight: "1.8", paddingLeft: "20px" }}>
                {insights.map((insight, i) => (
                  <li key={i} style={{ marginBottom: "12px", color: "#cbd5e1" }}>
                    {insight}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {!insightsLoading && !insights && (
            <button
              onClick={fetchInsights}
              style={{
                padding: "12px 24px",
                background: "linear-gradient(135deg, rgba(109,40,217,1), rgba(99,102,241,1))",
                color: "white",
                border: "none",
                borderRadius: "12px",
                cursor: "pointer",
                fontWeight: "600"
              }}
            >
              Generate Insights
            </button>
          )}
        </div>
      )}

      {activeTab === "chat" && (
        <div style={{ padding: "20px 0" }}>
          <div style={{
            display: "flex",
            flexDirection: "column",
            gap: "16px",
            height: "500px",
            background: "rgba(255, 255, 255, 0.02)",
            borderRadius: "16px",
            padding: "16px",
            border: "1px solid rgba(109, 40, 217, 0.16)"
          }}>
            <div style={{
              flex: 1,
              overflowY: "auto",
              display: "flex",
              flexDirection: "column",
              gap: "12px"
            }}>
              {chatMessages.length === 0 && (
                <div style={{ color: "#94a3b8", textAlign: "center", paddingTop: "40px" }}>
                  Ask questions about the dataset
                </div>
              )}

              {chatMessages.map((msg, i) => (
                <div
                  key={i}
                  style={{
                    alignSelf: msg.role === "user" ? "flex-end" : "flex-start",
                    maxWidth: "70%",
                    padding: "12px 16px",
                    borderRadius: "12px",
                    background: msg.role === "user"
                      ? "rgba(109, 40, 217, 0.3)"
                      : "rgba(255, 255, 255, 0.08)",
                    color: "#cbd5e1",
                    wordWrap: "break-word"
                  }}
                >
                  {msg.content}
                </div>
              ))}

              {chatLoading && (
                <div style={{ color: "#94a3b8", fontStyle: "italic" }}>
                  Thinking...
                </div>
              )}
            </div>

            {chatError && (
              <div style={{ color: "#fca5a5", fontSize: "13px" }}>
                {chatError}
              </div>
            )}

            <div style={{ display: "flex", gap: "12px" }}>
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && !chatLoading && sendChatMessage()}
                placeholder="Ask a question..."
                disabled={chatLoading}
                style={{
                  flex: 1,
                  padding: "10px 14px",
                  border: "1px solid rgba(109, 40, 217, 0.16)",
                  borderRadius: "8px",
                  background: "rgba(255, 255, 255, 0.04)",
                  color: "#f8fafc",
                  fontSize: "14px"
                }}
              />
              <button
                onClick={sendChatMessage}
                disabled={chatLoading || !chatInput.trim()}
                style={{
                  padding: "10px 20px",
                  background: "rgba(109, 40, 217, 0.8)",
                  color: "white",
                  border: "none",
                  borderRadius: "8px",
                  cursor: chatLoading ? "not-allowed" : "pointer",
                  fontWeight: "600",
                  opacity: chatLoading ? 0.5 : 1
                }}
              >
                Send
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

function MiniAutoChart({ chart, rows, dateCols = [] }) {
  const type = chart?.type || "bar";
  const xKey = chart?.xKey || chart?.dataKey || "__index";
  const yKey = chart?.yKey || chart?.valueKey || "value";
  const colors = ["#38bdf8", "#22c55e", "#f59e0b", "#ef4444", "#a78bfa", "#14b8a6"];

  const data = (() => {
    if (!Array.isArray(rows) || rows.length === 0) return [];

    if (type === "pie") {
      return aggregatePieCounts(rows, chart.dataKey);
    }

    if (type === "histogram") {
      return buildHistogramBins(rows, chart.dataKey || chart.yKey);
    }

    if (type === "scatter") {
      return buildScatterData(rows, chart.xKey, chart.yKey);
    }

    if ((type === "bar" || type === "horizontalBar" || type === "area") && xKey !== "__index" && !dateCols.includes(xKey)) {
      return aggregateNumericByCategory(rows, xKey, yKey);
    }

    return rows
      .map((row, index) => ({
        ...row,
        __index: index + 1,
        [xKey]: xKey === "__index" ? index + 1 : row[xKey],
        [yKey]: Number(row[yKey])
      }))
      .filter((row) => !Number.isNaN(row[yKey]))
      .slice(0, 40);
  })();

  if (data.length === 0) {
    return <div className="mini-chart-empty">No chart data</div>;
  }

  if (type === "pie") {
    return (
      <PieChart>
        <Tooltip />
        <Pie data={data} dataKey="value" nameKey="name" outerRadius={72}>
          {data.map((_, index) => (
            <Cell key={index} fill={colors[index % colors.length]} />
          ))}
        </Pie>
      </PieChart>
    );
  }

  if (type === "line") {
    return (
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
        <XAxis dataKey={xKey} hide />
        <YAxis hide />
        <Tooltip />
        <Line type="monotone" dataKey={yKey} stroke="#38bdf8" strokeWidth={2} dot={false} />
      </LineChart>
    );
  }

  if (type === "area") {
    return (
      <AreaChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
        <XAxis dataKey={xKey} hide />
        <YAxis hide />
        <Tooltip />
        <Area type="monotone" dataKey={yKey} stroke="#a78bfa" fill="#7c3aed" fillOpacity={0.32} />
      </AreaChart>
    );
  }

  if (type === "histogram") {
    return (
      <BarChart data={data}>
        <XAxis dataKey="range" hide />
        <YAxis hide />
        <Tooltip />
        <Bar dataKey="value" fill="#a78bfa" />
      </BarChart>
    );
  }

  if (type === "scatter") {
    return (
      <ScatterChart>
        <XAxis dataKey={chart.xKey} type="number" hide />
        <YAxis dataKey={chart.yKey} type="number" hide />
        <Tooltip cursor={{ strokeDasharray: "3 3" }} />
        <Scatter data={data} fill="#38bdf8" />
      </ScatterChart>
    );
  }

  if (type === "horizontalBar") {
    return (
      <BarChart data={data} layout="vertical" margin={{ left: 4 }}>
        <XAxis type="number" hide />
        <YAxis dataKey={xKey} type="category" hide />
        <Tooltip />
        <Bar dataKey={yKey} fill="#a78bfa" />
      </BarChart>
    );
  }

  return (
    <BarChart data={data}>
      <XAxis dataKey={xKey} hide />
      <YAxis hide />
      <Tooltip />
      <Bar dataKey={yKey} fill="#38bdf8" />
    </BarChart>
  );
}

function formatAnswer(answer) {
  const fallback = "No written answer was returned for this run.";
  const rawText = typeof answer === "string" ? answer.trim() : fallback;
  const lines = rawText
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(Boolean);

  if (lines.length === 0) {
    return {
      summary: fallback,
      highlights: [],
      sections: []
    };
  }

  const bulletPattern = /^[-*•]\s+/;
  const highlights = lines
    .filter(line => bulletPattern.test(line))
    .map(line => line.replace(bulletPattern, "").trim())
    .slice(0, 4);

  const proseLines = lines.filter(line => !bulletPattern.test(line));
  const summary = stripHeadingMarker(proseLines[0] || highlights[0] || fallback);
  const sections = [];
  let currentSection = { title: "", paragraphs: [] };

  proseLines.slice(1).forEach(line => {
    const normalizedLine = stripHeadingMarker(line);
    const isMarkdownHeading = /^#{1,4}\s+/.test(line);
    const looksLikeHeading =
      normalizedLine.length < 70 &&
      !/[.!?]$/.test(normalizedLine) &&
      proseLines.length > 2;

    if (isMarkdownHeading || looksLikeHeading) {
      if (currentSection.paragraphs.length > 0 || currentSection.title) {
        sections.push(currentSection);
      }
      currentSection = { title: normalizedLine, paragraphs: [] };
      return;
    }

    currentSection.paragraphs.push(normalizedLine);
  });

  if (currentSection.paragraphs.length > 0 || currentSection.title) {
    sections.push(currentSection);
  }

  return {
    summary,
    highlights,
    sections
  };
}

function stripHeadingMarker(text) {
  return text.replace(/^#{1,4}\s+/, "").trim();
}

function normalizeRows(value) {
  if (Array.isArray(value)) {
    return value.filter(row => row && typeof row === "object" && !Array.isArray(row));
  }

  if (typeof value === "string") {
    try {
      return normalizeRows(JSON.parse(value));
    } catch {
      return [];
    }
  }

  if (value && typeof value === "object") {
    for (const key of ["data", "items", "results", "rows", "table"]) {
      if (Array.isArray(value[key])) {
        return normalizeRows(value[key]);
      }
    }
  }

  return [];
}
