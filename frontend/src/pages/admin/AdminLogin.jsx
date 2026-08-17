import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../AuthContext";

export default function AdminLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const user = await login(email, password);
      if (!user.is_admin) {
        setError("This account does not have admin access.");
        return;
      }
      navigate("/admin");
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="auth-wrap">
      <div className="auth-hero">
        <div>
          <div className="brand">DIGI_CALX</div>
          <div className="eyebrow mt-8">Platform Administration</div>
        </div>
        <div>
          <div className="auth-hero-headline">Full oversight,<br />one console.</div>
          <p className="dim mt-16" style={{ maxWidth: 460 }}>
            Organizations, jobs, disputes, payments and platform commission —
            everything that happens on Digi_CalX, in one place.
          </p>
        </div>
        <div className="auth-hero-arch">
          ORGANIZATIONS <span>&rarr;</span> JOBS &amp; PAYMENTS <span>&rarr;</span>{" "}
          DISPUTES <span>&rarr;</span> COMMISSION SETTINGS
        </div>
      </div>

      <div className="auth-panel">
        <form className="auth-form" onSubmit={submit}>
          <div className="eyebrow mb-16">Admin sign in</div>
          {error && <div className="error-box">{error}</div>}
          <div className="field">
            <label>Email</label>
            <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div className="field">
            <label>Password</label>
            <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
          <button className="btn btn-primary" type="submit" disabled={busy} style={{ width: "100%" }}>
            {busy ? "Please wait…" : "Sign in"}
          </button>
          <p className="small muted mt-16">Admin accounts aren't self-registered. Contact the platform owner for access.</p>
        </form>
      </div>
    </div>
  );
}
