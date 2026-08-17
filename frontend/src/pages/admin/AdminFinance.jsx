import { useEffect, useState } from "react";
import { api } from "../../api";

export default function AdminFinance() {
  const [payments, setPayments] = useState([]);
  const [txns, setTxns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("payments");

  useEffect(() => {
    Promise.all([api.adminListPayments(), api.adminListWalletTx()])
      .then(([p, t]) => { setPayments(p); setTxns(t); })
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="eyebrow mb-8">Finance</div>
          <h1 className="page-title">Payments &amp; Settlements</h1>
          <p className="page-subtitle">Every payment collected from factories, and every wallet ledger entry credited or deducted for labs.</p>
        </div>
      </div>

      <div className="auth-toggle mb-24" style={{ maxWidth: 340 }}>
        <button className={tab === "payments" ? "active" : ""} onClick={() => setTab("payments")}>Payments</button>
        <button className={tab === "wallet" ? "active" : ""} onClick={() => setTab("wallet")}>Wallet ledger</button>
      </div>

      {loading ? (
        <p className="muted">Loading…</p>
      ) : tab === "payments" ? (
        payments.length === 0 ? (
          <div className="empty-state card"><h3>No payments yet</h3></div>
        ) : (
          <div className="card" style={{ padding: 0 }}>
            <table>
              <thead><tr><th>Job</th><th>Kind</th><th>Amount</th><th>Status</th><th>Date</th></tr></thead>
              <tbody>
                {payments.map((p) => (
                  <tr key={p.id}>
                    <td className="mono">JOB-{String(p.job_id).padStart(4, "0")}</td>
                    <td>{p.kind}</td>
                    <td className="mono">PKR {p.amount.toLocaleString()}</td>
                    <td><span className={"pill" + (p.status === "paid" ? " done" : " warn")}>{p.status}</span></td>
                    <td className="small muted">{new Date(p.created_at).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      ) : txns.length === 0 ? (
        <div className="empty-state card"><h3>No wallet activity yet</h3></div>
      ) : (
        <div className="card" style={{ padding: 0 }}>
          <table>
            <thead><tr><th>Organization</th><th>Job</th><th>Type</th><th>Amount</th><th>Date</th></tr></thead>
            <tbody>
              {txns.map((t) => (
                <tr key={t.id}>
                  <td>{t.organization_name || `Org #${t.organization_id}`}</td>
                  <td className="mono">{t.job_id ? `JOB-${String(t.job_id).padStart(4, "0")}` : "—"}</td>
                  <td><span className={"pill" + (t.tx_type === "payout" ? " done" : "")}>{t.tx_type}</span></td>
                  <td className="mono">{t.amount < 0 ? "-" : "+"}PKR {Math.abs(t.amount).toLocaleString()}</td>
                  <td className="small muted">{new Date(t.created_at).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
