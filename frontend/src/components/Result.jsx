import axios from "axios";
import { useState, useMemo, useCallback } from "react";
import {
  BarChart,
  Bar,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import Sources from "./Sources";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api";

export default function Result({ result }) {
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState({});
  const [rangeFilters, setRangeFilters] = useState({});
  const [hiddenCols, setHiddenCols] = useState([]);
  const [sortKey, setSortKey] = useState(null);
  const [asc, setAsc] = useState(true);
  const [chartType, setChartType] = useState("bar");
  const [xAxisKey, setXAxisKey] = useState("");
  const [yAxisKey, setYAxisKey] = useState("");
  const [generatedImages, setGeneratedImages] = useState([]);
  const [imageLoading, setImageLoading] = useState(false);
  const [imageError, setImageError] = useState("");
  const [showAllImages, setShowAllImages] = useState(false);
  const [showFullSummary, setShowFullSummary] = useState(false);

  const safeResult = result && typeof result === "object" && !Array.isArray(result) ? result : {};

  const normalizeArrayField = (value) => {
    if (Array.isArray(value)) return value;
    if (typeof value === "string") {
      try {
        const parsed = JSON.parse(value);
        return Array.isArray(parsed) ? parsed : [value];
      } catch {
        return [value];
      }
    }
    return [];
  };

  const normalizeTextField = (value) => {
    if (typeof value === "string") return value;
    if (Array.isArray(value)) return value.filter(Boolean).map(String).join("\n\n");
    if (value && typeof value === "object") {
      return Object.entries(value)
        .map(([key, item]) => `${key}: ${typeof item === "object" ? JSON.stringify(item) : String(item)}`)
        .join("\n\n");
    }
    return "";
  };

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
      label: String(image.label || image.title || "Image").trim(),
      prompt: String(image.prompt || "").trim()
    };
  };

  const normalizedImages = useMemo(() => {
    if (!Array.isArray(safeResult.images)) return [];

    const seen = new Set();
    return safeResult.images
      .map(getImageItem)
      .filter((item) => item && isValidImageUrl(item.src))
      .filter((item) => {
        if (seen.has(item.src)) return false;
        seen.add(item.src);
        return true;
      });
  }, [safeResult.images]);

  const displayImages = useMemo(() => {
    return showAllImages
      ? normalizedImages.slice(0, 8)
      : normalizedImages.slice(0, 4);
  }, [normalizedImages, showAllImages]);

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

  const hasValidTableRows = (table) => {
    const rows = normalizeTableRows(table);
    return Array.isArray(rows) && rows.length > 0 && rows.some(isValidHistoryItem);
  };

  const validTables = useMemo(() => {
    if (!Array.isArray(safeResult.tables)) return [];
    return safeResult.tables.filter((table) =>
      isValidHistoryItem(table) && hasValidTableRows(table)
    );
  }, [safeResult.tables, isValidHistoryItem]);

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
    () => columns.filter((col) =>
      data.some((row) => !isNaN(parseFloat(row[col])))
    ),
    [columns, data]
  );

  const chartOptions = useMemo(() => {
    if (validCharts.length > 0) {
      return validCharts;
    }

    if (data.length === 0) return [];

    const sample = data[0] || {};
    const numericKeys = [];
    const categoricalKeys = [];

    Object.keys(sample).forEach((key) => {
      const value = sample[key];
      if (typeof value === "number" || (!isNaN(parseFloat(value)) && value !== "")) {
        numericKeys.push(key);
      } else {
        categoricalKeys.push(key);
      }
    });

    const suggestions = [];

    if (categoricalKeys.length > 0 && numericKeys.length > 0) {
      suggestions.push({
        type: "bar",
        title: `${numericKeys[0]} by ${categoricalKeys[0]}`,
        xKey: categoricalKeys[0],
        yKey: numericKeys[0]
      });
    }

    if (categoricalKeys.length > 0) {
      suggestions.push({
        type: "pie",
        title: `${categoricalKeys[0]} Distribution`,
        dataKey: categoricalKeys[0]
      });
    }

    if (numericKeys.length > 0) {
      suggestions.push({
        type: "line",
        title: `${numericKeys[0]} Trend`,
        xKey: categoricalKeys[0] || "index",
        yKey: numericKeys[0]
      });
    }

    return suggestions;
  }, [validCharts, data]);

  const activeChartType = chartOptions.some((chart) => chart.type === chartType)
    ? chartType
    : chartOptions[0]?.type || "bar";

  const selectedChart = useMemo(() => {
    if (!chartOptions.length) return null;
    return chartOptions.find((chart) => chart.type === activeChartType) || chartOptions[0];
  }, [chartOptions, activeChartType]);

  const activeXAxisKey = activeChartType === "pie"
    ? selectedChart?.dataKey || xAxisKey || columns[0] || ""
    : selectedChart?.xKey || xAxisKey || columns[0] || "";
  const activeYAxisKey = selectedChart?.yKey || yAxisKey || numericCols[0] || "";

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

    return filteredData.reduce((acc, row) => {
      const label = String(row[activeXAxisKey] ?? "Unknown");
      if (!label) return acc;

      const existing = acc.find((item) => item.name === label);
      if (existing) {
        existing.value += 1;
      } else {
        acc.push({ name: label, value: 1 });
      }
      return acc;
    }, []);
  }, [filteredData, activeChartType, activeXAxisKey]);

  const chartData = useMemo(() => {
    if (activeChartType === "pie") return pieData;
    if (!activeXAxisKey || !activeYAxisKey) return [];

    return filteredData.map((row, index) => ({
      ...row,
      __index: index,
      [activeXAxisKey]: row[activeXAxisKey],
      [activeYAxisKey]: Number(row[activeYAxisKey])
    }));
  }, [filteredData, activeChartType, activeXAxisKey, activeYAxisKey, pieData]);

  if (sortKey) {
    filteredData.sort((a, b) => {
      const valA = a[sortKey] ?? "";
      const valB = b[sortKey] ?? "";

      if (!isNaN(valA) && !isNaN(valB)) {
        return asc ? valA - valB : valB - valA;
      }

      return asc
        ? String(valA).localeCompare(String(valB))
        : String(valB).localeCompare(String(valA));
    });
  }

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
      { data: filteredData },
      { responseType: "blob" }
    ).then((res) => {
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement("a");
      link.href = url;
      link.download = "dataset.xlsx";
      link.click();
      window.URL.revokeObjectURL(url);
    });
  };

  const saveDataset = async () => {
    try {
      await axios.post(`${API_BASE_URL}/dataset/save`, {
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

  const getNumericValues = (col) =>
    filteredData
      .map(row => parseFloat(row[col]))
      .filter(v => !isNaN(v));

  const insights = {};

  numericCols.forEach(col => {
    const values = getNumericValues(col);

    if (values.length > 0) {
      const sum = values.reduce((a, b) => a + b, 0);
      insights[col] = {
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

  const cardStyle = {
    background: "rgba(255,255,255,0.08)",
    padding: "12px",
    borderRadius: "10px",
    minWidth: "120px"
  };

  const controlRowStyle = {
    display: "flex",
    flexWrap: "wrap",
    gap: "10px",
    alignItems: "center"
  };

  const tableCardStyle = {
    background: "rgba(255,255,255,0.08)",
    border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: "14px",
    padding: "16px",
    minWidth: "260px",
    maxWidth: "100%",
    overflowX: "auto"
  };

  const chartColors = ["#38bdf8", "#22c55e", "#f59e0b", "#ef4444", "#a78bfa", "#14b8a6"];

  const renderTablePreview = (table, index) => {
    const rows = normalizeTableRows(table);
    const title = table?.title || table?.name || `Table ${index + 1}`;

    let headers = [];
    if (rows.length > 0) {
      if (typeof rows[0] === "object" && !Array.isArray(rows[0])) {
        headers = Object.keys(rows[0]);
      } else if (Array.isArray(rows[0])) {
        headers = rows[0].map((_, colIndex) => `col_${colIndex + 1}`);
      } else {
        headers = ["value"];
      }
    }

    return (
      <div className="table-preview-card" style={tableCardStyle} key={index}>
        <h4>{title}</h4>
        {rows.length > 0 ? (
          <table>
            <thead>
              <tr>
                {headers.map((header) => (
                  <th key={header}>{header}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.slice(0, 2).map((row, rowIndex) => (
                <tr key={rowIndex}>
                  {headers.map((header, colIndex) => {
                    let cellValue = "-";

                    if (typeof row === "object" && !Array.isArray(row)) {
                      cellValue = row[header];
                    } else if (Array.isArray(row)) {
                      cellValue = row[colIndex];
                    } else {
                      cellValue = row;
                    }

                    return <td key={header}>{formatCellValue(cellValue)}</td>;
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div style={{ color: "#94a3b8", fontSize: "14px" }}>
            No table preview available.
          </div>
        )}
      </div>
    );
  };

  const renderChart = () => {
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

      <input
        placeholder="Search..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        style={{ width: "100%", padding: "10px", marginBottom: "10px" }}
      />

      <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
        {columns.map(col => (
          <select
            key={col}
            value={filters[col] || ""}
            onChange={(e) =>
              setFilters(prev => ({ ...prev, [col]: e.target.value }))
            }
          >
            <option value="">{col}</option>
            {getUniqueValues(col).map((val, i) => (
              <option key={i} value={val}>{val}</option>
            ))}
          </select>
        ))}
      </div>

      <div style={{ marginTop: "10px", display: "flex", gap: "10px", flexWrap: "wrap" }}>
        {numericCols.map(col => (
          <div key={col}>
            <label>{col}</label><br />
            <input
              type="number"
              placeholder="min"
              onChange={(e) =>
                setRangeFilters(prev => ({
                  ...prev,
                  [col]: { ...prev[col], min: e.target.value }
                }))
              }
              style={{ width: "70px" }}
            />
            <input
              type="number"
              placeholder="max"
              onChange={(e) =>
                setRangeFilters(prev => ({
                  ...prev,
                  [col]: { ...prev[col], max: e.target.value }
                }))
              }
              style={{ width: "70px" }}
            />
          </div>
        ))}
      </div>

      <div style={{ marginTop: "10px" }}>
        {columns.map(col => (
          <label key={col} style={{ marginRight: "10px" }}>
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
            {col}
          </label>
        ))}
      </div>

      {filteredData.length > 0 && (
        <div className="glass" style={{ marginTop: "20px", padding: "15px" }}>
          <h3>Insights Dashboard</h3>

          <div style={{ display: "flex", gap: "15px", flexWrap: "wrap" }}>
            <div style={cardStyle}>
              <h4>Total</h4>
              <p>{filteredData.length}</p>
            </div>

            {Object.entries(insights).map(([col, val]) => (
              <div key={col} style={cardStyle}>
                <h4>{col}</h4>
                <p>Avg: {val.avg}</p>
                <p>Max: {val.max}</p>
                <p>Min: {val.min}</p>
              </div>
            ))}
          </div>

          {topItem && (
            <div style={{ marginTop: "10px" }}>
              <h4>Top Performer</h4>
              <p>
                {columns[0]}: <b>{topItem[columns[0]]}</b> ({numericCols[0]}: {topItem[numericCols[0]]})
              </p>
            </div>
          )}
        </div>
      )}

      {chartOptions.length > 0 && (
        <div style={{ marginTop: "20px" }}>
          <h3>Charts</h3>

          <div style={controlRowStyle}>
            <label>
              Chart
              <select value={activeChartType} onChange={(e) => setChartType(e.target.value)}>
                {chartOptions.map((chart) => (
                  <option key={chart.type} value={chart.type}>{chart.title}</option>
                ))}
              </select>
            </label>

            <label>
              X Axis
              <select value={activeXAxisKey} onChange={(e) => setXAxisKey(e.target.value)}>
                {columns.map((col) => (
                  <option key={col} value={col}>{col}</option>
                ))}
              </select>
            </label>

            {activeChartType !== "pie" && (
              <label>
                Y Axis
                <select value={activeYAxisKey} onChange={(e) => setYAxisKey(e.target.value)}>
                  {numericCols.map((col) => (
                    <option key={col} value={col}>{col}</option>
                  ))}
                </select>
              </label>
            )}
          </div>

          <div style={{ marginBottom: "10px", color: "#94a3b8" }}>
            Showing {activeChartType.toUpperCase()} using {activeXAxisKey || "-"}
            {activeChartType !== "pie" ? ` vs ${activeYAxisKey || "-"}` : ""}
          </div>

          <div style={{ height: 320 }}>
            <ResponsiveContainer width="100%" height="100%">
              {renderChart()}
            </ResponsiveContainer>
          </div>
        </div>
      )}

      <div className="glass" style={{ marginTop: "20px", padding: "15px" }}>
        <div style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: "12px",
          flexWrap: "wrap"
        }}>
          <h3 style={{ margin: 0 }}>Related Images</h3>
          <button onClick={generateImages} disabled={imageLoading}>
            {imageLoading ? "Generating..." : "Generate Images"}
          </button>
        </div>

        {imageError && (
          <p style={{ color: "#fca5a5", marginBottom: 0 }}>{imageError}</p>
        )}

        {generatedImages.length > 0 && (
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: "14px",
            marginTop: "15px"
          }}>
            {generatedImages.slice(0, 3).map((image) => (
              <div
                key={image.id || image.url}
                style={{
                  background: "rgba(255,255,255,0.06)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: "12px",
                  overflow: "hidden",
                  maxHeight: "260px"
                }}
              >
                <img
                  src={image.url}
                  alt={image.label}
                  loading="lazy"
                  style={{
                    display: "block",
                    width: "100%",
                    height: "180px",
                    objectFit: "cover",
                    background: "#1e293b"
                  }}
                />

                <div style={{ padding: "12px" }}>
                  <strong>{image.label}</strong>
                  <p style={{
                    color: "#94a3b8",
                    fontSize: "12px",
                    lineHeight: 1.4,
                    marginTop: "6px",
                    maxHeight: "3.2em",
                    overflow: "hidden",
                    textOverflow: "ellipsis"
                  }}>
                    {image.prompt}
                  </p>
                  <a
                    href={image.url}
                    target="_blank"
                    rel="noreferrer"
                    style={{ color: "#38bdf8", fontSize: "13px" }}
                  >
                    Open image
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="agent-results" style={{ marginTop: "20px" }}>
        <div className="results-header">
          <h2>Data Table</h2>
          <span>{filteredData.length} rows</span>
        </div>

        <div className="results-table-wrapper" style={{ marginBottom: "16px" }}>
          <table className="results-table">
            <thead>
              <tr>
                {columns
                  .filter(col => !hiddenCols.includes(col))
                  .map(col => (
                    <th key={col} onClick={() => {
                      setSortKey(col);
                      setAsc(prev => !prev);
                    }}>
                      {col}
                    </th>
                  ))}
              </tr>
            </thead>
            <tbody>
              {filteredData.map((row, i) => (
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

        <div style={{ display: "flex", gap: "10px", marginBottom: "10px" }}>
          <button onClick={downloadCSV}>CSV</button>
          <button onClick={exportExcel}>Excel</button>
          <button onClick={saveDataset}>Save</button>
        </div>
      </div>

      {answerView.summary && (
        <div className="glass" style={{ marginTop: "20px", padding: "16px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: "12px", flexWrap: "wrap" }}>
            <div style={{ minWidth: 0 }}>
              <h3 style={{ marginBottom: "10px" }}>Summary</h3>
              <p style={{
                margin: 0,
                lineHeight: 1.7,
                color: "#cbd5e1",
                display: "-webkit-box",
                WebkitLineClamp: showFullSummary ? "none" : 4,
                WebkitBoxOrient: "vertical",
                overflow: "hidden"
              }}>
                {answerView.summary}
              </p>
            </div>
            {answerView.summary.length > 280 && (
              <button
                onClick={() => setShowFullSummary((current) => !current)}
                style={{
                  background: "rgba(124, 58, 237, 0.12)",
                  border: "1px solid rgba(124, 58, 237, 0.25)",
                  color: "#c4b5fd",
                  padding: "10px 16px",
                  borderRadius: "999px",
                  cursor: "pointer",
                  whiteSpace: "nowrap"
                }}
              >
                {showFullSummary ? "Show Less" : "Read More"}
              </button>
            )}
          </div>
        </div>
      )}

      {normalizedImages.length > 0 && (
        <div className="glass" style={{ marginTop: "20px", padding: "16px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
            <h3 style={{ margin: 0 }}>Images</h3>
            {normalizedImages.length > 4 && (
              <button
                onClick={() => setShowAllImages((current) => !current)}
                style={{
                  background: "rgba(124, 58, 237, 0.12)",
                  border: "1px solid rgba(124, 58, 237, 0.25)",
                  color: "#c4b5fd",
                  padding: "10px 16px",
                  borderRadius: "999px",
                  cursor: "pointer"
                }}
              >
                {showAllImages ? "Show Less" : `Show ${normalizedImages.length - 4} More`}
              </button>
            )}
          </div>

          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
            gap: "14px",
            marginTop: "16px"
          }}>
            {displayImages.map((image, index) => (
              <div
                key={image.src}
                style={{
                  borderRadius: "16px",
                  overflow: "hidden",
                  background: "rgba(255,255,255,0.05)",
                  border: "1px solid rgba(255,255,255,0.08)",
                  boxShadow: "0 8px 20px rgba(0,0,0,0.08)",
                  minHeight: "220px"
                }}
              >
                <div style={{ overflow: "hidden" }}>
                  <img
                    src={image.src}
                    alt={image.label}
                    loading="lazy"
                    style={{
                      width: "100%",
                      height: "180px",
                      objectFit: "cover",
                      transition: "transform 0.3s ease",
                      display: "block"
                    }}
                    onMouseOver={(e) => e.currentTarget.style.transform = "scale(1.03)"}
                    onMouseOut={(e) => e.currentTarget.style.transform = "scale(1)"}
                  />
                </div>
                <div style={{ padding: "12px" }}>
                  <strong style={{ display: "block", marginBottom: "8px" }}>{image.label}</strong>
                  {image.prompt && (
                    <p style={{
                      margin: 0,
                      color: "#94a3b8",
                      fontSize: "13px",
                      lineHeight: 1.5,
                      maxHeight: "3.6em",
                      overflow: "hidden",
                      textOverflow: "ellipsis"
                    }}>{image.prompt}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <Sources sources={safeResult.sources || []} />

    </div>
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
