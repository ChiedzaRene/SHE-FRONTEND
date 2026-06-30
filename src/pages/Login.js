import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../api/axios'; // Adjust this path to match your actual folder structure

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Helper function to safely decode JWT payload data
  const decodeToken = (token) => {
    try {
      if (!token) return null;
      const base64Url = token.split('.')[1];
      if (!base64Url) return null;

      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(
        window
          .atob(base64)
          .split('')
          .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join('')
      );

      return JSON.parse(jsonPayload);
    } catch (err) {
      console.error("Failed to decode token:", err);
      return null;
    }
  };

  // Check for an existing session on app initialization
  useEffect(() => {
    const initializeAuth = () => {
      const token = localStorage.getItem('token');
      if (token) {
        const payload = decodeToken(token);
        // Optional: Check if token is expired here (payload.exp * 1000 < Date.now())
        if (payload) {
          setUser(payload);
        } else {
          localStorage.removeItem('token');
        }
      }
      setLoading(false);
    };

    initializeAuth();
  }, []);

  /**
   * Login helper formatted specifically for FastAPI's OAuth2PasswordRequestForm
   * @param {string} email 
   * @param {string} password 
   */
  const login = async (email, password) => {
    // 1. Format credentials into standard URL parameters instead of raw JSON
    const formData = new URLSearchParams();
    formData.append('username', email); // Mandatory fallback key name for FastAPI
    formData.append('password', password);

    // 2. Transmit request through global api wrapper configurations
    const response = await api.post('/auth/login', formData, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });

    const { access_token } = response.data;

    // 3. Persist credential details inside browser memory
    localStorage.setItem('token', access_token);

    // 4. Decode the profile roles and IDs out of the payload
    const payload = decodeToken(access_token);
    setUser(payload);

    // Return the payload back up to the Login.js component for conditional dashboard routing
    return payload;
  };

  /**
   * Log out helper to scrub credentials completely
   */
  const logout = () => {
    localStorage.removeItem('token');
    setUser(null);
    window.location.href = '/login';
  };

  const value = {
    user,
    loading,
    login,
    logout,
    isAuthenticated: !!user,
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}

// Custom hook to consume authentication contexts quickly inside child files
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be wrapped tightly inside an <AuthProvider /> block');
  }
  return context;
}

export { Login };          // Named export safeguard
export default Login;