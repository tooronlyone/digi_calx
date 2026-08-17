import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../AuthContext";

export default function AuthPage() {
  const [mode, setMode] = useState("login"); // login | register
  const [orgType, setOrgType] = useState("factory");
  const [form, setForm] = useState({
    full_name: "", email: "", password: "", org_name: "", city: "",
  });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const { login, register } = useAuth();
  const navigate = useNavigate();

  const update = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      if (mode === "login") {
        await login(form.email, form.password);
      } else {
        await register({ ...form, org_type: orgType });
      }
      navigate("/");
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
          <div className="eyebrow mt-8">D-HAG // Digital Human Harmony AI Grid</div>
        </div>
        <div>
          <div className="auth-hero-headline">
            Calibration, matched<br />on verifiable trust.
          </div>
          <p className="dim mt-16" style={{ maxWidth: 460 }}>
            A Pakistan-first network connecting factories with technically eligible
            calibration laboratories &mdash; managed from request to certificate,
            with evidence, traceability and uncertainty preserved at every step.
          </p>
        </div>
        <div className="auth-hero-arch">
          FACTORY EXPERIENCE <span>&rarr;</span> MARKETPLACE &amp; TRUST <span>&rarr;</span>{" "}
          LAB OPERATING SYSTEM <span>&rarr;</span> METROLOGY TRUST LAYER
        </div>
      </div>

      <div className="auth-panel">
        <form className="auth-form" onSubmit={submit}>
          <div className="auth-toggle">
            <button type="button" className={mode === "login" ? "active" : ""} onClick={() => setMode("login")}>
              Sign in
            </button>
            <button type="button" className={mode === "register" ? "active" : ""} onClick={() => setMode("register")}>
              Create account
            </button>
          </div>

          {error && <div className="error-box">{error}</div>}

          {mode === "register" && (
            <>
              <div className="role-pick">
                <div className={"role-card" + (orgType === "factory" ? " active" : "")} onClick={() => setOrgType("factory")}>
                  <div className="role-card-title">Factory</div>
                  <div className="role-card-sub">Request &amp; track calibration</div>
                </div>
                <div className={"role-card" + (orgType === "lab" ? " active" : "")} onClick={() => setOrgType("lab")}>
                  <div className="role-card-title">Lab</div>
                  <div className="role-card-sub">Publish scope, execute jobs</div>
                </div>
              </div>

              <div className="field">
                <label>Full name</label>
                <input type="text" required value={form.full_name} onChange={update("full_name")} />
              </div>
              <div className="field">
                <label>{orgType === "factory" ? "Company name" : "Laboratory name"}</label>
                <input type="text" required value={form.org_name} onChange={update("org_name")} />
              </div>
              <div className="field">
                <label>City</label>
                <input type="text" value={form.city} onChange={update("city")} placeholder="Lahore" />
              </div>
            </>
          )}

          <div className="field">
            <label>Email</label>
            <input type="email" required value={form.email} onChange={update("email")} />
          </div>
          <div className="field">
            <label>Password</label>
            <input type="password" required minLength={6} value={form.password} onChange={update("password")} />
          </div>

          <button className="btn btn-primary" type="submit" disabled={busy} style={{ width: "100%" }}>
            {busy ? "Please wait…" : mode === "login" ? "Sign in" : "Create account"}
          </button>

          <p className="small muted mt-16" style={{ textAlign: "center" }}>
            Platform admin? <Link to="/admin/login">Sign in here</Link>
          </p>
        </form>
      </div>
    </div>
  );
}
