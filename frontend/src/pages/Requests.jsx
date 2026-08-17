import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api";
import { statusLabel } from "../components/Stepper";

export default function Requests() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { api.listRequests().then(setRequests).finally(() => setLoading(false)); }, []);

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="eyebrow mb-8">Marketplace</div>
          <h1 className="page-title">Calibration Requests</h1>
          <p className="page-subtitle">Every request you've submitted, and how far it's progressed toward booking.</p>
        </div>
        <Link to="/requests/new" className="btn btn-primary">+ New request</Link>
      </div>

      {loading ? (
        <p className="muted">Loading…</p>
      ) : requests.length === 0 ? (
        <div className="empty-state card">
          <h3>No requests yet</h3>
          <p>Submit a request from your instrument registry to see eligible labs and quotes.</p>
        </div>
      ) : (
        requests.map((r) => (
          <Link to={`/requests/${r.id}`} key={r.id} className="row-link">
            <div className="flex-between">
              <div>
                <div className="mono small muted">REQ-{String(r.id).padStart(4, "0")}</div>
                <div className="mt-8">{r.asset?.make} {r.asset?.model} &middot; {r.asset?.category}</div>
                <div className="small muted mt-8">
                  {r.service_mode} &middot; {r.urgency}
                  {r.accredited_required && <> &middot; accredited required</>}
                </div>
              </div>
              <span className="pill on">{statusLabel(r.status)}</span>
            </div>
          </Link>
        ))
      )}
    </div>
  );
}
