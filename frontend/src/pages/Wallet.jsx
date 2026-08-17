import { useEffect, useState } from "react";
import { api } from "../api";

export default function Wallet() {
  const [wallet, setWallet] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { api.getWallet().then(setWallet).finally(() => setLoading(false)); }, []);

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="eyebrow mb-8">Settlement</div>
          <h1 className="page-title">Wallet</h1>
          <p className="page-subtitle">Each closed job settles automatically: total payments collected, minus Digi_CalX's platform commission, credited here.</p>
        </div>
      </div>

      {loading ? (
        <p className="muted">Loading…</p>
      ) : (
        <>
          <div className="stat-block mb-24" style={{ maxWidth: 300 }}>
            <div className="stat-value">PKR {wallet.balance.toLocaleString()}</div>
            <div className="stat-label">Available balance</div>
          </div>

          <div className="card">
            <h3 style={{ fontSize: 14 }} className="mb-16">Transaction history</h3>
            {wallet.transactions.length === 0 ? (
              <p className="small muted">No settlements yet. Balances update automatically when a job is closed.</p>
            ) : (
              <table>
                <thead><tr><th>Type</th><th>Job</th><th>Amount</th><th>Date</th></tr></thead>
                <tbody>
                  {wallet.transactions.map((t) => (
                    <tr key={t.id}>
                      <td>
                        <span className={"pill" + (t.tx_type === "payout" ? " done" : "")}>{t.tx_type}</span>
                        {t.description && <div className="small muted mt-8">{t.description}</div>}
                      </td>
                      <td className="mono">{t.job_id ? `JOB-${String(t.job_id).padStart(4, "0")}` : "—"}</td>
                      <td className="mono" style={{ color: t.amount < 0 ? "var(--fg-mute)" : "var(--fg)" }}>
                        {t.amount < 0 ? "-" : "+"}PKR {Math.abs(t.amount).toLocaleString()}
                      </td>
                      <td className="small muted">{new Date(t.created_at).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}
    </div>
  );
}
