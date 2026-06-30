import axios from 'axios';

// 1. Create the unified instance
const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'https://she-backend-tjlg.onrender.com',
});

// 2. Attach JWT token to every outgoing request automatically
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// 3. Auto-logout on 401 (except on the login endpoint)
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401 && !err.config.url.includes('/auth/login')) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

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