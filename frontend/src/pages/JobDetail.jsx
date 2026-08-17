import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { api } from "../api";
import { useAuth } from "../AuthContext";
import Stepper, { statusLabel } from "../components/Stepper";

const NEXT_SIMPLE = {
  BOOKING_CONFIRMED: { label: "Mark ready for handover", status: "AWAITING_HANDOVER" },
  AWAITING_HANDOVER: { label: "Mark received at lab", status: "RECEIVED" },
  RECEIVED: { label: "Start calibration", status: "CALIBRATION_IN_PROGRESS" },
  CERTIFICATE_ISSUED: { label: "Mark ready for return", status: "READY_FOR_RETURN" },
  READY_FOR_RETURN: { label: "Mark in transit to factory", status: "RETURN_IN_TRANSIT" },
  RETURN_IN_TRANSIT: { label: "Mark delivered", status: "DELIVERED" },
  DELIVERED: { label: "Close job", status: "CLOSED" },
};

export default function JobDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const [job, setJob] = useState(null);
  const [history, setHistory] = useState([]);
  const [certs, setCerts] = useState([]);
  const [ratings, setRatings] = useState([]);
  const [disputes, setDisputes] = useState([]);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const isLab = job && user?.organization_id === job.lab_org_id;
  const isFactory = job && user?.organization_id === job.factory_org_id;

  const load = async () => {
    const [j, h, c, r, d, p] = await Promise.all([
      api.getJob(id), api.getJobHistory(id), api.listCertificates(id),
      api.listRatings(id), api.listJobDisputes(id), api.listJobPayments(id),
    ]);
    setJob(j); setHistory(h); setCerts(c); setRatings(r); setDisputes(d); setPayments(p);
    setLoading(false);
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [id]);

  const run = async (fn) => {
    setError(""); setBusy(true);
    try { await fn(); await load(); }
    catch (err) { setError(err.message); }
    finally { setBusy(false); }
  };

  // ---- forms state ----
  const [asFound, setAsFound] = useState({ as_found_result: "", conformity: "pass" });
  const [asLeft, setAsLeft] = useState("");
  const [certForm, setCertForm] = useState({ cert_number: "", file: null });
  const [ratingForm, setRatingForm] = useState({ communication: 5, turnaround: 5, handling: 5, document_clarity: 5, overall: 5, comment: "" });
  const [disputeForm, setDisputeForm] = useState({ dispute_type: "quality", description: "" });
  const [showDisputeForm, setShowDisputeForm] = useState(false);

  if (loading) return <p className="muted">Loading…</p>;
  if (!job) return <p className="muted">Job not found.</p>;

  const nextSimple = NEXT_SIMPLE[job.status];
  const hasRated = ratings.length > 0;

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="eyebrow mb-8">JOB-{String(job.id).padStart(4, "0")}</div>
          <h1 className="page-title">{job.asset?.make} {job.asset?.model}</h1>
          <p className="page-subtitle">
            {isLab ? job.factory_org?.name : job.lab_org?.name} &middot; {job.asset?.category}
          </p>
        </div>
      </div>

      {error && <div className="error-box">{error}</div>}

      <div className="card mb-24">
        <Stepper status={job.status} />
      </div>

      {/* ---------- Booking payment (dummy gateway) ---------- */}
      {job.status === "AWAITING_PAYMENT" && (
        <div className="card mb-24">
          <h3 style={{ fontSize: 14 }} className="mb-16">Payment due to place order</h3>
          <table>
            <tbody>
              <tr><td className="muted">Calibration price</td><td className="mono">PKR {job.calibration_price.toLocaleString()}</td></tr>
              <tr>
                <td className="muted">Transport ({job.transport_mode === "calx" ? "Digi_CalX arranges" : "factory arranges"})</td>
                <td className="mono">{job.transport_mode === "calx" ? `PKR ${job.transport_cost.toLocaleString()}` : "—"}</td>
              </tr>
              <tr><td><strong>Total</strong></td><td className="mono"><strong>PKR {job.total_amount.toLocaleString()}</strong></td></tr>
            </tbody>
          </table>
          {isFactory ? (
            <button className="btn btn-primary mt-16" disabled={busy} onClick={() => run(() => api.payBooking(job.id))}>
              {busy ? "Processing…" : `Pay PKR ${job.total_amount.toLocaleString()} (dummy gateway)`}
            </button>
          ) : (
            <p className="small muted mt-16">Waiting for the factory to complete payment before this job proceeds.</p>
          )}
          <p className="small muted mt-16">This is a placeholder payment flow for testing — no real transaction is processed.</p>
        </div>
      )}

      {/* ---------- Adjustment/repair payment (dummy gateway) ---------- */}
      {job.status === "ADJUSTMENT_PAYMENT_DUE" && (
        <div className="card mb-24">
          <h3 style={{ fontSize: 14 }} className="mb-16">Adjustment charge due</h3>
          <p className="small muted mb-16">The instrument was out of tolerance and adjustment was authorized. The lab's quoted extra charge must be paid before recalibration proceeds.</p>
          <div className="mono mb-16" style={{ fontSize: 20 }}>PKR {(job.proposed_adjustment_cost || 0).toLocaleString()}</div>
          {isFactory ? (
            <button className="btn btn-primary" disabled={busy} onClick={() => run(() => api.payAdjustment(job.id))}>
              {busy ? "Processing…" : "Pay adjustment charge (dummy gateway)"}
            </button>
          ) : (
            <p className="small muted">Waiting for the factory to pay the adjustment charge before recalibration can proceed.</p>
          )}
        </div>
      )}

      <div className="grid grid-2">
        <div>
          {/* ---------- Simple transition ---------- */}
          {isLab && nextSimple && (
            <div className="card">
              <h3 style={{ fontSize: 14 }} className="mb-16">Next step</h3>
              <button className="btn btn-primary" disabled={busy}
                onClick={() => run(() => api.transitionJob(job.id, nextSimple.status))}>
                {nextSimple.label}
              </button>
            </div>
          )}

          {/* ---------- As-found result ---------- */}
          {isLab && job.status === "CALIBRATION_IN_PROGRESS" && (
            <div className="card">
              <h3 style={{ fontSize: 14 }} className="mb-16">Record as-found result</h3>
              <div className="field">
                <label>As-found measurement summary *</label>
                <textarea value={asFound.as_found_result}
                  onChange={(e) => setAsFound({ ...asFound, as_found_result: e.target.value })}
                  placeholder="e.g. Error +3.2% of full scale at 50 bar test point" />
              </div>
              <div className="field">
                <label>Conformity</label>
                <select value={asFound.conformity} onChange={(e) => setAsFound({ ...asFound, conformity: e.target.value })}>
                  <option value="pass">Pass — within tolerance</option>
                  <option value="fail">Fail — out of tolerance</option>
                  <option value="indeterminate">Indeterminate</option>
                  <option value="not_requested">Not requested</option>
                </select>
              </div>
              <button className="btn btn-primary" disabled={busy || !asFound.as_found_result}
                onClick={() => run(() => api.submitAsFound(job.id, asFound))}>
                Submit as-found result
              </button>
            </div>
          )}

          {/* ---------- Adjustment decision (factory) ---------- */}
          {isFactory && job.status === "CUSTOMER_DECISION_REQUIRED" && (
            <div className="card">
              <h3 style={{ fontSize: 14 }} className="mb-16">Instrument is out of tolerance</h3>
              <p className="small muted mb-16">As-found: {job.as_found_result}</p>
              <p className="small mb-16">Authorize the lab to adjust and recalibrate, or proceed with an as-found-only certificate.</p>
              <div className="flex-gap">
                <button className="btn btn-primary" disabled={busy}
                  onClick={() => run(() => api.adjustmentDecision(job.id, { authorized: true }))}>
                  Authorize adjustment
                </button>
                <button className="btn" disabled={busy}
                  onClick={() => run(() => api.adjustmentDecision(job.id, { authorized: false }))}>
                  Decline — report as-found only
                </button>
              </div>
            </div>
          )}

          {isLab && job.status === "CUSTOMER_DECISION_REQUIRED" && (
            <div className="card">
              <h3 style={{ fontSize: 14 }} className="mb-16">Awaiting factory decision</h3>
              <p className="small muted">The instrument was found out of tolerance. Waiting for the factory to authorize adjustment or accept the as-found result.</p>
            </div>
          )}

          {/* ---------- As-left (after adjustment authorized) ---------- */}
          {isLab && job.status === "ADJUSTMENT_AUTHORIZED" && (
            <div className="card">
              <h3 style={{ fontSize: 14 }} className="mb-16">Record as-left result</h3>
              <div className="field">
                <label>As-left measurement summary *</label>
                <textarea value={asLeft} onChange={(e) => setAsLeft(e.target.value)}
                  placeholder="e.g. Error +0.1% of full scale at 50 bar test point after adjustment" />
              </div>
              <button className="btn btn-primary" disabled={busy || !asLeft}
                onClick={() => run(() => api.submitAsLeft(job.id, { as_left_result: asLeft }))}>
                Submit as-left result
              </button>
            </div>
          )}

          {/* ---------- Issue certificate ---------- */}
          {isLab && job.status === "RESULT_REVIEW" && (
            <div className="card">
              <h3 style={{ fontSize: 14 }} className="mb-16">Issue certificate</h3>
              <div className="field">
                <label>Certificate number *</label>
                <input type="text" value={certForm.cert_number}
                  onChange={(e) => setCertForm({ ...certForm, cert_number: e.target.value })}
                  placeholder="DCX-2026-0001" />
              </div>
              <div className="field">
                <label>Certificate file (PDF, optional)</label>
                <input type="file" accept="application/pdf,image/*"
                  onChange={(e) => setCertForm({ ...certForm, file: e.target.files[0] })} />
              </div>
              <button className="btn btn-primary" disabled={busy || !certForm.cert_number}
                onClick={() => run(() => api.issueCertificate(job.id, certForm.cert_number, certForm.file))}>
                Issue certificate
              </button>
            </div>
          )}

          {/* ---------- Rating ---------- */}
          {isFactory && job.status === "CLOSED" && !hasRated && (
            <div className="card">
              <h3 style={{ fontSize: 14 }} className="mb-16">Rate this lab</h3>
              <div className="grid grid-2 mb-16">
                {["communication", "turnaround", "handling", "document_clarity", "overall"].map((k) => (
                  <div className="field" key={k}>
                    <label>{k.replaceAll("_", " ")}</label>
                    <select value={ratingForm[k]} onChange={(e) => setRatingForm({ ...ratingForm, [k]: parseInt(e.target.value, 10) })}>
                      {[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{n}</option>)}
                    </select>
                  </div>
                ))}
              </div>
              <div className="field">
                <label>Comment</label>
                <textarea value={ratingForm.comment} onChange={(e) => setRatingForm({ ...ratingForm, comment: e.target.value })} />
              </div>
              <button className="btn btn-primary" disabled={busy}
                onClick={() => run(() => api.createRating(job.id, ratingForm))}>
                Submit rating
              </button>
            </div>
          )}

          {/* ---------- Dispute ---------- */}
          {!["CLOSED", "CANCELLED"].includes(job.status) && (
            <div className="card">
              <div className="flex-between">
                <h3 style={{ fontSize: 14 }}>Dispute</h3>
                {!showDisputeForm && (
                  <button className="btn btn-sm btn-danger" onClick={() => setShowDisputeForm(true)}>Open dispute</button>
                )}
              </div>
              {showDisputeForm && (
                <div className="mt-16">
                  <div className="field">
                    <label>Type</label>
                    <select value={disputeForm.dispute_type} onChange={(e) => setDisputeForm({ ...disputeForm, dispute_type: e.target.value })}>
                      <option value="quality">Quality</option>
                      <option value="damage">Damage / handling</option>
                      <option value="delay">Delay</option>
                      <option value="billing">Billing</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                  <div className="field">
                    <label>Description *</label>
                    <textarea value={disputeForm.description} onChange={(e) => setDisputeForm({ ...disputeForm, description: e.target.value })} />
                  </div>
                  <button className="btn btn-danger" disabled={busy || !disputeForm.description}
                    onClick={() => run(async () => { await api.openDispute(job.id, disputeForm); setShowDisputeForm(false); })}>
                    Submit dispute
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        <div>
          {/* ---------- Specification ---------- */}
          <div className="card">
            <h3 style={{ fontSize: 14 }} className="mb-16">Job specification</h3>
            <table>
              <tbody>
                <tr><td className="muted">Instrument</td><td>{job.asset?.make} {job.asset?.model} ({job.asset?.serial_no || "no serial"})</td></tr>
                <tr><td className="muted">Category</td><td>{job.asset?.category}</td></tr>
                <tr><td className="muted">Conformity</td><td>{job.conformity ? job.conformity.replaceAll("_", " ") : "—"}</td></tr>
                <tr><td className="muted">Adjustment</td><td>{job.adjustment_requested ? (job.adjustment_authorized ? "Authorized" : "Declined") : "Not needed yet"}</td></tr>
                <tr><td className="muted">Transport</td><td>{job.transport_mode === "calx" ? "Digi_CalX arranges" : "Factory arranges"}</td></tr>
                <tr><td className="muted">Total paid to date</td><td className="mono">PKR {job.total_amount.toLocaleString()}</td></tr>
              </tbody>
            </table>
            {job.as_found_result && (
              <>
                <div className="hr" />
                <div className="muted small mb-8">As-found</div>
                <p className="small">{job.as_found_result}</p>
              </>
            )}
            {job.as_left_result && (
              <>
                <div className="muted small mb-8 mt-16">As-left</div>
                <p className="small">{job.as_left_result}</p>
              </>
            )}
          </div>

          {/* ---------- Payments ---------- */}
          {payments.length > 0 && (
            <div className="card">
              <h3 style={{ fontSize: 14 }} className="mb-16">Payments</h3>
              {payments.map((p) => (
                <div key={p.id} className="flex-between mb-8">
                  <div>
                    <div className="mono small">{p.kind === "booking" ? "Booking (calibration + transport)" : "Adjustment charge"}</div>
                  </div>
                  <div className="flex-gap">
                    <span className="mono small">PKR {p.amount.toLocaleString()}</span>
                    <span className={"pill" + (p.status === "paid" ? " done" : " warn")}>{p.status}</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ---------- Certificates ---------- */}
          <div className="card">
            <h3 style={{ fontSize: 14 }} className="mb-16">Certificates</h3>
            {certs.length === 0 ? (
              <p className="small muted">No certificate issued yet.</p>
            ) : (
              certs.map((c) => (
                <div key={c.id} className="flex-between mb-8">
                  <div>
                    <div className="mono small">{c.cert_number} <span className="muted">v{c.version}</span></div>
                    {c.superseded && <span className="pill">Superseded</span>}
                  </div>
                  {c.file_path && (
                    <a href={`${api.base}${c.file_path}`} target="_blank" rel="noreferrer" className="small">Download &rarr;</a>
                  )}
                </div>
              ))
            )}
          </div>

          {/* ---------- Ratings ---------- */}
          {ratings.length > 0 && (
            <div className="card">
              <h3 style={{ fontSize: 14 }} className="mb-16">Rating</h3>
              {ratings.map((r) => (
                <div key={r.id}>
                  <div className="mono">Overall: {r.overall}/5</div>
                  {r.comment && <p className="small muted mt-8">{r.comment}</p>}
                </div>
              ))}
            </div>
          )}

          {/* ---------- Disputes ---------- */}
          {disputes.length > 0 && (
            <div className="card">
              <h3 style={{ fontSize: 14 }} className="mb-16">Disputes</h3>
              {disputes.map((d) => (
                <div key={d.id} className="mb-16">
                  <div className="flex-between">
                    <span className="mono small">{d.dispute_type}</span>
                    <span className="pill">{d.status}</span>
                  </div>
                  <p className="small muted mt-8">{d.description}</p>
                </div>
              ))}
            </div>
          )}

          {/* ---------- Timeline ---------- */}
          <div className="card">
            <h3 style={{ fontSize: 14 }} className="mb-16">History</h3>
            <div className="timeline-log">
              {history.map((h) => (
                <div className="timeline-item" key={h.id}>
                  <div className="timeline-status">{statusLabel(h.status)}</div>
                  <div className="timeline-meta">
                    {h.actor && <>{h.actor} &middot; </>}
                    {new Date(h.created_at).toLocaleString()}
                    {h.note && <> &middot; {h.note}</>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
