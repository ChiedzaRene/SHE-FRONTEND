import React, { createContext, useContext, useState, useEffect } from 'react';
import { loginUser } from '../api/axios';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Helper to decode JWT payload safely
  const parseJwt = (token) => {
    try {
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(
        atob(base64)
          .split('')
          .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join('')
      );
      return JSON.parse(jsonPayload);
    } catch (e) {
      return null;
    }
  };

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      const payload = parseJwt(token);
      if (payload) {
        setUser({
          email: payload.sub || payload.email,
          sub: String(payload.sub || ''),
          role: payload.role || 'site_manager',
          site_id: payload.site_id || null,
        });
      } else {
        localStorage.removeItem('token');
      }
    }
    setLoading(false);
  }, []);

  const login = async (email, password) => {
    // 1. Call API
    const data = await loginUser(email, password);

    // 2. Validate token presence
    const token = data?.access_token || data?.token;
    if (!token) {
      throw new Error("No access token returned from server.");
    }

    // 3. Save token
    localStorage.setItem('token', token);

    // 4. Parse token payload
    const payload = parseJwt(token);
    if (!payload) {
      localStorage.removeItem('token');
      throw new Error("Invalid access token format.");
    }

    const userData = {
      email: payload.sub || payload.email || email,
      sub: String(payload.sub || ''),
      role: payload.role || data.role || 'site_manager',
      site_id: payload.site_id || data.site_id || null,
    };

    // 5. Set state
    setUser(userData);

    // 6. CRITICAL FIX: RETURN USER DATA TO LOGIN.JS
    return userData;
  };

  const logout = () => {
    localStorage.removeItem('token');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);