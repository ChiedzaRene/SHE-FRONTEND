<<<<<<< HEAD
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
=======
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authApi, clearSitesCache } from '../api/endpoints';
import { SESSION_NOTICE_KEY } from '../api/axios';
import { IDLE_MS, clearActivity, idleNotice, lastActive, markActive } from '../utils/idle';

const leaveNotice = (text) => {
  try { sessionStorage.setItem(SESSION_NOTICE_KEY, text); } catch (e) { /* storage blocked */ }
};

const AuthContext = createContext(null);

export function decodeToken(token) {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const initUser = useCallback(() => {
    const token = localStorage.getItem('token');
    if (token) {
      const payload = decodeToken(token);
      const last = lastActive();
      if (!payload) {
        localStorage.removeItem('token');
      } else if (payload.exp && payload.exp * 1000 <= Date.now()) {
        // the sign-in itself has run out (8 hours by default)
        localStorage.removeItem('token');
        clearActivity();
        leaveNotice('Your session has expired. Please sign in again.');
      } else if (last && Date.now() - last >= IDLE_MS) {
        // the browser was closed or the computer slept for longer than the inactivity limit
        localStorage.removeItem('token');
        clearActivity();
        leaveNotice(idleNotice());
      } else {
        if (!last) markActive();
        setUser({ token, ...payload });
>>>>>>> 5efc5de2c5b042e318673e7ef2a45614b01d5ba9
      }
    }
    setLoading(false);
  }, []);

<<<<<<< HEAD
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
=======
  useEffect(() => { initUser(); }, [initUser]);

  const login = async (email, password) => {
    const res = await authApi.login(email, password);
    const { access_token } = res.data;
    clearSitesCache();
    localStorage.setItem('token', access_token);
    markActive();
    const payload = decodeToken(access_token);
    setUser({ token: access_token, ...payload });
    return payload;
  };

  // After the user changes their own password the server returns a fresh token (the old one,
  // like every other session, is signed out). Swap it in so this session carries on.
  const replaceToken = (token) => {
    localStorage.setItem('token', token);
    const payload = decodeToken(token);
    if (payload) setUser({ token, ...payload });
  };

  // `notice` is shown on the sign-in page (e.g. why the person was signed out)
  const logout = useCallback((notice) => {
    localStorage.removeItem('token');
    clearActivity();
    clearSitesCache(); // the next user may see a different set of sites
    if (typeof notice === 'string') leaveNotice(notice);
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, login, logout, replaceToken, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
>>>>>>> 5efc5de2c5b042e318673e7ef2a45614b01d5ba9
