const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:8000";

function getToken() {
  return localStorage.getItem("digi_calx_token");
}

async function request(path, { method = "GET", body, form, auth = true } = {}) {
  const headers = {};
  if (auth) {
    const token = getToken();
    if (token) headers["Authorization"] = `Bearer ${token}`;
  }

  let fetchBody = undefined;
  if (form) {
    fetchBody = form; // FormData - browser sets content-type
  } else if (body !== undefined) {
    headers["Content-Type"] = "application/json";
    fetchBody = JSON.stringify(body);
  }

  const res = await fetch(`${API_BASE}${path}`, { method, headers, body: fetchBody });

  if (!res.ok) {
    let detail = `Request failed (${res.status})`;
    try {
      const data = await res.json();
      detail = data.detail || JSON.stringify(data);
    } catch (e) {
      /* noop */
    }
    throw new Error(typeof detail === "string" ? detail : JSON.stringify(detail));
  }
  if (res.status === 204) return null;
  return res.json();
}

export const api = {
  base: API_BASE,

  register: (payload) => request("/auth/register", { method: "POST", body: payload, auth: false }),
  login: (email, password) => request("/auth/login-json", { method: "POST", body: { email, password }, auth: false }),
  me: () => request("/auth/me"),

  listLabs: () => request("/labs"),
  labCapabilities: (labId) => request(`/labs/${labId}/capabilities`),

  listAssets: () => request("/assets"),
  createAsset: (payload) => request("/assets", { method: "POST", body: payload }),
  getAsset: (id) => request(`/assets/${id}`),

  listMyCapabilities: () => request("/capabilities"),
  createCapability: (payload) => request("/capabilities", { method: "POST", body: payload }),
  updateCapability: (id, payload) => request(`/capabilities/${id}`, { method: "PATCH", body: payload }),

  createRequest: (payload) => request("/requests", { method: "POST", body: payload }),
  listRequests: () => request("/requests"),
  getRequest: (id) => request(`/requests/${id}`),
  getMatches: (id) => request(`/requests/${id}/matches`),

  createQuote: (requestId, payload) => request(`/requests/${requestId}/quotes`, { method: "POST", body: payload }),
  listQuotesForRequest: (requestId) => request(`/requests/${requestId}/quotes`),
  listMyQuotes: () => request("/quotes/mine"),
  acceptQuote: (quoteId, transportMode) => request(`/quotes/${quoteId}/accept`, { method: "POST", body: { transport_mode: transportMode } }),

  listJobs: () => request("/jobs"),
  getJob: (id) => request(`/jobs/${id}`),
  getJobHistory: (id) => request(`/jobs/${id}/history`),
  transitionJob: (id, status, note) => request(`/jobs/${id}/transitions`, { method: "POST", body: { status, note } }),
  submitAsFound: (id, payload) => request(`/jobs/${id}/as-found`, { method: "POST", body: payload }),
  adjustmentDecision: (id, payload) => request(`/jobs/${id}/adjustment-decision`, { method: "POST", body: payload }),
  submitAsLeft: (id, payload) => request(`/jobs/${id}/as-left`, { method: "POST", body: payload }),

  payBooking: (id) => request(`/jobs/${id}/pay`, { method: "POST" }),
  payAdjustment: (id) => request(`/jobs/${id}/pay-adjustment`, { method: "POST" }),
  listJobPayments: (id) => request(`/jobs/${id}/payments`),

  getWallet: () => request("/wallet"),

  listCertificates: (jobId) => request(`/jobs/${jobId}/certificates`),
  issueCertificate: (jobId, certNumber, file) => {
    const form = new FormData();
    form.append("cert_number", certNumber);
    if (file) form.append("file", file);
    return request(`/jobs/${jobId}/certificates`, { method: "POST", form });
  },

  createRating: (jobId, payload) => request(`/jobs/${jobId}/ratings`, { method: "POST", body: payload }),
  listRatings: (jobId) => request(`/jobs/${jobId}/ratings`),

  openDispute: (jobId, payload) => request(`/jobs/${jobId}/disputes`, { method: "POST", body: payload }),
  listJobDisputes: (jobId) => request(`/jobs/${jobId}/disputes`),
  listMyDisputes: () => request("/disputes"),

  // ---- Admin ----
  adminStats: () => request("/admin/stats"),
  adminListOrganizations: (orgType) => request(`/admin/organizations${orgType ? `?org_type=${orgType}` : ""}`),
  adminVerifyOrg: (orgId, verified) => request(`/admin/organizations/${orgId}/verify?verified=${verified}`, { method: "POST" }),
  adminListJobs: (status) => request(`/admin/jobs${status ? `?status=${status}` : ""}`),
  adminGetJob: (id) => request(`/admin/jobs/${id}`),
  adminGetJobHistory: (id) => request(`/admin/jobs/${id}/history`),
  adminListDisputes: (status) => request(`/admin/disputes${status ? `?status=${status}` : ""}`),
  adminResolveDispute: (id, payload) => request(`/admin/disputes/${id}/resolve`, { method: "POST", body: payload }),
  adminListPayments: () => request("/admin/payments"),
  adminListWalletTx: () => request("/admin/wallet-transactions"),
  adminGetCommissionRate: () => request("/admin/commission-rate"),
  adminSetCommissionRate: (rate) => request("/admin/commission-rate", { method: "POST", body: { commission_rate: rate } }),
};

export function setToken(token) {
  if (token) localStorage.setItem("digi_calx_token", token);
  else localStorage.removeItem("digi_calx_token");
}

export function getStoredToken() {
  return getToken();
}
