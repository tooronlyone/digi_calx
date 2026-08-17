import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../../api";
import { statusLabel } from "../../components/Stepper";

export default function AdminJobs() {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { api.adminListJobs().then(setJobs).finally(() => setLoading(false)); }, []);

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="eyebrow mb-8">Platform</div>
          <h1 className="page-title">All Jobs</h1>
          <p className="page-subtitle">Every job across every factory-lab pair on Digi_CalX.</p>
        </div>
      </div>

      {loading ? (
        <p className="muted">Loading…</p>
      ) : jobs.length === 0 ? (
        <div className="empty-state card"><h3>No jobs yet</h3></div>
      ) : (
        <div className="card" style={{ padding: 0 }}>
          <table>
            <thead>
              <tr><th>Job</th><th>Factory</th><th>Lab</th><th>Total</th><th>Status</th><th></th></tr>
            </thead>
            <tbody>
              {jobs.map((j) => (
                <tr key={j.id}>
                  <td className="mono">JOB-{String(j.id).padStart(4, "0")}</td>
                  <td>{j.factory_org?.name}</td>
                  <td>{j.lab_org?.name}</td>
                  <td className="mono">PKR {j.total_amount.toLocaleString()}</td>
                  <td><span className="pill on">{statusLabel(j.status)}</span></td>
                  <td><Link to={`/admin/jobs/${j.id}`} className="small">View &rarr;</Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
