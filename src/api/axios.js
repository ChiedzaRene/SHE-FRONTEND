import axios from 'axios';

<<<<<<< HEAD
// 1. Create the unified instance
const api = axios.create({
  /*baseURL: process.env.REACT_APP_API_URL || 'https://she-backend-tjlg.onrender.com',*/
  baseURL: 'http://localhost:8000',
});

// 2. Attach JWT token to every outgoing request automatically
api.interceptors.request.use((config) => {
=======
const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:8000',
  // Without a limit a sleeping server (free hosting wakes slowly) leaves the page spinning forever
  timeout: 30000,
});

// Shown on the sign-in page after the app signs the user out
export const SESSION_NOTICE_KEY = 'session_notice';

// How many requests are in flight, for the loading bar (components/ActivityBar.js)
let pending = 0;
const listeners = new Set();
const setPending = (n) => {
  pending = Math.max(0, n);
  listeners.forEach((fn) => fn(pending));
};
export const subscribeToActivity = (fn) => {
  listeners.add(fn);
  fn(pending);
  return () => listeners.delete(fn);
};

// Reads that fail because the connection dropped (the server restarting after a deploy, or a sleeping free
// instance waking up) are tried again a few times before the page shows an error. Saves are never repeated
// automatically, so nothing is submitted twice.
const RETRY_DELAYS_MS = [1500, 3000, 6000];
const RETRY_STATUSES = [502, 503, 504];
const canRetry = (err) => {
  const config = err.config;
  if (!config || !['get', 'head'].includes((config.method || 'get').toLowerCase())) return false;
  if ((config.retryCount || 0) >= RETRY_DELAYS_MS.length) return false;
  if (err.code === 'ECONNABORTED' || axios.isCancel(err)) return false; // a 30 s timeout has already waited long enough
  return !err.response || RETRY_STATUSES.includes(err.response.status);
};
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Attach JWT token to every request
api.interceptors.request.use((config) => {
  setPending(pending + 1);
>>>>>>> 5efc5de2c5b042e318673e7ef2a45614b01d5ba9
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

<<<<<<< HEAD
// 3. Auto-logout on 401 (except on the login endpoint)
api.interceptors.response.use(
  (res) => res,
  (err) => {
    // Only wipe token and redirect if the 401 isn't coming from login
    if (err.response?.status === 401 && !err.config?.url?.includes('/auth/login')) {
      console.warn("Unauthorized request to:", err.config?.url);
      
      localStorage.removeItem('token');
      
      // Soft-redirect to login ONLY if we aren't already there
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
=======
// Auto-logout on 401
api.interceptors.response.use(
  (res) => {
    setPending(pending - 1);
    return res;
  },
  async (err) => {
    setPending(pending - 1);
    if (canRetry(err)) {
      const config = err.config;
      config.retryCount = (config.retryCount || 0) + 1;
      await wait(RETRY_DELAYS_MS[config.retryCount - 1]);
      return api.request(config);
    }
    if (err.response?.status === 401 && window.location.pathname !== '/login') {
      localStorage.removeItem('token');
      try { sessionStorage.setItem(SESSION_NOTICE_KEY, 'Your session has expired. Please sign in again.'); } catch (e) { /* storage blocked */ }
      window.location.href = '/login';
    }
    // An admin reset this account's password: the server refuses everything until it is changed
    if (
      err.response?.status === 403 &&
      err.response?.data?.detail?.code === 'password_change_required' &&
      window.location.pathname !== '/settings'
    ) {
      window.location.href = '/settings';
>>>>>>> 5efc5de2c5b042e318673e7ef2a45614b01d5ba9
    }
    return Promise.reject(err);
  }
);

<<<<<<< HEAD
// 4. Dedicated export for the login request that accepts credentials safely
export const loginUser = async (email, password) => {
  const formData = new URLSearchParams();
  formData.append('username', email); // Mandatory key name for FastAPI form_data
  formData.append('password', password);

  const response = await api.post('/auth/login', formData, {
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
  });
  return response.data;
};

export default api;

=======
export default api;
>>>>>>> 5efc5de2c5b042e318673e7ef2a45614b01d5ba9
