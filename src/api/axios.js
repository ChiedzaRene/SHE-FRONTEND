import axios from 'axios';

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

// Attach JWT token to every request
api.interceptors.request.use((config) => {
  setPending(pending + 1);
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Auto-logout on 401
api.interceptors.response.use(
  (res) => {
    setPending(pending - 1);
    return res;
  },
  (err) => {
    setPending(pending - 1);
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
    }
    return Promise.reject(err);
  }
);

export default api;
