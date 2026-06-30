import axios from 'axios';

// Create the configured Axios instance
const api = axios.create({
  // This automatically uses your Netlify environment variable, falling back to Render if missing
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:8000',
});

// Attach JWT token to every request automatically
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Auto-logout on 401 (except when on the login endpoint itself)
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

// Your clean component login submit handler
const handleLogin = async (e) => {
  e.preventDefault();

  const formData = new URLSearchParams();
  formData.append('username', email); 
  formData.append('password', password);

  try {
    // By using api.post instead of axios.post, it automatically prefixes 
    // your REACT_APP_API_URL straight to the front of '/auth/login'
    const response = await api.post('/auth/login', formData, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });
    
    const token = response.data.access_token;
    localStorage.setItem('token', token);
    
    window.location.href = '/'; 
    
  } catch (error) {
    console.error("Login failed:", error.response?.data?.detail || error.message);
  }
};

export { handleLogin };
export default api;