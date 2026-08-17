import { NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../AuthContext";

export default function AdminLayout() {
  const { user, logout } = useAuth();

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div>
          <div className="brand">DIGI_CALX</div>
          <div className="brand-sub">Admin Console</div>
        </div>

        <nav>
          <div className="nav-group">
            <div className="nav-label">Platform</div>
            <NavLink to="/admin" end className={({ isActive }) => "nav-link" + (isActive ? " active" : "")}>
              Dashboard
            </NavLink>
            <NavLink to="/admin/organizations" className={({ isActive }) => "nav-link" + (isActive ? " active" : "")}>
              Organizations
            </NavLink>
            <NavLink to="/admin/jobs" className={({ isActive }) => "nav-link" + (isActive ? " active" : "")}>
              Jobs
            </NavLink>
            <NavLink to="/admin/disputes" className={({ isActive }) => "nav-link" + (isActive ? " active" : "")}>
              Disputes
            </NavLink>
            <NavLink to="/admin/finance" className={({ isActive }) => "nav-link" + (isActive ? " active" : "")}>
              Finance
            </NavLink>
            <NavLink to="/admin/settings" className={({ isActive }) => "nav-link" + (isActive ? " active" : "")}>
              Settings
            </NavLink>
          </div>
        </nav>

        <div className="sidebar-footer">
          <div className="org-chip">{user?.full_name}</div>
          <div className="org-type">Platform Admin</div>
          <button className="btn btn-ghost btn-sm mt-16" onClick={logout} style={{ width: "100%" }}>
            Sign out
          </button>
        </div>
      </aside>

      <div>
        <div className="top-strip">
          <span className="brand" style={{ fontSize: 15 }}>DIGI_CALX ADMIN</span>
          <button className="btn btn-ghost btn-sm" onClick={logout}>Sign out</button>
        </div>
        <main className="main">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
