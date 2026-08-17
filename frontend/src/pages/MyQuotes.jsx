import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api";

export default function MyQuotes() {
  const [quotes, setQuotes] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { api.listMyQuotes().then(setQuotes).finally(() => setLoading(false)); }, []);

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="eyebrow mb-8">Commercial</div>
          <h1 className="page-title">My Quotes</h1>
          <p className="page-subtitle">Every quote you've submitted across the marketplace, and its acceptance state.</p>
        </div>
      </div>

      {loading ? (
        <p className="muted">Loading…</p>
      ) : quotes.length === 0 ? (
        <div className="empty-state card"><h3>No quotes submitted yet</h3></div>
      ) : (
        <div className="card" style={{ padding: 0 }}>
          <table>
            <thead><tr><th>Request</th><th>Price</th><th>Turnaround</th><th>Status</th><th></th></tr></thead>
            <tbody>
              {quotes.map((q) => (
                <tr key={q.id}>
                  <td className="mono">REQ-{String(q.request_id).padStart(4, "0")}</td>
                  <td className="mono">PKR {q.price.toLocaleString()}</td>
                  <td>{q.turnaround_days}d</td>
                  <td><span className={"pill" + (q.status === "accepted" ? " done" : "")}>{q.status}</span></td>
                  <td><Link to={`/requests/${q.request_id}`} className="small">View &rarr;</Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
