import { useEffect, useState } from "react";
import { api } from "../../api";
import { statusLabel } from "../../components/Stepper";

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { api.adminStats().then(setStats).finally(() => setLoading(false)); }, []);

  if (loading) return <p className="muted">Loading…</p>;

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="eyebrow mb-8">Platform Overview</div>
          <h1 className="page-title">Admin Dashboard</h1>
          <p className="page-subtitle">Live snapshot across every factory, lab, request and job on Digi_CalX.</p>
        </div>
      </div>

      <div className="grid grid-4 mb-24">
        <div className="stat-block">
          <div className="stat-value">{stats.total_factories}</div>
          <div className="stat-label">Factories</div>
        </div>
        <div className="stat-block">
          <div className="stat-value">{stats.total_labs}</div>
          <div className="stat-label">Labs</div>
        </div>
        <div className="stat-block">
          <div className="stat-value">{stats.total_jobs}</div>
          <div className="stat-label">Total jobs</div>
        </div>
        <div className="stat-block">
          <div className="stat-value">{stats.open_disputes}</div>
          <div className="stat-label">Open disputes</div>
        </div>
      </div>

      <div className="grid grid-2 mb-24">
        <div className="stat-block">
          <div className="stat-value">PKR {stats.gross_collected.toLocaleString()}</div>
          <div className="stat-label">Gross payments collected</div>
        </div>
        <div className="stat-block">
          <div className="stat-value">PKR {stats.platform_commission_earned.toLocaleString()}</div>
          <div className="stat-label">Platform commission earned ({(stats.commission_rate * 100).toFixed(0)}% current rate)</div>
        </div>
      </div>

      <div className="card">
        <h3 style={{ fontSize: 14 }} className="mb-16">Jobs by status</h3>
        {Object.keys(stats.jobs_by_status).length === 0 ? (
          <p className="small muted">No jobs yet.</p>
        ) : (
          <table>
            <thead><tr><th>Status</th><th>Count</th></tr></thead>
            <tbody>
              {Object.entries(stats.jobs_by_status).map(([status, count]) => (
                <tr key={status}>
                  <td className="mono">{statusLabel(status)}</td>
                  <td>{count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
