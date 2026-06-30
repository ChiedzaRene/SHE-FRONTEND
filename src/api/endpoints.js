import api from "./axios";

const requestWithFallback = async (method, paths, configOrData) => {
  let lastError;

  for (const path of paths) {
    try {
      if (method === "get") return await api.get(path, configOrData);
      if (method === "post") return await api.post(path, configOrData);
      if (method === "put") return await api.put(path, configOrData);
      if (method === "delete") return await api.delete(path, configOrData);
      throw new Error(`Unsupported request method: ${method}`);
    } catch (error) {
      lastError = error;
      if (error?.response?.status !== 404) throw error;
    }
  }

  throw lastError;
};

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

export const sitesApi = {
  getAll: () => api.get("/sites/"),
  getOne: (id) => api.get(`/sites/${id}`),
  create: (data) => api.post("/sites/", data),
  update: (id, data) => api.put(`/sites/${id}`, data),
};

export const incidentsApi = {
  getAll: () => api.get("/incidents/"),
  getBySite: (siteId) => api.get(`/incidents/site/${siteId}`),
  create: (data) => api.post("/incidents/", data),
  update: (id, data) => api.put(`/incidents/${id}`, data),
  getMetrics: (siteId) => api.get(`/incidents/metrics/${siteId}`),
  getGlobalMetrics: () => api.get("/incidents/metrics/global"),
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

export const scorecardApi = {
  // Submit a new scorecard for a site (site_manager: own site only; admin/she_team: any site)
  submit: (payload) =>
    requestWithFallback("post", ["/legal/scorecard/", "/legal-scorecard/", "/scorecard/"], payload),

  // Backward-compatible alias for older callers
  create: (payload) =>
    requestWithFallback("post", ["/legal/scorecard/", "/legal-scorecard/", "/scorecard/"], payload),

  // Latest scores across all sites - admin / she_team only. Supports filters.
  // params: { site_id, min_score, max_score, start_date, end_date }
  getAllLatest: (params = {}) =>
    requestWithFallback("get", ["/legal/scorecard/", "/legal-scorecard/", "/scorecard/"], {
      params,
    }),

  // Full submission history across all sites
  getAllSubmissions: (params = {}) =>
    requestWithFallback("get", ["/legal/scorecard/all", "/legal-scorecard/all", "/scorecard/all"], {
      params,
    }),

  // Latest submission for one site (site_manager: own site only)
  getSiteLatest: (siteId) =>
    requestWithFallback("get", [
      `/legal/scorecard/site/${siteId}/latest`,
      `/legal-scorecard/site/${siteId}/latest`,
      `/scorecard/site/${siteId}/latest`,
    ]),

  // Full history for one site
  getSiteHistory: (siteId) =>
    requestWithFallback("get", [
      `/legal/scorecard/site/${siteId}`,
      `/legal-scorecard/site/${siteId}`,
      `/scorecard/site/${siteId}`,
    ]),

  // Single submission by id
  getById: (id) =>
    requestWithFallback("get", [
      `/legal/scorecard/${id}`,
      `/legal-scorecard/${id}`,
      `/scorecard/${id}`,
    ]),
};
