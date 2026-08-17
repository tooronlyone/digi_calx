import { useEffect, useState } from "react";
import { api } from "../api";

export default function LabsDirectory() {
  const [labs, setLabs] = useState([]);
  const [caps, setCaps] = useState({});
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(null);

  useEffect(() => { api.listLabs().then(setLabs).finally(() => setLoading(false)); }, []);

  const expand = async (labId) => {
    if (expanded === labId) { setExpanded(null); return; }
    setExpanded(labId);
    if (!caps[labId]) {
      const c = await api.labCapabilities(labId);
      setCaps((prev) => ({ ...prev, [labId]: c }));
    }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="eyebrow mb-8">Network</div>
          <h1 className="page-title">Lab Directory</h1>
          <p className="page-subtitle">Browse published capabilities. Submitting a calibration request runs the actual eligibility match against your instrument's specification.</p>
        </div>
      </div>

      {loading ? (
        <p className="muted">Loading…</p>
      ) : labs.length === 0 ? (
        <div className="empty-state card"><h3>No labs registered yet</h3></div>
      ) : (
        labs.map((lab) => (
          <div key={lab.id} className="card">
            <div className="flex-between" style={{ cursor: "pointer" }} onClick={() => expand(lab.id)}>
              <div>
                <div className="flex-gap">
                  <strong>{lab.name}</strong>
                  {lab.verified && <span className="badge-accredited">Verified</span>}
                </div>
                <div className="small muted mt-8">
                  {lab.city}
                  {lab.avg_rating != null && <> &middot; {lab.avg_rating.toFixed(1)}★ ({lab.rating_count})</>}
                </div>
              </div>
              <span className="muted small">{expanded === lab.id ? "Hide" : "View"} capabilities</span>
            </div>
            {expanded === lab.id && (
              <div className="mt-16">
                {!caps[lab.id] ? (
                  <p className="small muted">Loading…</p>
                ) : caps[lab.id].length === 0 ? (
                  <p className="small muted">No published capabilities yet.</p>
                ) : (
                  <table>
                    <thead><tr><th>Service</th><th>Range</th><th>Mode</th><th>Turnaround</th></tr></thead>
                    <tbody>
                      {caps[lab.id].map((c) => (
                        <tr key={c.id}>
                          <td>{c.service_name} {c.accredited && <span className="badge-accredited" style={{ marginLeft: 6 }}>Accredited</span>}</td>
                          <td>{c.range_min ?? "—"}&ndash;{c.range_max ?? "—"} {c.unit}</td>
                          <td>{c.location_mode}</td>
                          <td>{c.turnaround_days}d</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}
          </div>
        ))
      )}
    </div>
  );
}
