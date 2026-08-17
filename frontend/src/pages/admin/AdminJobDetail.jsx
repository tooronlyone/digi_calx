import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { api } from "../../api";
import Stepper, { statusLabel } from "../../components/Stepper";

export default function AdminJobDetail() {
  const { id } = useParams();
  const [job, setJob] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([api.adminGetJob(id), api.adminGetJobHistory(id)])
      .then(([j, h]) => { setJob(j); setHistory(h); })
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <p className="muted">Loading…</p>;
  if (!job) return <p className="muted">Job not found.</p>;

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="eyebrow mb-8">JOB-{String(job.id).padStart(4, "0")}</div>
          <h1 className="page-title">{job.asset?.make} {job.asset?.model}</h1>
          <p className="page-subtitle">{job.factory_org?.name} &middot; {job.lab_org?.name}</p>
        </div>
      </div>

      <div className="card mb-24">
        <Stepper status={job.status} />
      </div>

      <div className="grid grid-2">
        <div className="card">
          <h3 style={{ fontSize: 14 }} className="mb-16">Financials</h3>
          <table>
            <tbody>
              <tr><td className="muted">Calibration price</td><td className="mono">PKR {job.calibration_price.toLocaleString()}</td></tr>
              <tr><td className="muted">Transport</td><td className="mono">{job.transport_mode === "calx" ? `PKR ${job.transport_cost.toLocaleString()} (Digi_CalX)` : "Factory arranged"}</td></tr>
              <tr><td className="muted">Adjustment charge</td><td className="mono">{job.proposed_adjustment_cost ? `PKR ${job.proposed_adjustment_cost.toLocaleString()}` : "—"}</td></tr>
              <tr><td><strong>Total</strong></td><td className="mono"><strong>PKR {job.total_amount.toLocaleString()}</strong></td></tr>
              <tr><td className="muted">Commission rate applied</td><td>{(job.platform_commission_rate * 100).toFixed(0)}%</td></tr>
            </tbody>
          </table>
        </div>

        <div className="card">
          <h3 style={{ fontSize: 14 }} className="mb-16">Technical</h3>
          <table>
            <tbody>
              <tr><td className="muted">Conformity</td><td>{job.conformity ? job.conformity.replaceAll("_", " ") : "—"}</td></tr>
              <tr><td className="muted">Adjustment</td><td>{job.adjustment_requested ? (job.adjustment_authorized ? "Authorized" : "Declined") : "Not needed"}</td></tr>
            </tbody>
          </table>
          {job.as_found_result && (
            <>
              <div className="hr" />
              <div className="muted small mb-8">As-found</div>
              <p className="small">{job.as_found_result}</p>
            </>
          )}
          {job.as_left_result && (
            <>
              <div className="muted small mb-8 mt-16">As-left</div>
              <p className="small">{job.as_left_result}</p>
            </>
          )}
        </div>
      </div>

      <div className="card mt-24">
        <h3 style={{ fontSize: 14 }} className="mb-16">History</h3>
        <div className="timeline-log">
          {history.map((h) => (
            <div className="timeline-item" key={h.id}>
              <div className="timeline-status">{statusLabel(h.status)}</div>
              <div className="timeline-meta">
                {h.actor && <>{h.actor} &middot; </>}
                {new Date(h.created_at).toLocaleString()}
                {h.note && <> &middot; {h.note}</>}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
