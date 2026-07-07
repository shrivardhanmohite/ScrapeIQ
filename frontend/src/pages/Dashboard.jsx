import {
  ArrowRight,
  Database,
  FileText,
  FolderKanban,
  History as HistoryIcon,
  LayoutGrid,
  Sparkles,
} from "lucide-react";

import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import { useAuth } from "../context/AuthContext";
import { getDatasets, getReports, getWorkspaces } from "../api/scraperApi";

const SESSION_STORAGE_KEY = "scrapeiq-research-sessions";

function toSessionSummary(dataset) {
  return {
    id: `dataset-${dataset._id}`,
    query: dataset.query || "Research session",
    createdAt: dataset.createdAt || new Date().toISOString(),
    status: "completed",
    rows: Array.isArray(dataset?.data) ? dataset.data.length : 0,
    workspace: dataset.workspaceName || "Workspace",
  };
}

export default function Dashboard() {
  const { user: _user } = useAuth();
  const navigate = useNavigate();
  const [sessions, setSessions] = useState([]);
  const [reports, setReports] = useState([]);
  const [workspaces, setWorkspaces] = useState([]);

  useEffect(() => {
    let isMounted = true;

    const loadOverview = async () => {
      const storedSessions = window.localStorage.getItem(SESSION_STORAGE_KEY);
      let parsedSessions = [];

      if (storedSessions) {
        try {
          parsedSessions = JSON.parse(storedSessions);
        } catch {
          window.localStorage.removeItem(SESSION_STORAGE_KEY);
        }
      }

      try {
        const [datasets, reportItems, workspaceItems] = await Promise.all([
          getDatasets(),
          getReports(),
          getWorkspaces(),
        ]);

        if (!isMounted) return;

        const derivedSessions = Array.isArray(datasets)
          ? datasets.slice(0, 6).map(toSessionSummary)
          : [];

        const combinedSessions = [...parsedSessions, ...derivedSessions].filter(Boolean);
        const uniqueSessions = combinedSessions.filter(
          (session, index, list) => list.findIndex((candidate) => candidate.id === session.id) === index
        );

        setSessions(uniqueSessions.slice(0, 6));
        setReports(Array.isArray(reportItems) ? reportItems.slice(0, 4) : []);
        setWorkspaces(Array.isArray(workspaceItems) ? workspaceItems.slice(0, 4) : []);
      } catch (error) {
        console.error("Failed to load dashboard overview:", error);
      }
    };

    void loadOverview();

    return () => {
      isMounted = false;
    };
  }, []);

  const stats = useMemo(() => [
    { label: "Active sessions", value: sessions.length, icon: LayoutGrid },
    { label: "Saved datasets", value: sessions.length, icon: Database },
    { label: "Generated reports", value: reports.length, icon: FileText },
    { label: "Workspaces", value: workspaces.length, icon: FolderKanban },
  ], [reports.length, sessions.length, workspaces.length]);

  return (
    <div className="dashboard-page">
      <section className="dashboard-hero">
        <span className="eyebrow">
          <Sparkles size={15} />
          Enterprise AI Workspace
        </span>
        <h1>Keep your research flow focused and executive-ready.</h1>
        <p>
          Review recent work, reopen research sessions, and move directly into the next analysis without leaving the overview.
        </p>
      </section>

      <div className="dashboard-actions-row">
        <button className="dashboard-primary-btn" onClick={() => navigate("/agent")}>
          <ArrowRight size={16} />
          Continue Research
        </button>
      </div>

      <section className="dashboard-grid dashboard-grid--overview">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <article className="dashboard-card" key={stat.label}>
              <Icon size={20} />
              <strong>{stat.value}</strong>
              <span>{stat.label}</span>
            </article>
          );
        })}
      </section>

      <div className="dashboard-overview-grid">
        <section className="dashboard-panel">
          <div className="dashboard-panel__header">
            <div>
              <span>Recent research</span>
              <h2>Recent sessions</h2>
            </div>
            <HistoryIcon size={18} />
          </div>

          {sessions.length === 0 ? (
            <p className="dashboard-empty">No recent sessions yet. Start a new research task to begin building momentum.</p>
          ) : (
            <div className="dashboard-list">
              {sessions.map((session) => (
                <div className="dashboard-list-item" key={session.id}>
                  <div>
                    <strong>{session.query}</strong>
                    <p>{new Date(session.createdAt).toLocaleString()}</p>
                  </div>
                  <span>{session.workspace}</span>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="dashboard-panel">
          <div className="dashboard-panel__header">
            <div>
              <span>Recent reports</span>
              <h2>Generated reports</h2>
            </div>
            <FileText size={18} />
          </div>

          {reports.length === 0 ? (
            <p className="dashboard-empty">No reports have been created yet. Generate one from the research workspace when a dataset is ready.</p>
          ) : (
            <div className="dashboard-list">
              {reports.map((report) => (
                <div className="dashboard-list-item" key={report._id}>
                  <div>
                    <strong>{report.title || "Untitled report"}</strong>
                    <p>{report.query || "Report ready"}</p>
                  </div>
                  <span>{new Date(report.createdAt).toLocaleDateString()}</span>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="dashboard-panel">
          <div className="dashboard-panel__header">
            <div>
              <span>Recent workspaces</span>
              <h2>Workspace context</h2>
            </div>
            <FolderKanban size={18} />
          </div>

          {workspaces.length === 0 ? (
            <p className="dashboard-empty">No workspaces have been created yet. Create one from the research page when needed.</p>
          ) : (
            <div className="dashboard-list">
              {workspaces.map((workspace) => (
                <div className="dashboard-list-item" key={workspace._id}>
                  <div>
                    <strong>{workspace.name}</strong>
                    <p>{workspace.description || "Workspace ready for research"}</p>
                  </div>
                  <span>{workspace.createdAt ? new Date(workspace.createdAt).toLocaleDateString() : "Ready"}</span>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}