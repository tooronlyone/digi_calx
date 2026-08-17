import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api";

const emptyAsset = {
  category: "", measurand: "", make: "", model: "", serial_no: "",
  range_min: "", range_max: "", unit: "", tolerance: "", criticality: "Medium", location: "",
};

export default function Assets() {
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyAsset);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();

  const load = () => api.listAssets().then(setAssets).finally(() => setLoading(false));
  useEffect(() => { load(); }, []);

  const update = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const payload = {
        ...form,
        range_min: form.range_min === "" ? null : parseFloat(form.range_min),
        range_max: form.range_max === "" ? null : parseFloat(form.range_max),
      };
      await api.createAsset(payload);
      setForm(emptyAsset);
      setShowForm(false);
      load();
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
          <div className="eyebrow mb-8">Factory Asset Registry</div>
          <h1 className="page-title">Instrument Assets</h1>
          <p className="page-subtitle">Every instrument here is a candidate for a calibration request. Range, tolerance and category drive eligible-lab matching.</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowForm((s) => !s)}>
          {showForm ? "Cancel" : "+ Add instrument"}
        </button>
      </div>

      {showForm && (
        <form className="card mb-24" onSubmit={submit}>
          {error && <div className="error-box">{error}</div>}
          <div className="grid grid-2">
            <div className="field">
              <label>Category *</label>
              <input type="text" required placeholder="pressure_gauge" value={form.category} onChange={update("category")} />
            </div>
            <div className="field">
              <label>Measurand *</label>
              <input type="text" required placeholder="pressure" value={form.measurand} onChange={update("measurand")} />
            </div>
            <div className="field">
              <label>Make</label>
              <input type="text" value={form.make} onChange={update("make")} placeholder="WIKA" />
            </div>
            <div className="field">
              <label>Model</label>
              <input type="text" value={form.model} onChange={update("model")} placeholder="233.50" />
            </div>
            <div className="field">
              <label>Serial number</label>
              <input type="text" value={form.serial_no} onChange={update("serial_no")} />
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
              <label>Process tolerance / MPE</label>
              <input type="text" value={form.tolerance} onChange={update("tolerance")} placeholder="±1.5% FS" />
            </div>
            <div className="field">
              <label>Criticality</label>
              <select value={form.criticality} onChange={update("criticality")}>
                <option>Low</option><option>Medium</option><option>High</option><option>Critical</option>
              </select>
            </div>
            <div className="field">
              <label>Installed location</label>
              <input type="text" value={form.location} onChange={update("location")} placeholder="Plant 2 / Boiler room" />
            </div>
          </div>
          <p className="small muted mb-16">
            If range or tolerance isn't known, leave it blank — Digi_CalX will not invent a value.
            The selected lab can clarify it in the quote.
          </p>
          <button className="btn btn-primary" type="submit" disabled={busy}>{busy ? "Saving…" : "Save instrument"}</button>
        </form>
      )}

      {loading ? (
        <p className="muted">Loading…</p>
      ) : assets.length === 0 ? (
        <div className="empty-state card">
          <h3>No instruments registered</h3>
          <p>Add your first instrument to start a calibration request.</p>
        </div>
      ) : (
        <div className="card" style={{ padding: 0 }}>
          <table>
            <thead>
              <tr>
                <th>Instrument</th><th>Category</th><th>Range</th><th>Tolerance</th><th>Criticality</th><th></th>
              </tr>
            </thead>
            <tbody>
              {assets.map((a) => (
                <tr key={a.id}>
                  <td>
                    <div>{a.make} {a.model}</div>
                    <div className="mono small muted">{a.serial_no || "no serial"}</div>
                  </td>
                  <td>{a.category}<div className="small muted">{a.measurand}</div></td>
                  <td>{a.range_min ?? "—"}&ndash;{a.range_max ?? "—"} {a.unit}</td>
                  <td>{a.tolerance || <span className="muted">not provided</span>}</td>
                  <td><span className="pill">{a.criticality}</span></td>
                  <td>
                    <button className="btn btn-sm" onClick={() => navigate(`/requests/new?asset=${a.id}`)}>
                      Request calibration
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
