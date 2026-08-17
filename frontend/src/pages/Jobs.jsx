import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api";
import { useAuth } from "../AuthContext";
import { statusLabel } from "../components/Stepper";

export default function Jobs() {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const isFactory = user?.organization?.org_type === "factory";

  useEffect(() => { api.listJobs().then(setJobs).finally(() => setLoading(false)); }, []);

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="eyebrow mb-8">Execution</div>
          <h1 className="page-title">{isFactory ? "Active Jobs" : "Job Board"}</h1>
          <p className="page-subtitle">Chain of custody, technical execution and certificate lifecycle, in one append-only history per job.</p>
        </div>
      </div>

      {loading ? (
        <p className="muted">Loading…</p>
      ) : jobs.length === 0 ? (
        <div className="empty-state card"><h3>No jobs yet</h3></div>
      ) : (
        jobs.map((j) => (
          <Link to={`/jobs/${j.id}`} key={j.id} className="row-link">
            <div className="flex-between">
              <div>
                <div className="mono small muted">JOB-{String(j.id).padStart(4, "0")}</div>
                <div className="mt-8">{j.asset?.make} {j.asset?.model} &middot; {j.asset?.category}</div>
                <div className="small muted mt-8">
                  {isFactory ? j.lab_org?.name : j.factory_org?.name}
                </div>
              </div>
              <span className="pill on">{statusLabel(j.status)}</span>
            </div>
          </Link>
        ))
      )}
    </div>
  );
}
