import { useEffect, useState } from "react";
import { api } from "../../api";

export default function AdminOrganizations() {
  const [orgs, setOrgs] = useState([]);
  const [filter, setFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);

  const load = () => api.adminListOrganizations(filter || undefined).then(setOrgs).finally(() => setLoading(false));
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [filter]);

  const toggleVerify = async (org) => {
    setBusyId(org.id);
    try {
      await api.adminVerifyOrg(org.id, !org.verified);
      await load();
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="eyebrow mb-8">Platform</div>
          <h1 className="page-title">Organizations</h1>
          <p className="page-subtitle">Every factory and lab registered on Digi_CalX. Verifying a lab marks it as accreditation-checked to factories browsing the directory.</p>
        </div>
        <select value={filter} onChange={(e) => setFilter(e.target.value)} style={{ maxWidth: 180 }}>
          <option value="">All types</option>
          <option value="factory">Factories</option>
          <option value="lab">Labs</option>
        </select>
      </div>

      {loading ? (
        <p className="muted">Loading…</p>
      ) : orgs.length === 0 ? (
        <div className="empty-state card"><h3>No organizations</h3></div>
      ) : (
        <div className="card" style={{ padding: 0 }}>
          <table>
            <thead>
              <tr><th>Name</th><th>Type</th><th>City</th><th>Rating</th><th>Verified</th><th></th></tr>
            </thead>
            <tbody>
              {orgs.map((o) => (
                <tr key={o.id}>
                  <td>{o.name}<div className="mono small muted mt-8">org #{o.id}</div></td>
                  <td><span className="pill">{o.org_type}</span></td>
                  <td>{o.city || "—"}</td>
                  <td className="mono">
                    {o.avg_rating != null ? `${o.avg_rating.toFixed(1)}★ (${o.rating_count})` : <span className="muted">—</span>}
                  </td>
                  <td><span className={"pill" + (o.verified ? " done" : "")}>{o.verified ? "Verified" : "Unverified"}</span></td>
                  <td>
                    <button className="btn btn-sm" disabled={busyId === o.id} onClick={() => toggleVerify(o)}>
                      {o.verified ? "Unverify" : "Verify"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
