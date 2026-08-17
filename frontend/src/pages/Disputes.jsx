import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api";

export default function Disputes() {
  const [disputes, setDisputes] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { api.listMyDisputes().then(setDisputes).finally(() => setLoading(false)); }, []);

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="eyebrow mb-8">Trust Layer</div>
          <h1 className="page-title">Disputes</h1>
          <p className="page-subtitle">Every dispute opened on a job you're party to, with its resolution status.</p>
        </div>
      </div>

      {loading ? (
        <p className="muted">Loading…</p>
      ) : disputes.length === 0 ? (
        <div className="empty-state card">
          <h3>No disputes</h3>
          <p>A clean record — disputes appear here if either party flags a job.</p>
        </div>
      ) : (
        disputes.map((d) => (
          <Link to={`/jobs/${d.job_id}`} key={d.id} className="row-link">
            <div className="flex-between">
              <div>
                <div className="mono small muted">JOB-{String(d.job_id).padStart(4, "0")} &middot; {d.dispute_type}</div>
                <p className="small mt-8">{d.description}</p>
              </div>
              <span className="pill warn">{d.status.replaceAll("_", " ")}</span>
            </div>
          </Link>
        ))
      )}
    </div>
  );
}
