import {
  Calendar,
  Database,
  History as HistoryIcon,
  Search,
} from "lucide-react";

import { useCallback, useEffect, useMemo, useState } from "react";

import { getDatasets } from "../api/scraperApi";

export default function History() {
  const [datasets, setDatasets] = useState([]);
  const [selectedDatasetId, setSelectedDatasetId] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchHistory = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const data = await getDatasets();
      setDatasets(Array.isArray(data) ? data : []);
      if (Array.isArray(data) && data.length > 0) {
        setSelectedDatasetId((current) => current || data[0]._id);
      }
    } catch (err) {
      console.error("History fetch failed:", err);
      setError(err.message || "Failed to load history.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;
    const loadHistory = async () => {
      if (!isMounted) return;
      await fetchHistory();
    };

    void loadHistory();

    return () => {
      isMounted = false;
    };
  }, [fetchHistory]);

  const filteredDatasets = useMemo(() => {
    const query = searchTerm.toLowerCase().trim();
    return datasets.filter((dataset) => !query || `${dataset.query || ""} ${dataset.answer || ""}`.toLowerCase().includes(query));
  }, [datasets, searchTerm]);

  const selectedDataset = useMemo(
    () => filteredDatasets.find((dataset) => dataset._id === selectedDatasetId) || filteredDatasets[0] || null,
    [filteredDatasets, selectedDatasetId]
  );

  return (
    <div className="history-page">
      <section className="history-hero">
        <span className="eyebrow">
          <HistoryIcon size={15} />
          Saved datasets
        </span>
        <h1>Browse the saved research datasets without extra analysis layers.</h1>
        <p>Each entry focuses on the dataset itself: context, row volume, source count, and the most relevant summary.</p>
      </section>

      {loading && <div className="history-loading">Loading datasets...</div>}

      {!loading && error && (
        <div className="history-empty">
          <Database size={50} />
          <h3>Unable to load history</h3>
          <p>{error}</p>
        </div>
      )}

      {!loading && !error && datasets.length === 0 && (
        <div className="history-empty">
          <Database size={50} />
          <h3>No datasets found</h3>
          <p>Run your first research task to populate this archive.</p>
        </div>
      )}

      {!loading && !error && datasets.length > 0 && (
        <div className="history-shell">
          <aside className="history-list-panel">
            <label className="history-search">
              <Search size={15} />
              <input value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} placeholder="Search datasets" />
            </label>

            <div className="history-list">
              {filteredDatasets.map((dataset) => (
                <button
                  key={dataset._id}
                  className={`history-list-item ${selectedDataset?._id === dataset._id ? "history-list-item--active" : ""}`}
                  onClick={() => setSelectedDatasetId(dataset._id)}
                >
                  <strong>{dataset.query || "Untitled dataset"}</strong>
                  <span>{new Date(dataset.createdAt).toLocaleDateString()}</span>
                  <p>{dataset.answer ? String(dataset.answer).slice(0, 120) : "Saved dataset from the research workflow"}</p>
                </button>
              ))}
            </div>
          </aside>

          <section className="history-detail-panel">
            {selectedDataset ? (
              <>
                <div className="history-detail-panel__header">
                  <div>
                    <span>Dataset detail</span>
                    <h2>{selectedDataset.query || "Saved dataset"}</h2>
                  </div>
                  <div className="history-detail-meta">
                    <span>{selectedDataset.data?.length || 0} rows</span>
                    <span>{selectedDataset.sources?.length || 0} sources</span>
                  </div>
                </div>

                <div className="history-detail-body">
                  <div className="history-summary-card">
                    <p>{selectedDataset.answer || "The dataset summary will appear here once available."}</p>
                  </div>
                  <div className="history-summary-card history-summary-card--compact">
                    <div className="history-summary-row">
                      <Calendar size={16} />
                      <span>{new Date(selectedDataset.createdAt).toLocaleString()}</span>
                    </div>
                    <div className="history-summary-row">
                      <Database size={16} />
                      <span>{selectedDataset.data?.length || 0} rows available</span>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div className="dashboard-empty">Select a dataset to review it here.</div>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
