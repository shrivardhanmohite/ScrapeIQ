import { useState } from "react";
import { createScrapeJob, waitForScrapeJob } from "../api/scraperApi";

export default function SearchBox({ setResult }) {
  const [query, setQuery] = useState("");
  const [urls, setUrls] = useState("");
  const [mode, setMode] = useState("scrape");
  const [loading, setLoading] = useState(false);
  const [jobStatus, setJobStatus] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async () => {
    if (!query.trim()) {
      return;
    }

    setLoading(true);
    setError("");
    setJobStatus("Queued");

    try {
      const job = await createScrapeJob({
        query,
        urls,
        mode,
        maxPages: mode === "crawl" ? 20 : 10,
        maxDepth: mode === "crawl" ? 1 : 0
      });

      const data = await waitForScrapeJob(job.jobId, (latestJob) => {
        setJobStatus(`${latestJob.status} (${latestJob.progress || 0}%)`);
      });

      setResult(data);
    } catch (err) {
      setError(err.message || "Unable to run scraping job.");
    } finally {
      setLoading(false);
      setJobStatus("");
    }
  };

  return (
    <div style={{
      width: "100%",
      maxWidth: "760px",
      display: "grid",
      gap: "10px"
    }}>
      <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
        <input
          className="input-glass"
          type="text"
          placeholder="Ask anything..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
          style={{ flex: 1, fontSize: "16px", padding: "14px" }}
        />

        <button
          className="btn-glow"
          onClick={handleSubmit}
          disabled={loading}
          style={{ padding: "14px 18px", opacity: loading ? 0.7 : 1 }}
        >
          {loading ? "Running..." : "Run"}
        </button>
      </div>

      <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
        <select
          value={mode}
          onChange={(e) => setMode(e.target.value)}
          className="input-glass"
          style={{ padding: "10px" }}
        >
          <option value="scrape">Scrape URLs/search results</option>
          <option value="crawl">Crawl linked pages</option>
        </select>

        {jobStatus && (
          <span style={{ color: "#93c5fd", alignSelf: "center", fontSize: "14px" }}>
            {jobStatus}
          </span>
        )}
      </div>

      <textarea
        className="input-glass"
        placeholder="Optional seed URLs, one per line. Leave blank to search the web."
        value={urls}
        onChange={(e) => setUrls(e.target.value)}
        rows={3}
        style={{ resize: "vertical" }}
      />

      {error && (
        <p style={{ color: "#fca5a5", fontSize: "14px" }}>{error}</p>
      )}
    </div>
  );
}
