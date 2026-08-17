import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { api } from "../api";

export default function NewRequest() {
  const [params] = useSearchParams();
  const preselect = params.get("asset");
  const [assets, setAssets] = useState([]);
  const [form, setForm] = useState({
    asset_id: preselect || "",
    service_mode: "in_lab",
    accredited_required: false,
    statement_of_conformity: false,
    urgency: "normal",
    adjustment_policy: "ask_first",
    tolerance_note: "",
    notes: "",
  });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();

  useEffect(() => { api.listAssets().then(setAssets); }, []);

  const update = (k) => (e) => {
    const v = e.target.type === "checkbox" ? e.target.checked : e.target.value;
    setForm({ ...form, [k]: v });
  };

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    if (!form.asset_id) { setError("Select an instrument first."); return; }
    setBusy(true);
    try {
      const req = await api.createRequest({ ...form, asset_id: parseInt(form.asset_id, 10) });
      navigate(`/requests/${req.id}`);
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
          <div className="eyebrow mb-8">Factory Calibration Request Wizard</div>
          <h1 className="page-title">New calibration request</h1>
          <p className="page-subtitle">Digi_CalX matches your request to technically eligible labs — no tolerance or requirement is ever invented on your behalf.</p>
        </div>
      </div>

      <form className="card" onSubmit={submit} style={{ maxWidth: 640 }}>
        {error && <div className="error-box">{error}</div>}

        <div className="field">
          <label>Instrument *</label>
          <select required value={form.asset_id} onChange={update("asset_id")}>
            <option value="">Select instrument…</option>
            {assets.map((a) => (
              <option key={a.id} value={a.id}>
                {a.make} {a.model} — {a.category} ({a.serial_no || "no serial"})
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-2">
          <div className="field">
            <label>Service mode</label>
            <select value={form.service_mode} onChange={update("service_mode")}>
              <option value="in_lab">In-lab</option>
              <option value="on_site">On-site</option>
              <option value="either">Either</option>
            </select>
          </div>
          <div className="field">
            <label>Urgency</label>
            <select value={form.urgency} onChange={update("urgency")}>
              <option value="normal">Normal</option>
              <option value="express">Express</option>
              <option value="critical">Critical</option>
            </select>
          </div>
        </div>

        <div className="checkbox-row field">
          <input type="checkbox" id="accred" checked={form.accredited_required} onChange={update("accredited_required")} />
          <label htmlFor="accred">Accredited calibration required</label>
        </div>
        <div className="checkbox-row field">
          <input type="checkbox" id="conf" checked={form.statement_of_conformity} onChange={update("statement_of_conformity")} />
          <label htmlFor="conf">Statement of conformity needed on certificate</label>
        </div>

        <div className="field">
          <label>Adjustment / repair policy</label>
          <select value={form.adjustment_policy} onChange={update("adjustment_policy")}>
            <option value="ask_first">Ask me before any adjustment (default)</option>
            <option value="no_adjustment">Calibration only — no adjustment</option>
            <option value="preauth">Pre-authorize adjustment up to agreed scope</option>
          </select>
        </div>

        <div className="field">
          <label>Specification / tolerance basis (optional)</label>
          <input type="text" value={form.tolerance_note} onChange={update("tolerance_note")} placeholder="e.g. ±1.5% of full scale, per manufacturer spec" />
          <p className="small muted mt-8">Leave blank if unknown — the lab will propose a basis in the quote, and you'll see it before accepting.</p>
        </div>

        <div className="field">
          <label>Notes for the lab</label>
          <textarea value={form.notes} onChange={update("notes")} placeholder="Failure symptoms, deadline context, SOP requirements…" />
        </div>

        <button className="btn btn-primary" type="submit" disabled={busy}>
          {busy ? "Submitting…" : "Submit request"}
        </button>
      </form>
    </div>
  );
}
