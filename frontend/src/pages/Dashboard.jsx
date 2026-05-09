import {
  Database,
  Activity,
  Search,
  Sparkles
} from "lucide-react";

import { useAuth } from "../context/AuthContext";

export default function Dashboard() {

  const { user } = useAuth();

  const stats = [
    {
      icon: Database,
      title: "Datasets Ready",
      text: "Saved collections and exports"
    },
    {
      icon: Activity,
      title: "Jobs Tracked",
      text: "Queued, processing, completed"
    },
    {
      icon: Search,
      title: "Agent Online",
      text: "Multi-URL crawling support"
    }
  ];

  return (
    <div className="dashboard-page">

      {/* HERO */}

      <section className="dashboard-hero">

        <span className="eyebrow">
          <Sparkles size={15} />
          Dashboard
        </span>

        <h1>
          Welcome back,
          <br />
          {user?.name || "Researcher"}.
        </h1>

        <p>
          Your scraping command center is ready
          for crawl jobs, dataset review,
          and exports.
        </p>

      </section>

      {/* GRID */}

      <section className="dashboard-grid">

        {stats.map((item, index) => {

          const Icon = item.icon;

          return (
            <div
              className="dashboard-card"
              key={index}
            >

              <div className="dashboard-icon">
                <Icon size={24} />
              </div>

              <h3>{item.title}</h3>

              <p>{item.text}</p>

            </div>
          );
        })}

      </section>

      {/* INFO PANEL */}

      <section className="dashboard-panel">
        

        <h3>User reference</h3>

        <strong>{user?.email}</strong>

        <p>
          Session persisted locally for the current
          workspace. Backend token support can be
          added later without changing this shell.
        </p>

      </section>

    </div>
  );
}