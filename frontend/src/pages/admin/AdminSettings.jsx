import { useEffect, useState } from "react";
import { api } from "../../api";

export default function AdminSettings() {
  const [rate, setRate] = useState(null);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    api.adminGetCommissionRate().then((r) => {
      setRate(r.commission_rate);
      setInput((r.commission_rate * 100).toString());
    }).finally(() => setLoading(false));
  }, []);

  const save = async (e) => {
    e.preventDefault();
    setError("");
    setSaved(false);
    setBusy(true);
    try {
      const pct = parseFloat(input);
      const r = await api.adminSetCommissionRate(pct / 100);
      setRate(r.commission_rate);
      setSaved(true);
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
          <div className="eyebrow mb-8">Platform</div>
          <h1 className="page-title">Settings</h1>
          <p className="page-subtitle">Global platform configuration. Changing the commission rate affects new jobs going forward — existing job commissions stay as they were booked.</p>
        </div>
      </div>

      {loading ? (
        <p className="muted">Loading…</p>
      ) : (
        <form className="card" onSubmit={save} style={{ maxWidth: 420 }}>
          <h3 style={{ fontSize: 14 }} className="mb-16">Platform commission rate</h3>
          {error && <div className="error-box">{error}</div>}
          {saved && <div className="pill done mb-16">Saved</div>}
          <p className="small muted mb-16">Currently: <strong>{(rate * 100).toFixed(0)}%</strong> of every job's total payment is retained as platform commission when the job closes.</p>
          <div className="field">
            <label>New rate (%)</label>
            <input type="number" min="0" max="100" step="0.5" value={input} onChange={(e) => setInput(e.target.value)} />
          </div>
          <button className="btn btn-primary" type="submit" disabled={busy}>{busy ? "Saving…" : "Update rate"}</button>
        </form>
      )}
    </div>
  );
}
