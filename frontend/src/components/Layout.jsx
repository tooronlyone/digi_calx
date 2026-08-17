import { NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../AuthContext";

export default function Layout() {
  const { user, logout } = useAuth();
  const isFactory = user?.organization?.org_type === "factory";

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div>
          <div className="brand">DIGI_CALX</div>
          <div className="brand-sub">Calibration Trust Network</div>
        </div>

        <nav>
          <div className="nav-group">
            <div className="nav-label">Overview</div>
            <NavLink to="/" end className={({ isActive }) => "nav-link" + (isActive ? " active" : "")}>
              Dashboard
            </NavLink>
          </div>

          {isFactory ? (
            <div className="nav-group">
              <div className="nav-label">Factory</div>
              <NavLink to="/assets" className={({ isActive }) => "nav-link" + (isActive ? " active" : "")}>
                Instrument Assets
              </NavLink>
              <NavLink to="/requests" className={({ isActive }) => "nav-link" + (isActive ? " active" : "")}>
                Calibration Requests
              </NavLink>
              <NavLink to="/jobs" className={({ isActive }) => "nav-link" + (isActive ? " active" : "")}>
                Active Jobs
              </NavLink>
              <NavLink to="/labs" className={({ isActive }) => "nav-link" + (isActive ? " active" : "")}>
                Lab Directory
              </NavLink>
            </div>
          ) : (
            <div className="nav-group">
              <div className="nav-label">Laboratory</div>
              <NavLink to="/capabilities" className={({ isActive }) => "nav-link" + (isActive ? " active" : "")}>
                Capability Catalog
              </NavLink>
              <NavLink to="/inbox" className={({ isActive }) => "nav-link" + (isActive ? " active" : "")}>
                Request Inbox
              </NavLink>
              <NavLink to="/quotes" className={({ isActive }) => "nav-link" + (isActive ? " active" : "")}>
                My Quotes
              </NavLink>
              <NavLink to="/jobs" className={({ isActive }) => "nav-link" + (isActive ? " active" : "")}>
                Job Board
              </NavLink>
              <NavLink to="/wallet" className={({ isActive }) => "nav-link" + (isActive ? " active" : "")}>
                Wallet
              </NavLink>
            </div>
          )}

          <div className="nav-group">
            <div className="nav-label">Trust</div>
            <NavLink to="/disputes" className={({ isActive }) => "nav-link" + (isActive ? " active" : "")}>
              Disputes
            </NavLink>
          </div>
        </nav>

        <div className="sidebar-footer">
          <div className="org-chip">{user?.organization?.name}</div>
          <div className="org-type">{user?.organization?.org_type}</div>
          <button className="btn btn-ghost btn-sm mt-16" onClick={logout} style={{ width: "100%" }}>
            Sign out
          </button>
        </div>
      </aside>

      <div>
        <div className="top-strip">
          <span className="brand" style={{ fontSize: 15 }}>DIGI_CALX</span>
          <button className="btn btn-ghost btn-sm" onClick={logout}>Sign out</button>
        </div>
        <main className="main">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
