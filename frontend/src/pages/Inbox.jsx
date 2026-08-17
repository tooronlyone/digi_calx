import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api";
import { statusLabel } from "../components/Stepper";

export default function Inbox() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { api.listRequests().then(setRequests).finally(() => setLoading(false)); }, []);

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="eyebrow mb-8">Marketplace</div>
          <h1 className="page-title">Request Inbox</h1>
          <p className="page-subtitle">Requests shown here already pass hard technical eligibility against your published capabilities — measurand, category, range, accreditation and service mode.</p>
        </div>
      </div>

      {loading ? (
        <p className="muted">Loading…</p>
      ) : requests.length === 0 ? (
        <div className="empty-state card">
          <h3>No eligible requests right now</h3>
          <p>Publish more capabilities to widen your eligible scope.</p>
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
