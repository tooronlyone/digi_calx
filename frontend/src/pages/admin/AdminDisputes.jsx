import { useEffect, useState } from "react";
import { api } from "../../api";

export default function AdminDisputes() {
  const [disputes, setDisputes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [resolving, setResolving] = useState(null);
  const [form, setForm] = useState({ status: "dismissed", resolution: "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const load = () => api.adminListDisputes().then(setDisputes).finally(() => setLoading(false));
  useEffect(() => { load(); }, []);

  const submitResolution = async (disputeId) => {
    setError("");
    setBusy(true);
    try {
      await api.adminResolveDispute(disputeId, form);
      setResolving(null);
      setForm({ status: "dismissed", resolution: "" });
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="eyebrow mb-8">Trust Layer</div>
          <h1 className="page-title">Disputes</h1>
          <p className="page-subtitle">Every dispute raised by a factory or lab, platform-wide. Resolving one puts the job on hold pending manual follow-up.</p>
        </div>
      </div>

      {loading ? (
        <p className="muted">Loading…</p>
      ) : disputes.length === 0 ? (
        <div className="empty-state card"><h3>No disputes</h3></div>
      ) : (
        disputes.map((d) => (
          <div key={d.id} className="card">
            <div className="flex-between">
              <div>
                <div className="mono small muted">JOB-{String(d.job_id).padStart(4, "0")} &middot; {d.dispute_type}</div>
                <p className="small mt-8">{d.description}</p>
              </div>
              <span className={"pill" + (d.status === "open" ? " warn" : " done")}>{d.status.replaceAll("_", " ")}</span>
            </div>

            {d.status !== "open" && d.resolution && (
              <div className="mt-16" style={{ borderTop: "1px solid var(--border)", paddingTop: 12 }}>
                <div className="small muted mb-8">Resolution by {d.resolved_by}</div>
                <p className="small">{d.resolution}</p>
              </div>
            )}

            {d.status === "open" && (
              resolving === d.id ? (
                <div className="mt-16">
                  {error && <div className="error-box">{error}</div>}
                  <div className="field">
                    <label>Outcome</label>
                    <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                      <option value="dismissed">Dismissed — no fault found</option>
                      <option value="partially_upheld">Partially upheld</option>
                      <option value="upheld">Upheld — factory/lab was right</option>
                    </select>
                  </div>
                  <div className="field">
                    <label>Resolution notes *</label>
                    <textarea value={form.resolution} onChange={(e) => setForm({ ...form, resolution: e.target.value })} />
                  </div>
                  <div className="flex-gap">
                    <button className="btn btn-primary" disabled={busy || !form.resolution} onClick={() => submitResolution(d.id)}>
                      Submit resolution
                    </button>
                    <button className="btn btn-ghost" onClick={() => setResolving(null)}>Cancel</button>
                  </div>
                </div>
              ) : (
                <button className="btn btn-sm mt-16" onClick={() => setResolving(d.id)}>Resolve</button>
              )
            )}
          </div>
        ))
      )}
    </div>
  );
}
