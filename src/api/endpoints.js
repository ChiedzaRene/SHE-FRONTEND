import api from "./axios";
import { saveBlobResponse } from "../utils/download";

export const authApi = {
  login: (email, password) => {
    const params = new URLSearchParams();
    params.append("username", email);
    params.append("password", password);
    return api.post("/auth/login", params, {
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
    });
  },
  register: (data) => api.post("/auth/register", data),
};

// Nearly every page loads the sites list. Share one in-flight/recent request between
// them instead of refetching on each navigation. Cleared on any site change and on logout.
const SITES_TTL_MS = 60 * 1000;
let sitesCache = null; // { at: number, promise: Promise }

export const clearSitesCache = () => {
  sitesCache = null;
};

const invalidateSites = (res) => {
  clearSitesCache();
  return res;
};

export const sitesApi = {
  getAll: () => {
    if (sitesCache && Date.now() - sitesCache.at < SITES_TTL_MS) {
      return sitesCache.promise;
    }
    const promise = api.get("/sites/").catch((err) => {
      clearSitesCache(); // never cache a failure
      throw err;
    });
    sitesCache = { at: Date.now(), promise };
    return promise;
  },
  getOne: (id) => api.get(`/sites/${id}`),
  create: (data) => api.post("/sites/", data).then(invalidateSites),
  update: (id, data) => api.put(`/sites/${id}`, data).then(invalidateSites),
  delete: (id) => api.delete(`/sites/${id}`).then(invalidateSites),
};

export const incidentsApi = {
  getAll: () => api.get("/incidents/"),
  // Totals for the dashboards: { total, open, by_type: [{ name, value }] }
  getSummary: () => api.get("/incidents/summary"),
  getBySite: (siteId) => api.get(`/incidents/site/${siteId}`),
  create: (data) => api.post("/incidents/", data),
  update: (id, data) => api.put(`/incidents/${id}`, data),
  // period: "12m" (rolling 12 months, default) or "ytd"
  getMetrics: (siteId, period = "12m") =>
    api.get(`/incidents/metrics/${siteId}`, { params: { period } }),
  getGlobalMetrics: (period = "12m") =>
    api.get("/incidents/metrics/global", { params: { period } }),
  getMetricsBySite: (period = "12m") =>
    api.get("/incidents/metrics/by-site", { params: { period } }),
};

export const actionsApi = {
  getAll: () => api.get("/corrective-actions/"),
  getOne: (id) => api.get(`/corrective-actions/${id}`),
  create: (data) => api.post("/corrective-actions/", data),
  update: (id, data) => api.put(`/corrective-actions/${id}`, data),
  delete: (id) => api.delete(`/corrective-actions/${id}`),
  resolve: (id, data) => api.post(`/corrective-actions/${id}/resolve`, data),
};

export const auditsApi = {
  getAll: () => api.get("/audits/"),
  getOne: (id) => api.get(`/audits/${id}`),
  create: (data) => api.post("/audits/", data),
  update: (id, data) => api.put(`/audits/${id}`, data),
};

export const legalApi = {
  getAll: () => api.get("/legal/"),
  getOne: (id) => api.get(`/legal/${id}`),
  create: (data) => api.post("/legal/", data),
  update: (id, data) => api.put(`/legal/${id}`, data),
};

export const trainingsApi = {
  getAll: () => api.get("/trainings/"),
  getOne: (id) => api.get(`/trainings/${id}`),
  create: (data) => api.post("/trainings/", data),
  update: (id, data) => api.put(`/trainings/${id}`, data),
};

export const usersApi = {
  // GET /users (List)
  getAll: () => api.get("/users"),

  // GET /users/{id} (Single)
  getOne: (id) => api.get(`/users/${id}`),

  // POST /users (Create) - REMOVED the trailing slash here
  create: (data) => api.post("/users", data),

  // PUT /users/{id} (Update)
  update: (id, data) => api.put(`/users/${id}`, data),

  // DELETE /users/{id} (Delete)
  delete: (id) => api.delete(`/users/${id}`),
};

// Add this to src/api/endpoints.js, alongside legalApi / sitesApi etc.

export const scorecardApi = {
  // Submit a new scorecard for a site (site_manager: own site only; admin/she_team: any site)
  submit: (payload) => api.post("/scorecard/", payload),

  // Latest scores across all sites - admin / she_team only. Supports filters.
  // params: { site_id, min_score, max_score, start_date, end_date }
  getAllLatest: (params = {}) => api.get("/scorecard/", { params }),

  // Latest submission for one site (site_manager: own site only)
  getSiteLatest: (siteId) => api.get(`/scorecard/site/${siteId}/latest`),

  // Full history for one site
  getSiteHistory: (siteId) => api.get(`/scorecard/site/${siteId}`),

  // Single submission by id
  getById: (id) => api.get(`/scorecard/${id}`),
};

// Monthly hours worked per site: the denominator for TRIR / LTIFR (entered by the SHE team)
export const siteHoursApi = {
  list: (params = {}) => api.get("/site-hours/", { params }),
  // data: { site_id, month: "YYYY-MM", hours_worked }
  save: (data) => api.put("/site-hours/", data),
};

// Reports: one structured document per kind, as JSON for the screen or a CSV/PDF download.
// kind: "performance" | "compliance" | "incidents" | "leaderboard"
export const reportsApi = {
  get: (kind, params = {}) => api.get(`/reports/${kind}`, { params }),

  // Fetches the file with the auth header and hands it to the browser as a download
  download: async (kind, params, format) => {
    const res = await api.get(`/reports/${kind}`, {
      params: { ...params, format },
      responseType: "blob",
    });
    saveBlobResponse(res, `she-${kind}.${format}`);
  },
};

// Settings: the signed-in user's own account, the TRIR/LTIFR limits, and the audit log
export const accountApi = {
  me: () => api.get("/users/me"),
  updateMe: (data) => api.patch("/users/me", data), // { full_name }
  changePassword: (data) => api.post("/auth/change-password", data), // { current_password, new_password }
};

export const settingsApi = {
  getTargets: () => api.get("/settings/safety-targets"),
  saveTargets: (data) => api.put("/settings/safety-targets", data), // { trir_limit, ltifr_limit }
};

export const auditApi = {
  // params: { email, action, resource, start, end, limit, offset }; total is in the X-Total-Count header
  list: (params = {}) => api.get("/audit-logs/", { params }),
  facets: () => api.get("/audit-logs/facets"),
  // One person's trail at a glance: totals, first/last activity, last sign-in, what they did
  person: (email) => api.get("/audit-logs/person", { params: { email } }),
};
