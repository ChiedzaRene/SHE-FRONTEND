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
      }
    }
    setLoading(false);
  }, []);

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
