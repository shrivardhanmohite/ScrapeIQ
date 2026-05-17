import {
  History as HistoryIcon,
  Database,
  Calendar,
  Globe
} from "lucide-react";

import {
  useEffect,
  useState,
  useCallback
} from "react";

import axios from "axios";
import Result from "../components/Result";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api";

export default function History() {

  const [datasets, setDatasets] = useState([]);

  const [selectedDataset, setSelectedDataset] = useState(null);

  const [selectedDatasetId, setSelectedDatasetId] = useState(null);

  const [detailLoading, setDetailLoading] = useState(false);

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState("");

  /* =========================================
     FETCH HISTORY
  ========================================= */

  const fetchHistory = useCallback(async () => {

    setLoading(true);
    setError("");

    try {

      const response = await axios.get(
        `${API_BASE_URL}/dataset/all`
      );

      setDatasets(response.data || []);

    } catch (err) {

      console.error("History fetch failed:", err);
      setError(err.response?.data?.message || err.message || "Failed to load history.");

    } finally {

      setLoading(false);
    }

  } , []);

  const normalizeRows = (value) => {
    if (Array.isArray(value)) {
      return value.filter((row) => row && typeof row === "object" && !Array.isArray(row));
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
  };

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

  const normalizeHistoryDataset = (dataset) => {
    if (!dataset || typeof dataset !== "object") {
      console.warn("Malformed history dataset passed to normalizeHistoryDataset:", dataset);
      return null;
    }

    return {
      _id: dataset._id,
      query: dataset.query || dataset.answer || "History dataset",
      answer: normalizeTextField(dataset.answer),
      data: normalizeRows(dataset.data),
      sources: normalizeArrayField(dataset.sources),
      sourceUrls: normalizeArrayField(dataset.sourceUrls || dataset.sources),
      tables: normalizeArrayField(dataset.tables),
      images: normalizeArrayField(dataset.images),
      text: normalizeTextField(dataset.text),
      charts: normalizeArrayField(dataset.charts),
      metadata: dataset.metadata && typeof dataset.metadata === "object" ? dataset.metadata : {},
      createdAt: dataset.createdAt,
      updatedAt: dataset.updatedAt
    };
  };

  const fetchDatasetById = useCallback(async (id) => {
    if (!id) return;

    setDetailLoading(true);

    try {
      const response = await axios.get(`${API_BASE_URL}/dataset/${id}`);

      const normalized = normalizeHistoryDataset(response.data);

      if (!normalized) {
        console.warn("Dataset fetch returned malformed object:", response.data);
        setSelectedDataset(null);
        setSelectedDatasetId(null);
        window.localStorage.removeItem("selectedHistoryDatasetId");
        return;
      }

      setSelectedDataset(normalized);
      setSelectedDatasetId(id);
      window.localStorage.setItem("selectedHistoryDatasetId", id);
    } catch (err) {
      console.error("Failed to load selected history dataset:", err);
      setSelectedDataset(null);
      setSelectedDatasetId(null);
      window.localStorage.removeItem("selectedHistoryDatasetId");
    } finally {
      setDetailLoading(false);
    }
  }, []);

  const handleSelectDataset = async (dataset) => {
    if (!dataset || !dataset._id) {
      console.warn("History card clicked with invalid dataset:", dataset);
      return;
    }

    setSelectedDatasetId(dataset._id);
    await fetchDatasetById(dataset._id);
  };

  useEffect(() => {
    const loadSelectedDataset = async () => {
      const storedId = window.localStorage.getItem("selectedHistoryDatasetId");
      if (storedId) {
        await fetchDatasetById(storedId);
      }
    };

    loadSelectedDataset();
  }, [fetchDatasetById]);

  /* =========================================
     EFFECT
  ========================================= */

  useEffect(() => {

    let isMounted = true;

    const loadHistory = async () => {
      if (!isMounted) return;
      await fetchHistory();
    };

    loadHistory();

    const refreshHistory = () => {
      loadHistory();
    };

    window.addEventListener(
      "datasetSaved",
      refreshHistory
    );

    return () => {
      isMounted = false;
      window.removeEventListener(
        "datasetSaved",
        refreshHistory
      );
    };

  }, [fetchHistory]);

  return (

    <div className="history-page">

      {/* HERO */}

      <section className="history-hero">

        <span className="eyebrow">

          <HistoryIcon size={15} />

          Dataset History

        </span>

        <h1>
          Previous scraping datasets.
        </h1>

        <p>
          Browse saved scraping runs,
          extracted tables,
          charts, and exports.
        </p>

      </section>

      {/* LOADING */}

      {loading && (

        <div className="history-loading">

          Loading datasets...

        </div>
      )}

      {/* EMPTY */}

      {!loading && error && (

        <div className="history-empty">

          <Database size={50} />

          <h3>
            Unable to load history
          </h3>

          <p>
            {error}
          </p>

        </div>
      )}

      {!loading && !error && datasets.length === 0 && (

        <div className="history-empty">

          <Database size={50} />

          <h3>
            No datasets found
          </h3>

          <p>
            Run your first scraping task.
          </p>

        </div>
      )}

      {/* DATASETS */}

      {!loading && datasets.length > 0 && (
        <>
          <div className="history-grid">

            {datasets.map((dataset) => (

            <div
              key={dataset._id}
              className={`history-card ${selectedDatasetId === dataset._id ? "history-card--selected" : ""}`}
              onClick={() => handleSelectDataset(dataset)}
              role="button"
              tabIndex={0}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  handleSelectDataset(dataset);
                }
              }}
            >

              <div className="history-card-top">

                <h3>
                  {dataset.query}
                </h3>

              </div>

              <div className="history-meta">

                <span>

                  <Database size={15} />

                  {dataset?.data?.length || 0}
                  {" "}
                  rows

                </span>

                <span>

                  <Globe size={15} />

                  {dataset?.sources?.length || 0}
                  {" "}
                  sources

                </span>

              </div>

              <p className="history-answer">

                {dataset.answer
                  ? dataset.answer.slice(0, 140)
                  : "Structured dataset generated successfully."
                }

              </p>

              <div className="history-date">

                <Calendar size={15} />

                {new Date(
                  dataset.createdAt
                ).toLocaleString()}

              </div>

            </div>
          ))}

        </div>

        {selectedDataset && (
          <section className="history-detail-panel">
            <div className="history-detail-header">
              <h2>Selected history result</h2>
              {detailLoading ? (
                <p>Loading selected dataset...</p>
              ) : (
                <p>Restored from history: {selectedDataset.query || "Saved dataset"}</p>
              )}
            </div>
            <Result result={selectedDataset} />
          </section>
        )}
        </>
      )}

    </div>
  );
}