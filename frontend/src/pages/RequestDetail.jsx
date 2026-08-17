import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { api } from "../api";
import { useAuth } from "../AuthContext";
import { statusLabel } from "../components/Stepper";

export default function RequestDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const isFactory = user?.organization?.org_type === "factory";
  const navigate = useNavigate();

  const [request, setRequest] = useState(null);
  const [matches, setMatches] = useState([]);
  const [quotes, setQuotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [quoteForm, setQuoteForm] = useState({ price: "", transport_cost: "", turnaround_days: 5, accredited: false, notes: "" });
  const [showQuoteForm, setShowQuoteForm] = useState(false);
  const [transportChoice, setTransportChoice] = useState({});

  const load = async () => {
    const req = await api.getRequest(id);
    setRequest(req);
    const q = await api.listQuotesForRequest(id);
    setQuotes(q);
    if (isFactory) {
      const m = await api.getMatches(id);
      setMatches(m);
    }
    setLoading(false);
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [id]);

  const alreadyQuoted = quotes.some((q) => q.lab_org_id === user?.organization_id);

  const submitQuote = async (e) => {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      await api.createQuote(id, {
        ...quoteForm,
        price: parseFloat(quoteForm.price),
        transport_cost: quoteForm.transport_cost === "" ? 0 : parseFloat(quoteForm.transport_cost),
        turnaround_days: parseInt(quoteForm.turnaround_days, 10),
      });
      setShowQuoteForm(false);
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const acceptQuote = async (quoteId) => {
    setBusy(true);
    setError("");
    try {
      const mode = transportChoice[quoteId] || "self";
      const job = await api.acceptQuote(quoteId, mode);
      navigate(`/jobs/${job.id}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  if (loading) return <p className="muted">Loading…</p>;
  if (!request) return <p className="muted">Request not found.</p>;

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="eyebrow mb-8">REQ-{String(request.id).padStart(4, "0")}</div>
          <h1 className="page-title">{request.asset?.make} {request.asset?.model}</h1>
          <p className="page-subtitle">{request.asset?.category} &middot; {request.asset?.measurand}</p>
        </div>
        <span className="pill on">{statusLabel(request.status)}</span>
      </div>

      {error && <div className="error-box">{error}</div>}

      <div className="grid grid-2">
        <div className="card">
          <h3 style={{ fontSize: 14 }} className="mb-16">Request specification</h3>
          <table>
            <tbody>
              <tr><td className="muted">Service mode</td><td>{request.service_mode}</td></tr>
              <tr><td className="muted">Urgency</td><td>{request.urgency}</td></tr>
              <tr><td className="muted">Accredited required</td><td>{request.accredited_required ? "Yes" : "No"}</td></tr>
              <tr><td className="muted">Statement of conformity</td><td>{request.statement_of_conformity ? "Yes" : "No"}</td></tr>
              <tr><td className="muted">Adjustment policy</td><td>{request.adjustment_policy?.replaceAll("_", " ")}</td></tr>
              <tr><td className="muted">Tolerance / spec basis</td><td>{request.tolerance_note || <span className="muted">not provided</span>}</td></tr>
              <tr><td className="muted">Instrument range</td><td>{request.asset?.range_min ?? "—"}&ndash;{request.asset?.range_max ?? "—"} {request.asset?.unit}</td></tr>
            </tbody>
          </table>
          {request.notes && (
            <>
              <div className="hr" />
              <div className="muted small mb-8">Notes</div>
              <p className="small">{request.notes}</p>
            </>
          )}
        </div>

        {isFactory && (
          <div className="card">
            <h3 style={{ fontSize: 14 }} className="mb-16">Technically eligible labs ({matches.length})</h3>
            {matches.length === 0 ? (
              <p className="small muted">No lab currently publishes a matching capability. Eligibility is based on measurand, category, range, accreditation and service mode — nothing is invented.</p>
            ) : (
              matches.map((m) => (
                <div key={m.capability.id} className="card" style={{ background: "var(--bg-raised)" }}>
                  <div className="flex-between">
                    <div>
                      <div className="flex-gap">
                        <strong>{m.lab.name}</strong>
                        {m.capability.accredited && <span className="badge-accredited">Accredited</span>}
                      </div>
                      <div className="small muted mt-8">
                        {m.capability.service_name} &middot; {m.lab.city}
                        {m.lab.avg_rating != null && <> &middot; {m.lab.avg_rating.toFixed(1)}★ ({m.lab.rating_count})</>}
                      </div>
                    </div>
                    <div className="mono small">{m.capability.turnaround_days}d turnaround</div>
                  </div>
                  <ul className="match-explain">
                    {m.explanation.map((e, i) => <li key={i}>{e}</li>)}
                  </ul>
                </div>
              ))
            )}
          </div>
        )}

        {!isFactory && (
          <div className="card">
            <h3 style={{ fontSize: 14 }} className="mb-16">Submit a quote</h3>
            {alreadyQuoted ? (
              <p className="small muted">You've already submitted a quote for this request.</p>
            ) : !showQuoteForm ? (
              <button className="btn btn-primary" onClick={() => setShowQuoteForm(true)}>+ Create quote</button>
            ) : (
              <form onSubmit={submitQuote}>
                <div className="field">
                  <label>Calibration price (PKR) *</label>
                  <input type="number" required min="0" value={quoteForm.price}
                    onChange={(e) => setQuoteForm({ ...quoteForm, price: e.target.value })} />
                </div>
                <div className="field">
                  <label>Transport cost (PKR) — if Digi_CalX arranges pickup/delivery</label>
                  <input type="number" min="0" value={quoteForm.transport_cost}
                    onChange={(e) => setQuoteForm({ ...quoteForm, transport_cost: e.target.value })}
                    placeholder="0" />
                  <p className="small muted mt-8">Leave at 0 if the factory will arrange their own transport.</p>
                </div>
                <div className="field">
                  <label>Turnaround (days)</label>
                  <input type="number" min="1" value={quoteForm.turnaround_days}
                    onChange={(e) => setQuoteForm({ ...quoteForm, turnaround_days: e.target.value })} />
                </div>
                <div className="checkbox-row field">
                  <input type="checkbox" id="qacc" checked={quoteForm.accredited}
                    onChange={(e) => setQuoteForm({ ...quoteForm, accredited: e.target.checked })} />
                  <label htmlFor="qacc">This quote is for accredited calibration</label>
                </div>
                <div className="field">
                  <label>Notes</label>
                  <textarea value={quoteForm.notes} onChange={(e) => setQuoteForm({ ...quoteForm, notes: e.target.value })}
                    placeholder="Method basis, scope, exclusions…" />
                </div>
                <button className="btn btn-primary" type="submit" disabled={busy}>{busy ? "Submitting…" : "Submit quote"}</button>
              </form>
            )}
          </div>
        )}
      </div>

      <div className="card mt-24">
        <h3 style={{ fontSize: 14 }} className="mb-16">Quotes ({quotes.length})</h3>
        {quotes.length === 0 ? (
          <p className="small muted">No quotes submitted yet.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Lab</th><th>Rating</th><th>Calibration</th><th>Transport</th><th>Turnaround</th>
                <th>Status</th>{isFactory && <th>Transport by</th>}{isFactory && <th></th>}
              </tr>
            </thead>
            <tbody>
              {quotes.map((q) => {
                const mode = transportChoice[q.id] || "self";
                const total = mode === "calx" ? q.price + q.transport_cost : q.price;
                return (
                  <tr key={q.id}>
                    <td>
                      {q.lab_org?.name || `Lab #${q.lab_org_id}`}
                      {q.accredited && <span className="badge-accredited" style={{ marginLeft: 8 }}>Accredited</span>}
                      {q.notes && <div className="small muted mt-8">{q.notes}</div>}
                    </td>
                    <td className="mono">
                      {q.lab_org?.avg_rating != null
                        ? `${q.lab_org.avg_rating.toFixed(1)}★ (${q.lab_org.rating_count})`
                        : <span className="muted">No ratings yet</span>}
                    </td>
                    <td className="mono">PKR {q.price.toLocaleString()}</td>
                    <td className="mono">{q.transport_cost > 0 ? `PKR ${q.transport_cost.toLocaleString()}` : <span className="muted">n/a</span>}</td>
                    <td>{q.turnaround_days}d</td>
                    <td><span className={"pill" + (q.status === "accepted" ? " done" : "")}>{q.status}</span></td>
                    {isFactory && (
                      <td>
                        {q.status === "pending" && request.status !== "BOOKING_CONFIRMED" ? (
                          <select value={mode} onChange={(e) => setTransportChoice({ ...transportChoice, [q.id]: e.target.value })}>
                            <option value="self">Factory arranges</option>
                            {q.transport_cost > 0 && <option value="calx">Digi_CalX arranges (+PKR {q.transport_cost.toLocaleString()})</option>}
                          </select>
                        ) : "—"}
                      </td>
                    )}
                    {isFactory && (
                      <td>
                        {q.status === "pending" && request.status !== "BOOKING_CONFIRMED" && (
                          <div>
                            <div className="mono small muted mb-8">Total: PKR {total.toLocaleString()}</div>
                            <button className="btn btn-sm btn-primary" disabled={busy} onClick={() => acceptQuote(q.id)}>
                              Accept
                            </button>
                          </div>
                        )}
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
