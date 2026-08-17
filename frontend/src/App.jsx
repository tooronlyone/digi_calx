import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./AuthContext";
import Layout from "./components/Layout";
import AdminLayout from "./components/AdminLayout";
import AuthPage from "./pages/AuthPage";
import AdminLogin from "./pages/admin/AdminLogin";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminOrganizations from "./pages/admin/AdminOrganizations";
import AdminJobs from "./pages/admin/AdminJobs";
import AdminJobDetail from "./pages/admin/AdminJobDetail";
import AdminDisputes from "./pages/admin/AdminDisputes";
import AdminFinance from "./pages/admin/AdminFinance";
import AdminSettings from "./pages/admin/AdminSettings";
import Dashboard from "./pages/Dashboard";
import Assets from "./pages/Assets";
import NewRequest from "./pages/NewRequest";
import Requests from "./pages/Requests";
import RequestDetail from "./pages/RequestDetail";
import Capabilities from "./pages/Capabilities";
import Inbox from "./pages/Inbox";
import MyQuotes from "./pages/MyQuotes";
import LabsDirectory from "./pages/LabsDirectory";
import Jobs from "./pages/Jobs";
import JobDetail from "./pages/JobDetail";
import Disputes from "./pages/Disputes";
import Wallet from "./pages/Wallet";

function Protected({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div style={{ padding: 40 }} className="muted">Loading…</div>;
  if (!user) return <Navigate to="/auth" replace />;
  if (user.is_admin) return <Navigate to="/admin" replace />;
  return children;
}

function PublicOnly({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div style={{ padding: 40 }} className="muted">Loading…</div>;
  if (user) return <Navigate to={user.is_admin ? "/admin" : "/"} replace />;
  return children;
}

function AdminProtected({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div style={{ padding: 40 }} className="muted">Loading…</div>;
  if (!user) return <Navigate to="/admin/login" replace />;
  if (!user.is_admin) return <Navigate to="/" replace />;
  return children;
}

function AdminPublicOnly({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div style={{ padding: 40 }} className="muted">Loading…</div>;
  if (user?.is_admin) return <Navigate to="/admin" replace />;
  return children;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/auth" element={<PublicOnly><AuthPage /></PublicOnly>} />
      <Route path="/admin/login" element={<AdminPublicOnly><AdminLogin /></AdminPublicOnly>} />
      <Route path="/admin" element={<AdminProtected><AdminLayout /></AdminProtected>}>
        <Route index element={<AdminDashboard />} />
        <Route path="organizations" element={<AdminOrganizations />} />
        <Route path="jobs" element={<AdminJobs />} />
        <Route path="jobs/:id" element={<AdminJobDetail />} />
        <Route path="disputes" element={<AdminDisputes />} />
        <Route path="finance" element={<AdminFinance />} />
        <Route path="settings" element={<AdminSettings />} />
      </Route>
      <Route path="/" element={<Protected><Layout /></Protected>}>
        <Route index element={<Dashboard />} />
        <Route path="assets" element={<Assets />} />
        <Route path="requests/new" element={<NewRequest />} />
        <Route path="requests" element={<Requests />} />
        <Route path="requests/:id" element={<RequestDetail />} />
        <Route path="capabilities" element={<Capabilities />} />
        <Route path="inbox" element={<Inbox />} />
        <Route path="quotes" element={<MyQuotes />} />
        <Route path="labs" element={<LabsDirectory />} />
        <Route path="jobs" element={<Jobs />} />
        <Route path="jobs/:id" element={<JobDetail />} />
        <Route path="disputes" element={<Disputes />} />
        <Route path="wallet" element={<Wallet />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}
