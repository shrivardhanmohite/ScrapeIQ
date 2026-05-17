import {
  Search,
  Download,
  Mail,
  Sparkles,
  Loader2,
  CheckCircle2,
  Clock3
} from "lucide-react";

import { useState } from "react";

import axios from "axios";

import AutoCharts from "../components/charts/AutoCharts";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api";

export default function Agent() {

  const [prompt, setPrompt] = useState("");

  const [urls, setUrls] = useState("");

  const [loading, setLoading] = useState(false);

  const [jobId, setJobId] = useState(null);

  const [jobStatus, setJobStatus] = useState(null);

  const [result, setResult] = useState(null);

  /* =========================================
     RUN AGENT
  ========================================= */

  const runAgent = async () => {

    if (!prompt.trim()) {

      alert("Please enter a scraping prompt.");

      return;
    }

    setLoading(true);

    setResult(null);

    try {

      const response = await axios.post(
        "http://localhost:5000/api/scrape",
        {
          query: prompt,

          urls:
            urls
              .split("\n")
              .filter((url) => url.trim()),

          mode: "search",

          maxPages: 10,

          maxDepth: 2
        }
      );

      setJobId(response.data.jobId);

      setJobStatus(response.data.status);

      pollJob(response.data.jobId);

    } catch (err) {

      console.error(err);

      setResult({
        success: false,
        message: "Failed to run agent."
      });

      setLoading(false);
    }
  };

  /* =========================================
     POLL JOB
  ========================================= */

  const pollJob = async (id) => {

    const interval = setInterval(async () => {

      try {

        const response = await axios.get(
          `http://localhost:5000/api/scrape/jobs/${id}`
        );

        const job = response.data;

        console.log("JOB RESPONSE:", job);

        requestAnimationFrame(() => {

          setJobStatus(job.status);

        });

        if (
          job.status === "completed" ||
          job.status === "failed"
        ) {

          clearInterval(interval);

          const datasetData =
            job?.result?.data ||
            job?.data ||
            [];

          const datasetCharts =
            job?.result?.charts ||
            job?.charts ||
            [];

          const datasetSources =
            job?.result?.sources ||
            job?.sources ||
            [];

          /* =========================
             SAVE DATASET
          ========================= */

          const datasetAnswer =
            job?.result?.answer ||
            job?.answer ||
            "";

          if (
            job.status === "completed" &&
            (datasetData.length > 0 || datasetAnswer)
          ) {

            try {

              await axios.post(
                `${API_BASE_URL}/dataset/save`,
                {
                  query: prompt,

                  answer: datasetAnswer,

                  data: datasetData,

                  sources: datasetSources,

                  charts: datasetCharts
                }
              );

              console.log(
                "Dataset saved successfully"
              );
              window.dispatchEvent(
                new Event("datasetSaved")
              );

            } catch (saveErr) {

              console.error(
                "Dataset save failed:",
                saveErr
              );
              alert(
                "Failed to save history: " +
                (saveErr.response?.data?.message || saveErr.message || "Unknown error")
              );
            }
          }

          requestAnimationFrame(() => {

            setResult(job);

            setLoading(false);

          });
        }

      } catch (err) {

        console.error(err);

        clearInterval(interval);

        requestAnimationFrame(() => {

          setLoading(false);

        });
      }

    }, 2000);
  };

  /* =========================================
     EXPORT CSV
  ========================================= */

  const exportCSV = async () => {

    const dataset =
      result?.result?.data ||
      result?.data;

    if (!dataset?.length) {

      alert("No dataset available.");

      return;
    }

    try {

      const response = await axios.post(
        "http://localhost:5000/api/download-csv",
        {
          data: dataset
        },
        {
          responseType: "blob"
        }
      );

      const blob = new Blob(
        [response.data],
        { type: "text/csv" }
      );

      const url =
        window.URL.createObjectURL(blob);

      const link =
        document.createElement("a");

      link.href = url;

      link.download = "scrape-results.csv";

      document.body.appendChild(link);

      link.click();

      link.remove();

    } catch (err) {

      console.error(err);

      alert("Failed to export CSV.");
    }
  };

  /* =========================================
     SEND MAIL
  ========================================= */

  const sendMail = () => {

    const dataset =
      result?.result?.data ||
      result?.data;

    if (!dataset?.length) {
      alert("No dataset available.");
      return;
    }

    const email = window.prompt(
      "Enter recipient email"
    );

    if (!email || !email.trim()) {
      return;
    }

    const subject = encodeURIComponent(
      "AI Scraping Dataset"
    );
    const body = encodeURIComponent(
      `Here is the scraped dataset:\n\n${JSON.stringify(
        dataset,
        null,
        2
      )}`
    );

    const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(
      email
    )}&su=${subject}&body=${body}`;

    window.open(gmailUrl, "_blank");
  };

  /* =========================================
     DATA
  ========================================= */

  const dataset =
    result?.result?.data ||
    result?.data ||
    [];

  const charts =
    result?.result?.charts ||
    result?.charts ||
    [];

  return (

    <div className="agent-page">

      {/* HERO */}

      <section className="agent-hero">

        <span className="eyebrow">

          <Sparkles size={15} />

          AI Scraping Agent

        </span>

        <h1>
          Extract intelligence from the web.
        </h1>

        <p>
          Crawl websites, extract datasets,
          generate charts, and export insights.
        </p>

      </section>

      {/* PANEL */}

      <section className="agent-panel">

        <div className="agent-input-wrapper">

          <Search size={20} />

          <input
            type="text"
            placeholder="Describe what you want to scrape..."
            value={prompt}
            onChange={(e) =>
              setPrompt(e.target.value)
            }
          />

          <button
            className="agent-run-btn"
            onClick={runAgent}
            disabled={loading}
          >

            {loading ? (
              <>
                <Loader2
                  className="spin"
                  size={18}
                />
                Running
              </>
            ) : (
              "Run Agent"
            )}

          </button>

        </div>

        <textarea
          className="agent-url-box"
          placeholder="Optional URLs (one per line)"
          value={urls}
          onChange={(e) =>
            setUrls(e.target.value)
          }
        />

        <div className="agent-actions">

          <button
            className="export-btn"
            onClick={exportCSV}
          >

            <Download size={18} />

            Export CSV

          </button>

          <button
            className="mail-btn"
            onClick={sendMail}
          >

            <Mail size={18} />

            Send via Mail

          </button>

        </div>

      </section>

      {/* STATUS */}

      {(jobStatus || loading) && (

        <section className="job-status-card">

          <div className="job-status-top">

            {jobStatus === "completed"
              ? <CheckCircle2 size={22} />
              : <Clock3 size={22} />
            }

            <h3>

              {jobStatus === "completed"
                ? "Scraping Completed"
                : "Scraping in Progress"}

            </h3>

          </div>

          {jobId && (

            <p>
              Job ID:
              <strong> {jobId}</strong>
            </p>

          )}

          <p>
            Current Status:
            <strong> {jobStatus}</strong>
          </p>

        </section>
      )}

      {/* RESULTS */}

      {dataset.length > 0 && (

        <>
          <section className="agent-results">

            <div className="results-header">

              <h2>
                Results
              </h2>

              <span>
                {dataset.length} rows
              </span>

            </div>

            <div className="results-table-wrapper">

              <table className="results-table">

                <thead>

                  <tr>

                    {Object.keys(
                      dataset[0]
                    ).map((key) => (

                      <th key={key}>
                        {key}
                      </th>
                    ))}

                  </tr>

                </thead>

                <tbody>

                  {dataset.map(
                    (row, index) => (

                      <tr key={index}>

                        {Object.values(row).map(
                          (value, idx) => (

                            <td key={idx}>
                              {String(value)}
                            </td>
                          )
                        )}

                      </tr>
                    )
                  )}

                </tbody>

              </table>

            </div>

          </section>

          {/* CHARTS */}

          {charts.length > 0 && (

            <AutoCharts
              data={dataset}
              charts={charts}
            />
          )}

        </>
      )}

    </div>
  );
}