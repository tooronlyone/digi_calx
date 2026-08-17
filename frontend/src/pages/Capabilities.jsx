import { useEffect, useState } from "react";
import { api } from "../api";

const empty = {
  service_name: "", measurand: "", category: "", range_min: "", range_max: "", unit: "",
  accredited: false, location_mode: "in_lab", turnaround_days: 5, price: "", cmc_uncertainty: "",
};

export default function Capabilities() {
  const [caps, setCaps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(empty);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const load = () => api.listMyCapabilities().then(setCaps).finally(() => setLoading(false));
  useEffect(() => { load(); }, []);

  const update = (k) => (e) => {
    const v = e.target.type === "checkbox" ? e.target.checked : e.target.value;
    setForm({ ...form, [k]: v });
  };

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      await api.createCapability({
        ...form,
        range_min: form.range_min === "" ? null : parseFloat(form.range_min),
        range_max: form.range_max === "" ? null : parseFloat(form.range_max),
        turnaround_days: parseInt(form.turnaround_days, 10) || 5,
        price: form.price === "" ? 0 : parseFloat(form.price),
      });
      setForm(empty);
      setShowForm(false);
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const toggleStatus = async (cap) => {
    const next = cap.status === "active" ? "paused" : "active";
    await api.updateCapability(cap.id, { ...cap, status: next });
    load();
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="eyebrow mb-8">Lab Capability Catalog</div>
          <h1 className="page-title">Published Capabilities</h1>
          <p className="page-subtitle">Each capability is a structured, hard-filterable record: measurand, category, range, accreditation and service mode drive matching &mdash; not marketing copy.</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowForm((s) => !s)}>
          {showForm ? "Cancel" : "+ Add capability"}
        </button>
      </div>

      {showForm && (
        <form className="card mb-24" onSubmit={submit}>
          {error && <div className="error-box">{error}</div>}
          <div className="grid grid-2">
            <div className="field">
              <label>Service name *</label>
              <input type="text" required value={form.service_name} onChange={update("service_name")} placeholder="Pressure Gauge Calibration" />
            </div>
            <div className="field">
              <label>Category *</label>
              <input type="text" required value={form.category} onChange={update("category")} placeholder="pressure_gauge" />
            </div>
            <div className="field">
              <label>Measurand *</label>
              <input type="text" required value={form.measurand} onChange={update("measurand")} placeholder="pressure" />
            </div>
            <div className="field">
              <label>Unit</label>
              <input type="text" value={form.unit} onChange={update("unit")} placeholder="bar" />
            </div>
            <div className="field">
              <label>Range min</label>
              <input type="number" step="any" value={form.range_min} onChange={update("range_min")} />
            </div>
            <div className="field">
              <label>Range max</label>
              <input type="number" step="any" value={form.range_max} onChange={update("range_max")} />
            </div>
            <div className="field">
              <label>Location mode</label>
              <select value={form.location_mode} onChange={update("location_mode")}>
                <option value="in_lab">In-lab</option>
                <option value="on_site">On-site</option>
                <option value="both">Both</option>
              </select>
            </div>
            <div className="field">
              <label>Standard turnaround (days)</label>
              <input type="number" min="1" value={form.turnaround_days} onChange={update("turnaround_days")} />
            </div>
            <div className="field">
              <label>Indicative price (PKR)</label>
              <input type="number" min="0" value={form.price} onChange={update("price")} />
            </div>
            <div className="field">
              <label>CMC / best uncertainty (optional)</label>
              <input type="text" value={form.cmc_uncertainty} onChange={update("cmc_uncertainty")} placeholder="0.02% of reading" />
            </div>
          </div>
          <div className="checkbox-row field">
            <input type="checkbox" id="capaccred" checked={form.accredited} onChange={update("accredited")} />
            <label htmlFor="capaccred">This exact service is within verified accredited scope</label>
          </div>
          <button className="btn btn-primary" type="submit" disabled={busy}>{busy ? "Saving…" : "Publish capability"}</button>
        </form>
      )}

      {loading ? (
        <p className="muted">Loading…</p>
      ) : caps.length === 0 ? (
        <div className="empty-state card">
          <h3>No capabilities published</h3>
          <p>Publish a capability so factory requests can match your lab.</p>
        </div>
      ) : (
        <div className="card" style={{ padding: 0 }}>
          <table>
            <thead>
              <tr><th>Service</th><th>Range</th><th>Mode</th><th>Turnaround</th><th>Price</th><th>Status</th><th></th></tr>
            </thead>
            <tbody>
              {caps.map((c) => (
                <tr key={c.id}>
                  <td>
                    {c.service_name}
                    {c.accredited && <span className="badge-accredited" style={{ marginLeft: 8 }}>Accredited</span>}
                    <div className="small muted mt-8">{c.category} &middot; {c.measurand}</div>
                  </td>
                  <td>{c.range_min ?? "—"}&ndash;{c.range_max ?? "—"} {c.unit}</td>
                  <td>{c.location_mode}</td>
                  <td>{c.turnaround_days}d</td>
                  <td className="mono">PKR {c.price?.toLocaleString()}</td>
                  <td><span className={"pill" + (c.status === "active" ? " on" : "")}>{c.status}</span></td>
                  <td><button className="btn btn-sm" onClick={() => toggleStatus(c)}>
                    {c.status === "active" ? "Pause" : "Activate"}
                  </button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
