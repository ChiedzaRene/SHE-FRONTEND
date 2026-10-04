import axios from 'axios';

const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:8000',
});

// Attach JWT token to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Auto-logout on 401
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('token');
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
