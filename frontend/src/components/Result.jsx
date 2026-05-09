import axios from "axios";
import { useState } from "react";
import Sources from "./Sources";
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

  if (!result) return null;

  const data = normalizeRows(result.data);
  const columns = [...new Set(data.flatMap(obj => Object.keys(obj)))];
  const answerView = formatAnswer(result.answer);

  let filteredData = data.filter(row =>
    Object.values(row).some(val =>
      val?.toString().toLowerCase().includes(search.toLowerCase())
    )
  );

  filteredData = filteredData.filter(row =>
    Object.entries(filters).every(([col, val]) =>
      !val || row[col]?.toString() === val
    )
  );

  filteredData = filteredData.filter(row =>
    Object.entries(rangeFilters).every(([col, range]) => {
      if (!range) return true;

      const value = parseFloat(row[col]);
      if (isNaN(value)) return true;

      return value >= (range.min || -Infinity) &&
        value <= (range.max || Infinity);
    })
  );

  const numericCols = columns.filter(col =>
    data.some(row => !isNaN(parseFloat(row[col])))
  );

  if (sortKey) {
    filteredData.sort((a, b) => {
      const valA = a[sortKey] || "";
      const valB = b[sortKey] || "";

      if (!isNaN(valA) && !isNaN(valB)) {
        return asc ? valA - valB : valB - valA;
      }

      return asc
        ? valA.toString().localeCompare(valB.toString())
        : valB.toString().localeCompare(valA.toString());
    });
  }

  const getUniqueValues = (col) =>
    [...new Set(data.map(row => row[col]).filter(Boolean))];

  const downloadCSV = async () => {
    const res = await axios.post(
      "http://localhost:5000/api/download-csv",
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
      "http://localhost:5000/api/download-excel",
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
      await axios.post("http://localhost:5000/api/dataset/save", {
        query: result.query || result.answer,
        answer: result.answer,
        data,
        sources: result.sources || [],
        sourceUrls: result.sourceUrls || result.sources || [],
        tables: result.tables || [],
        images: result.images || [],
        text: result.text || "",
        charts: result.charts || []
      });

      alert("Dataset saved!");
    } catch (err) {
      console.log("Save error:", err);
    }
  };

  const generateImages = async () => {
    setImageLoading(true);
    setImageError("");

    try {
      const res = await axios.post("http://localhost:5000/api/generate-images", {
        answer: result.answer,
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

  const selectedXKey = columns.includes(xAxisKey) ? xAxisKey : columns[0];
  const selectedYKey = numericCols.includes(yAxisKey) ? yAxisKey : numericCols[0];
  const chartData = filteredData.slice(0, 10).map(row => ({
    ...row,
    [selectedXKey]: row[selectedXKey] ?? "N/A",
    [selectedYKey]: Number.parseFloat(row[selectedYKey]) || 0
  }));
  const chartColors = ["#38bdf8", "#22c55e", "#f59e0b", "#ef4444", "#a78bfa", "#14b8a6"];

  const renderChart = () => {
    if (chartType === "line") {
      return (
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.12)" />
          <XAxis dataKey={selectedXKey} />
          <YAxis />
          <Tooltip />
          <Legend />
          <Line type="monotone" dataKey={selectedYKey} stroke="#38bdf8" strokeWidth={2} />
        </LineChart>
      );
    }

    if (chartType === "pie") {
      return (
        <PieChart>
          <Tooltip />
          <Legend />
          <Pie
            data={chartData}
            dataKey={selectedYKey}
            nameKey={selectedXKey}
            outerRadius={100}
            label
          >
            {chartData.map((_, index) => (
              <Cell key={index} fill={chartColors[index % chartColors.length]} />
            ))}
          </Pie>
        </PieChart>
      );
    }

    return (
      <BarChart data={chartData}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.12)" />
        <XAxis dataKey={selectedXKey} />
        <YAxis />
        <Tooltip />
        <Legend />
        <Bar dataKey={selectedYKey} fill="#38bdf8" />
      </BarChart>
    );
  };

  return (
    <div className="result-workspace">

      <div className="answer-panel">
        <div className="answer-panel__header">
          <div>
            <span className="answer-panel__eyebrow">Answer</span>
            <h2>{result.query || "Research summary"}</h2>
          </div>

          <div className="answer-panel__stats" aria-label="Answer statistics">
            <span>{data.length} rows</span>
            <span>{result.sources?.length || 0} sources</span>
          </div>
        </div>

        <div className="answer-panel__content">
          <section className="answer-summary" aria-label="Summary">
            <span className="answer-summary__label">Summary</span>
            <p>{answerView.summary}</p>
          </section>

          {answerView.highlights.length > 0 && (
            <section className="answer-section">
              <h3>Highlights</h3>
              <div className="answer-highlight-grid">
                {answerView.highlights.map((item, index) => (
                  <article className="answer-highlight" key={`${item}-${index}`}>
                    <span>{String(index + 1).padStart(2, "0")}</span>
                    <p>{item}</p>
                  </article>
                ))}
              </div>
            </section>
          )}

          {answerView.sections.map((section, index) => (
            <section className="answer-section" key={`${section.title}-${index}`}>
              {section.title && <h3>{section.title}</h3>}
              {section.paragraphs.map((paragraph, paragraphIndex) => (
                <p key={`${paragraph}-${paragraphIndex}`}>{paragraph}</p>
              ))}
            </section>
          ))}
        </div>
      </div>

      <Sources sources={result.sources} />

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

      {numericCols.length > 0 && (
        <div style={{ marginTop: "20px" }}>
          <h3>Graphs</h3>
          <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", marginBottom: "12px" }}>
            <select value={chartType} onChange={(e) => setChartType(e.target.value)}>
              <option value="bar">Bar chart</option>
              <option value="line">Line chart</option>
              <option value="pie">Pie chart</option>
            </select>

            <select value={selectedXKey} onChange={(e) => setXAxisKey(e.target.value)}>
              {columns.map(col => (
                <option key={col} value={col}>{col}</option>
              ))}
            </select>

            <select value={selectedYKey} onChange={(e) => setYAxisKey(e.target.value)}>
              {numericCols.map(col => (
                <option key={col} value={col}>{col}</option>
              ))}
            </select>
          </div>

          <div style={{ height: 300 }}>
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
            {generatedImages.map((image) => (
              <div
                key={image.id}
                style={{
                  background: "rgba(255,255,255,0.06)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: "8px",
                  overflow: "hidden"
                }}
              >
                <img
                  src={image.url}
                  alt={image.label}
                  loading="lazy"
                  style={{
                    display: "block",
                    width: "100%",
                    aspectRatio: "4 / 3",
                    objectFit: "cover",
                    background: "#1e293b"
                  }}
                />

                <div style={{ padding: "10px" }}>
                  <strong>{image.label}</strong>
                  <p style={{
                    color: "#94a3b8",
                    fontSize: "12px",
                    lineHeight: 1.4,
                    marginTop: "6px"
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

      <div style={{ marginTop: "20px" }}>

        <div style={{ display: "flex", gap: "10px", marginBottom: "10px" }}>
          <button onClick={downloadCSV}>CSV</button>
          <button onClick={exportExcel}>Excel</button>
          <button onClick={saveDataset}>Save</button>
        </div>

        <table style={{ width: "100%" }}>
          <thead>
            <tr>
              {columns
                .filter(col => !hiddenCols.includes(col))
                .map(col => (
                  <th key={col} onClick={() => {
                    setSortKey(col);
                    setAsc(prev => !prev);
                  }}>
                    {col} Sort
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
                    <td key={j}>{row[col] || "-"}</td>
                  ))}
              </tr>
            ))}
          </tbody>
        </table>

      </div>

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
