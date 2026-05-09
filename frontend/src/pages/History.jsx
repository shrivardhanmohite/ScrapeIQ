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

export default function History() {

  const [datasets, setDatasets] = useState([]);

  const [loading, setLoading] = useState(true);

  /* =========================================
     FETCH HISTORY
  ========================================= */

  const fetchHistory = useCallback(async () => {

    try {

      const response = await axios.get(
        "http://localhost:5000/api/datasets/all"
      );

      setDatasets(response.data || []);

    } catch (err) {

      console.error(err);

    } finally {

      setLoading(false);
    }

  }, []);

  /* =========================================
     EFFECT
  ========================================= */

  useEffect(() => {

    fetchHistory();

    const refreshHistory = () => {

      fetchHistory();
    };

    window.addEventListener(
      "datasetSaved",
      refreshHistory
    );

    return () => {

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

      {!loading && datasets.length === 0 && (

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

        <div className="history-grid">

          {datasets.map((dataset) => (

            <div
              key={dataset._id}
              className="history-card"
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
      )}

    </div>
  );
}