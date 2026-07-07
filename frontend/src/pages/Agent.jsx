import {
  BarChart3,
  CheckCircle2,
  Clock3,
  Database,
  Download,
  FileText,
  Loader2,
  Plus,
  Search,
  Sparkles,
} from "lucide-react";

import { useEffect, useState } from "react";
import axios from "axios";

import {
  createWorkspace,
  getWorkspaces,
  runAgent as apiRunAgent,
} from "../api/scraperApi";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api";

const workflowSteps = [
  { id: "query", label: "Research query", detail: "Define the scraping intent" },
  { id: "scrape", label: "Scraping progress", detail: "Collecting the source evidence" },
  { id: "dataset", label: "Dataset", detail: "Structuring the extracted rows" },
  { id: "insights", label: "AI insights", detail: "Summarizing the findings" },
  { id: "charts", label: "Charts", detail: "Preparing the visuals" },
  { id: "export", label: "Export", detail: "Delivering the output" },
];

export default function Agent() {
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [jobId, setJobId] = useState(null);
  const [jobStatus, setJobStatus] = useState(null);
  const [result, setResult] = useState(null);
  const [workspaces, setWorkspaces] = useState([]);
  const [workspaceId, setWorkspaceId] = useState("");
  const [workspaceName, setWorkspaceName] = useState("");

  useEffect(() => {
    let isMounted = true;
    (async () => {
      const list = await getWorkspaces();
      if (isMounted) {
        setWorkspaces(list || []);
        if (list?.length > 0) {
          setWorkspaceId(list[0]._id);
          setWorkspaceName(list[0].name);
        }
      }
    })().catch(console.error);
    return () => {
      isMounted = false;
    };
  }, []);

  const createWorkspaceHandler = async () => {
    const name = window.prompt("Enter a new workspace name");
    if (!name || !name.trim()) {
      return;
    }

    try {
      const workspace = await createWorkspace(name.trim());
      setWorkspaces((prev) => [workspace, ...prev]);
      setWorkspaceId(workspace._id);
      setWorkspaceName(workspace.name);
    } catch (err) {
      console.error(err);
      alert(err.message || "Failed to create workspace.");
    }
  };

  const runAgent = async () => {
    if (!prompt.trim()) {
      alert("Please enter a scraping prompt.");
      return;
    }

    setLoading(true);
    setResult(null);
    setJobStatus("queued");

    try {
      const response = await apiRunAgent(prompt.trim(), workspaceId, workspaceName);
      setJobId(response.jobId);
      setJobStatus(response.status);
      pollJob(response.jobId);
    } catch (err) {
      console.error(err);
      setResult({ success: false, message: "Failed to run agent." });
      setLoading(false);
    }
  };

  const pollJob = async (id) => {
    const interval = setInterval(async () => {
      try {
        const response = await axios.get(`${API_BASE_URL}/scrape/jobs/${id}`);
        const job = response.data;
        requestAnimationFrame(() => {
          setJobStatus(job.status);
        });

        if (job.status === "completed" || job.status === "failed") {
          clearInterval(interval);
          const normalizedResult = {
            ...job.result,
            _id: job.datasetId || job.result?._id,
            workspaceId: job.workspaceId || workspaceId || job.result?.workspaceId,
            workspaceName: job.workspaceName || workspaceName || job.result?.workspaceName,
          };

          setResult(normalizedResult);
          setLoading(false);
        }
      } catch (err) {
        console.error(err);
        clearInterval(interval);
        setLoading(false);
      }
    }, 2000);
  };

  const exportCSV = async () => {
    const dataset = result?.result?.data || result?.data;
    if (!dataset?.length) {
      alert("No dataset available.");
      return;
    }

    try {
      const response = await axios.post(
        "http://localhost:5000/api/download-csv",
        { data: dataset },
        { responseType: "blob" }
      );
      const blob = new Blob([response.data], { type: "text/csv" });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "scrape-results.csv";
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
      alert("Failed to export CSV.");
    }
  };

  const datasetRows = result?.result?.data || result?.data || [];
  const hasResults = Array.isArray(datasetRows) && datasetRows.length > 0;
  const activeStep = loading ? "scrape" : hasResults ? "export" : jobStatus === "completed" ? "dataset" : "query";

  return (
    <div className="agent-page">
      <section className="agent-hero">
        <span className="eyebrow">
          <Sparkles size={15} />
          Research workspace
        </span>
        <h1>Run a focused research flow from query to export.</h1>
        <p>Enter a research brief, track the scraping progress, inspect the dataset, and export the results without extra clutter.</p>
      </section>

      <section className="agent-panel">
        <div className="agent-input-wrapper">
          <Search size={20} />
          <input
            type="text"
            placeholder="Describe what you want to scrape..."
            value={prompt}
            onChange={(event) => setPrompt(event.target.value)}
          />
          <button className="agent-run-btn" onClick={runAgent} disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="spin" size={18} />
                Running
              </>
            ) : (
              "Run research"
            )}
          </button>
        </div>

        <div className="workspace-row">
          <div className="workspace-select-label">Save into workspace</div>
          <div className="workspace-select-group">
            <select
              value={workspaceId}
              onChange={(event) => {
                const selected = workspaces.find((workspace) => workspace._id === event.target.value);
                setWorkspaceId(event.target.value);
                setWorkspaceName(selected?.name || "");
              }}
            >
              <option value="">No workspace</option>
              {workspaces.map((workspace) => (
                <option key={workspace._id} value={workspace._id}>
                  {workspace.name}
                </option>
              ))}
            </select>
            <button className="create-workspace-btn" onClick={createWorkspaceHandler}>
              <Plus size={16} /> Create
            </button>
          </div>
        </div>

        <div className="agent-flow-list">
          {workflowSteps.map((step) => (
            <div className={`agent-flow-item ${activeStep === step.id ? "agent-flow-item--active" : ""}`} key={step.id}>
              <div className="agent-flow-item__icon">
                {step.id === "export" ? <Download size={16} /> : step.id === "dataset" ? <Database size={16} /> : step.id === "charts" ? <BarChart3 size={16} /> : step.id === "insights" ? <FileText size={16} /> : step.id === "scrape" ? <Clock3 size={16} /> : <Search size={16} />}
              </div>
              <div>
                <strong>{step.label}</strong>
                <p>{step.detail}</p>
              </div>
            </div>
          ))}
        </div>

        {(jobStatus || loading || hasResults) && (
          <div className="agent-results-summary">
            <div className="agent-results-summary__header">
              <div>
                <span>Execution status</span>
                <h3>{jobStatus === "completed" ? "Research completed" : loading ? "Research in progress" : "Awaiting results"}</h3>
              </div>
              {jobStatus === "completed" ? <CheckCircle2 size={18} /> : <Clock3 size={18} />}
            </div>

            {jobId && <p className="agent-results-summary__meta">Job ID: {jobId}</p>}

            {hasResults ? (
              <>
                <p className="agent-results-summary__meta">Rows collected: {datasetRows.length}</p>
                <div className="agent-action-row">
                  <button className="export-btn" onClick={exportCSV}>
                    <Download size={16} />
                    Export CSV
                  </button>
                </div>
              </>
            ) : (
              <p className="agent-results-summary__meta">The selected workflow stage will update here as the research completes.</p>
            )}
          </div>
        )}
      </section>
    </div>
  );
}