import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api";
import { useAuth } from "../AuthContext";
import { statusLabel } from "../components/Stepper";

export default function Dashboard() {
  const { user } = useAuth();
  const isFactory = user?.organization?.org_type === "factory";
  const [jobs, setJobs] = useState([]);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([api.listJobs(), api.listRequests()])
      .then(([j, r]) => {
        setJobs(j);
        setRequests(r);
      })
      .finally(() => setLoading(false));
  }, []);

  const openJobs = jobs.filter((j) => j.status !== "CLOSED" && j.status !== "CANCELLED");
  const closedJobs = jobs.filter((j) => j.status === "CLOSED");

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="eyebrow mb-8">{isFactory ? "Factory" : "Laboratory"} Overview</div>
          <h1 className="page-title">Welcome back, {user?.full_name?.split(" ")[0]}</h1>
          <p className="page-subtitle">
            {isFactory
              ? "Track your instrument fleet, calibration requests, and jobs in progress."
              : "Monitor your capability catalog, request inbox, and jobs on the bench."}
          </p>
        </div>
        {isFactory ? (
          <Link to="/assets" className="btn btn-primary">+ New calibration request</Link>
        ) : (
          <Link to="/inbox" className="btn btn-primary">View request inbox</Link>
        )}
      </div>

      <div className="grid grid-3 mb-24">
        <div className="stat-block">
          <div className="stat-value">{loading ? "—" : openJobs.length}</div>
          <div className="stat-label">Jobs in progress</div>
        </div>
        <div className="stat-block">
          <div className="stat-value">{loading ? "—" : requests.length}</div>
          <div className="stat-label">{isFactory ? "Requests submitted" : "Eligible requests"}</div>
        </div>
        <div className="stat-block">
          <div className="stat-value">{loading ? "—" : closedJobs.length}</div>
          <div className="stat-label">Jobs closed</div>
        </div>
      </div>

      <div className="card">
        <div className="flex-between mb-16">
          <h3 style={{ fontSize: 15 }}>Recent jobs</h3>
          <Link to="/jobs" className="small muted">View all &rarr;</Link>
        </div>
        {jobs.length === 0 ? (
          <div className="empty-state">
            <h3>No jobs yet</h3>
            <p>
              {isFactory
                ? "Add an instrument and submit your first calibration request to see it here."
                : "Accepted quotes will appear here as active jobs."}
            </p>
          </div>
        ) : (
          jobs.slice(0, 5).map((j) => (
            <Link to={`/jobs/${j.id}`} key={j.id} className="row-link">
              <div className="flex-between">
                <div>
                  <div className="mono small muted">JOB-{String(j.id).padStart(4, "0")}</div>
                  <div className="mt-8">{j.asset?.make} {j.asset?.model} &middot; {j.asset?.category}</div>
                </div>
                <span className="pill on">{statusLabel(j.status)}</span>
              </div>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
